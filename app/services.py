import asyncio
import uuid
from typing import List, Optional, Union, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Campaign, Stream, StreamOffer
from app.keitaro_client import keitaro_client


def normalize_campaign_name(raw_name: str) -> str:
    clean = raw_name.strip()
    prefix = settings.CAMPAIGN_PREFIX
    if not clean.lower().startswith(prefix.lower()):
        return f"{prefix}{clean}"
    return f"{prefix}{clean[len(prefix):]}"


def parse_geo_codes(geo_input: Union[str, List[str]]) -> List[str]:
    if isinstance(geo_input, list):
        raw_items = geo_input
    else:
        raw_items = str(geo_input).replace(";", ",").replace(" ", ",").split(",")
    codes: List[str] = []
    for item in raw_items:
        code = item.strip().upper()
        if code and code not in codes:
            codes.append(code)
    if not codes:
        raise HTTPException(status_code=400, detail="At least one valid Geo country code (e.g. AU, US) is required.")
    return codes


def recalculate_stream_shares(
    offers: List[StreamOffer],
    locked_offer_id: Optional[int] = None,
) -> None:
    """
    Recalculates offer shares for a stream so that:
    1. All 'removed' offers have share=0 and is_pinned=False.
    2. All 'active' offers with is_pinned=True keep their locked percentage.
    3. All 'active' offers with is_pinned=False split (100 - sum_of_pinned)% evenly.
    4. Total active shares always sum to exactly 100% (when >=1 active offer exists).
    """
    for o in offers:
        if o.status != "active":
            o.share = 0
            o.is_pinned = False

    active_offers = [o for o in offers if o.status == "active"]
    if not active_offers:
        return

    if len(active_offers) == 1:
        active_offers[0].share = 100
        active_offers[0].is_pinned = False
        return

    pinned_offers = [o for o in active_offers if o.is_pinned]
    unpinned_offers = [o for o in active_offers if not o.is_pinned]

    for p in pinned_offers:
        p.share = max(0, min(100, int(p.share or 0)))

    sum_pinned = sum(p.share for p in pinned_offers)

    if sum_pinned > 100:
        if locked_offer_id is not None:
            target = next((p for p in pinned_offers if p.id == locked_offer_id or p.offer_id == locked_offer_id), None)
            others_sum = sum(p.share for p in pinned_offers if p is not target)
            if target is not None and others_sum <= 100:
                target.share = max(0, 100 - others_sum)
                sum_pinned = sum(p.share for p in pinned_offers)

        if sum_pinned > 100:
            scale = 100.0 / float(sum_pinned)
            running = 0
            for idx, p in enumerate(pinned_offers):
                if idx == len(pinned_offers) - 1:
                    p.share = max(0, 100 - running)
                else:
                    val = int(round(p.share * scale))
                    p.share = val
                    running += val
            sum_pinned = 100

    if unpinned_offers:
        remaining = max(0, 100 - sum_pinned)
        count = len(unpinned_offers)
        base_share = remaining // count
        remainder = remaining % count
        for idx, u in enumerate(unpinned_offers):
            u.share = base_share + (1 if idx < remainder else 0)
    else:
        if sum_pinned != 100 and pinned_offers:
            diff = 100 - sum_pinned
            adjustable = [
                p for p in pinned_offers
                if locked_offer_id is None or (p.id != locked_offer_id and p.offer_id != locked_offer_id)
            ]
            target_adj = adjustable[-1] if adjustable else pinned_offers[-1]
            target_adj.share = max(0, min(100, target_adj.share + diff))


async def create_campaign_with_flows(
    db: Session,
    raw_name: str,
    geo_input: Union[str, List[str]],
    offer_id: int,
    offer_name: Optional[str] = None,
) -> Campaign:
    final_name = normalize_campaign_name(raw_name)
    geo_codes = parse_geo_codes(geo_input)
    geo_str = ", ".join(geo_codes)

    # Resolve offer name from memory cache immediately (0ms network overhead)
    resolved_offer_name = (
        offer_name
        or keitaro_client.get_cached_offer_name(offer_id)
        or f"Offer #{offer_id}"
    )

    # 1. Resolve cached defaults (0ms)
    defaults = await keitaro_client.resolve_defaults()

    # 2. Create campaign in Keitaro (handling duplicate names from prior failed attempts cleanly)
    k_campaign = None
    k_stream_1 = None
    k_stream_2 = None

    try:
        k_campaign = await keitaro_client.create_campaign(
            name=final_name,
            domain_id=defaults["domain_id"],
            group_id=defaults["group_id"],
            traffic_source_id=defaults["traffic_source_id"],
        )
    except HTTPException as exc:
        if exc.status_code == 422:
            all_k_camps = await keitaro_client.get_campaigns()
            existing_k = next(
                (c for c in all_k_camps if str(c.get("name", "")).strip().lower() == final_name.lower()),
                None,
            )
            local_existing = (
                db.query(Campaign).filter(Campaign.keitaro_id == int(existing_k["id"])).first()
                if existing_k
                else None
            )
            if existing_k and not local_existing:
                k_campaign = existing_k
                existing_streams = await keitaro_client.get_campaign_streams(int(existing_k["id"]))
                for es in existing_streams:
                    if es.get("schema") == "redirect" and k_stream_1 is None:
                        k_stream_1 = es
                    elif (es.get("schema") == "landings" or es.get("offers")) and k_stream_2 is None:
                        k_stream_2 = es
            else:
                suffixed_name = f"{final_name}_{uuid.uuid4().hex[:4]}"
                k_campaign = await keitaro_client.create_campaign(
                    name=suffixed_name,
                    domain_id=defaults["domain_id"],
                    group_id=defaults["group_id"],
                    traffic_source_id=defaults["traffic_source_id"],
                )
                final_name = suffixed_name
        else:
            raise

    k_campaign_id = int(k_campaign["id"])

    # 3 & 4. Create Flow 1 (Geo Redirect -> Google) and Flow 2 (Offers 100%) concurrently
    tasks = []
    need_s1 = k_stream_1 is None
    need_s2 = k_stream_2 is None
    if need_s1:
        tasks.append(
            keitaro_client.create_geo_redirect_stream(
                keitaro_campaign_id=k_campaign_id,
                geo_codes=geo_codes,
            )
        )
    if need_s2:
        tasks.append(
            keitaro_client.create_offer_stream(
                keitaro_campaign_id=k_campaign_id,
                offer_id=offer_id,
            )
        )

    if tasks:
        results = await asyncio.gather(*tasks)
        idx = 0
        if need_s1:
            k_stream_1 = results[idx]
            idx += 1
        if need_s2:
            k_stream_2 = results[idx]

    # 5. Save or update Campaign, Streams, and StreamOffer in PostgreSQL
    db_campaign = db.query(Campaign).filter(Campaign.keitaro_id == k_campaign_id).first()
    if not db_campaign:
        db_campaign = Campaign(
            keitaro_id=k_campaign_id,
            name=str(k_campaign.get("name") or final_name),
            alias=str(k_campaign.get("alias") or ""),
            geo=geo_str,
        )
        db.add(db_campaign)
        db.flush()

    db_stream_1 = db.query(Stream).filter(Stream.keitaro_id == int(k_stream_1["id"])).first()
    if not db_stream_1:
        db_stream_1 = Stream(
            keitaro_id=int(k_stream_1["id"]),
            campaign_id=db_campaign.id,
            name=str(k_stream_1.get("name") or f"{','.join(geo_codes)} -> Google"),
            schema=str(k_stream_1.get("schema") or "redirect"),
            type=str(k_stream_1.get("type") or "regular"),
            has_offers=False,
            is_dirty=False,
        )
        db.add(db_stream_1)

    db_stream_2 = db.query(Stream).filter(Stream.keitaro_id == int(k_stream_2["id"])).first()
    if not db_stream_2:
        db_stream_2 = Stream(
            keitaro_id=int(k_stream_2["id"]),
            campaign_id=db_campaign.id,
            name=str(k_stream_2.get("name") or "Offers"),
            schema=str(k_stream_2.get("schema") or "landings"),
            type=str(k_stream_2.get("type") or "regular"),
            has_offers=True,
            is_dirty=False,
        )
        db.add(db_stream_2)
        db.flush()

    existing_so = (
        db.query(StreamOffer)
        .filter(StreamOffer.stream_id == db_stream_2.id, StreamOffer.offer_id == offer_id)
        .first()
    )
    if not existing_so:
        db_offer = StreamOffer(
            stream_id=db_stream_2.id,
            offer_id=offer_id,
            offer_name=resolved_offer_name,
            share=100,
            is_pinned=False,
            status="active",
            is_published=True,
            published_share=100,
            published_status="active",
            published_is_pinned=False,
        )
        db.add(db_offer)

    db.commit()
    db.refresh(db_campaign)
    return db_campaign


async def fetch_and_sync_campaign_streams(
    db: Session,
    keitaro_campaign_id: int,
) -> Campaign:
    db_campaign = db.query(Campaign).filter(Campaign.keitaro_id == keitaro_campaign_id).first()

    try:
        k_camp, k_streams = await asyncio.gather(
            keitaro_client.get_campaign(keitaro_campaign_id),
            keitaro_client.get_campaign_streams(keitaro_campaign_id),
        )
    except HTTPException:
        if not db_campaign:
            raise
        k_camp = {"id": db_campaign.keitaro_id, "name": db_campaign.name, "alias": db_campaign.alias}
        k_streams = await keitaro_client.get_campaign_streams(keitaro_campaign_id)

    offers_map = await keitaro_client.get_offers_map()

    inferred_geo = None
    for ks in k_streams:
        for flt in ks.get("filters") or []:
            if flt.get("name") == "country" and isinstance(flt.get("payload"), list) and flt["payload"]:
                inferred_geo = ", ".join(str(c) for c in flt["payload"])
                break
        if inferred_geo:
            break

    if not db_campaign:
        db_campaign = Campaign(
            keitaro_id=keitaro_campaign_id,
            name=str(k_camp.get("name") or f"Campaign #{keitaro_campaign_id}"),
            alias=str(k_camp.get("alias") or ""),
            geo=inferred_geo,
        )
        db.add(db_campaign)
        db.flush()
    else:
        if k_camp.get("name"):
            db_campaign.name = str(k_camp["name"])
        if k_camp.get("alias"):
            db_campaign.alias = str(k_camp["alias"])
        if not db_campaign.geo and inferred_geo:
            db_campaign.geo = inferred_geo

    existing_streams_by_kid: Dict[int, Stream] = {
        s.keitaro_id: s for s in db_campaign.streams
    }

    for ks in k_streams:
        k_stream_id = int(ks["id"])
        k_offers_list: List[Dict[str, Any]] = ks.get("offers") or []
        k_schema = str(ks.get("schema") or "")
        k_type = str(ks.get("type") or "regular")
        k_name = str(ks.get("name") or f"Stream #{k_stream_id}")

        db_stream = existing_streams_by_kid.get(k_stream_id)
        has_offers_flag = (
            len(k_offers_list) > 0
            or k_schema == "landings"
            or (db_stream is not None and (db_stream.has_offers or len(db_stream.offers) > 0))
        )

        if not db_stream:
            db_stream = Stream(
                keitaro_id=k_stream_id,
                campaign_id=db_campaign.id,
                name=k_name,
                schema=k_schema,
                type=k_type,
                has_offers=has_offers_flag,
                is_dirty=False,
            )
            db.add(db_stream)
            db.flush()
        else:
            db_stream.name = k_name
            db_stream.schema = k_schema
            db_stream.type = k_type
            db_stream.has_offers = has_offers_flag
            db_stream.is_dirty = False

        if has_offers_flag:
            k_offers_by_oid: Dict[int, Dict[str, Any]] = {
                int(ko["offer_id"]): ko for ko in k_offers_list if "offer_id" in ko
            }

            unknown_oids = [oid for oid in k_offers_by_oid if oid not in offers_map]
            if unknown_oids:
                offers_map = await keitaro_client.get_offers_map(force_refresh=True)

            for local_offer in list(db_stream.offers):
                if local_offer.offer_id in k_offers_by_oid:
                    ko = k_offers_by_oid.pop(local_offer.offer_id)
                    live_share = int(ko.get("share", 0))
                    local_offer.offer_name = offers_map.get(local_offer.offer_id, local_offer.offer_name)
                    local_offer.share = live_share
                    local_offer.status = "active"
                    local_offer.is_published = True
                    local_offer.published_share = live_share
                    local_offer.published_status = "active"
                    local_offer.published_is_pinned = local_offer.is_pinned
                else:
                    # Direct Keitaro Deletion Sync Rule:
                    local_offer.status = "removed"
                    local_offer.share = 0
                    local_offer.is_pinned = False
                    local_offer.is_published = True
                    local_offer.published_status = "removed"
                    local_offer.published_share = 0
                    local_offer.published_is_pinned = False

            for oid, ko in k_offers_by_oid.items():
                live_share = int(ko.get("share", 0))
                o_name = offers_map.get(oid, f"Offer #{oid}")
                new_so = StreamOffer(
                    stream_id=db_stream.id,
                    offer_id=oid,
                    offer_name=o_name,
                    share=live_share,
                    is_pinned=False,
                    status="active",
                    is_published=True,
                    published_share=live_share,
                    published_status="active",
                    published_is_pinned=False,
                )
                db.add(new_so)

    db.commit()
    db.refresh(db_campaign)
    return db_campaign


async def add_offer_to_stream(
    db: Session,
    stream_id: int,
    offer_id: int,
    offer_name: Optional[str] = None,
) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")
    if not stream.has_offers:
        raise HTTPException(status_code=400, detail="Cannot add offers to a redirect-only stream.")

    existing = (
        db.query(StreamOffer)
        .filter(StreamOffer.stream_id == stream.id, StreamOffer.offer_id == offer_id)
        .first()
    )
    if existing:
        if existing.status == "active":
            raise HTTPException(status_code=400, detail="This offer is already active in the stream.")
        existing.status = "active"
        existing.is_pinned = False
        recalculate_stream_shares(stream.offers)
        stream.is_dirty = True
        db.commit()
        db.refresh(stream)
        return stream

    resolved_name = (
        offer_name
        or keitaro_client.get_cached_offer_name(offer_id)
        or (await keitaro_client.get_offers_map()).get(offer_id, f"Offer #{offer_id}")
    )

    new_offer = StreamOffer(
        stream_id=stream.id,
        offer_id=offer_id,
        offer_name=resolved_name,
        share=0,
        is_pinned=False,
        status="active",
        is_published=False,
        published_share=None,
        published_status=None,
        published_is_pinned=False,
    )
    db.add(new_offer)
    db.flush()
    db.refresh(stream)

    recalculate_stream_shares(stream.offers)
    stream.is_dirty = True
    db.commit()
    db.refresh(stream)
    return stream


def remove_offer_from_stream(
    db: Session,
    stream_id: int,
    stream_offer_id: int,
) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    target = (
        db.query(StreamOffer)
        .filter(StreamOffer.id == stream_offer_id, StreamOffer.stream_id == stream.id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Offer not found in stream.")

    target.status = "removed"
    target.share = 0
    target.is_pinned = False

    recalculate_stream_shares(stream.offers)
    stream.is_dirty = True
    db.commit()
    db.refresh(stream)
    return stream


def restore_offer_in_stream(
    db: Session,
    stream_id: int,
    stream_offer_id: int,
) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    target = (
        db.query(StreamOffer)
        .filter(StreamOffer.id == stream_offer_id, StreamOffer.stream_id == stream.id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Offer not found in stream.")

    target.status = "active"
    target.is_pinned = False

    recalculate_stream_shares(stream.offers)
    stream.is_dirty = True
    db.commit()
    db.refresh(stream)
    return stream


def toggle_pin_or_update_share(
    db: Session,
    stream_id: int,
    stream_offer_id: int,
    is_pinned: bool,
    new_share: Optional[int] = None,
) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    target = (
        db.query(StreamOffer)
        .filter(StreamOffer.id == stream_offer_id, StreamOffer.stream_id == stream.id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Offer not found in stream.")
    if target.status != "active":
        raise HTTPException(status_code=400, detail="Only active offers can be pinned or have weights adjusted.")

    active_offers = [o for o in stream.offers if o.status == "active"]

    if new_share is not None:
        other_pinned_sum = sum(
            o.share for o in active_offers if o.id != target.id and o.is_pinned
        )
        max_allowed = max(0, 100 - other_pinned_sum)
        target.share = max(0, min(max_allowed, int(new_share)))

    target.is_pinned = is_pinned
    recalculate_stream_shares(stream.offers, locked_offer_id=target.id)
    stream.is_dirty = True
    db.commit()
    db.refresh(stream)
    return stream


async def push_stream_to_keitaro(
    db: Session,
    stream_id: int,
) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")
    if not stream.has_offers:
        raise HTTPException(status_code=400, detail="Redirect stream has no offers to push.")

    active_offers = [o for o in stream.offers if o.status == "active"]
    if not active_offers:
        raise HTTPException(
            status_code=400,
            detail="Cannot push a landing/offer stream with 0 active offers to Keitaro. Keep at least 1 active offer.",
        )

    recalculate_stream_shares(stream.offers)

    payload_offers = [
        {"offer_id": o.offer_id, "share": o.share}
        for o in stream.offers
        if o.status == "active"
    ]

    await keitaro_client.update_stream_offers(
        keitaro_stream_id=stream.keitaro_id,
        active_offers=payload_offers,
    )

    for o in stream.offers:
        o.is_published = True
        o.published_share = o.share
        o.published_status = o.status
        o.published_is_pinned = o.is_pinned

    stream.is_dirty = False
    db.commit()
    db.refresh(stream)
    return stream


def cancel_stream_changes(
    db: Session,
    stream_id: int,
) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    for o in list(stream.offers):
        if not o.is_published:
            db.delete(o)
        else:
            o.share = o.published_share if o.published_share is not None else 0
            o.status = o.published_status if o.published_status is not None else "active"
            o.is_pinned = bool(o.published_is_pinned)

    db.flush()
    db.refresh(stream)
    recalculate_stream_shares(stream.offers)
    stream.is_dirty = False
    db.commit()
    db.refresh(stream)
    return stream
