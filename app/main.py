import asyncio
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, Base, engine
import app.models  # noqa: F401
from app.models import Campaign
from app.schemas import (
    OfferOut,
    CampaignOut,
    CampaignListItem,
    CampaignCreateRequest,
    StreamOut,
    AddStreamOfferRequest,
    PinOfferRequest,
)
from app.keitaro_client import keitaro_client
from app.services import (
    create_campaign_with_flows,
    fetch_and_sync_campaign_streams,
    add_offer_to_stream,
    remove_offer_from_stream,
    restore_offer_in_stream,
    toggle_pin_or_update_share,
    push_stream_to_keitaro,
    cancel_stream_changes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (for both PostgreSQL and SQLite fallback)
    Base.metadata.create_all(bind=engine)
    # Pre-warm persistent httpx TLS connection pool and offers cache in background
    asyncio.create_task(keitaro_client.get_offers())
    yield
    await keitaro_client.close()


app = FastAPI(
    title="Keitaro Wrapper API",
    description="Executive Full-Stack Wrapper for Keitaro Admin API v1 with PostgreSQL State Sync",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "keitaro_api_url": settings.KEITARO_API_URL,
        "campaign_prefix": settings.CAMPAIGN_PREFIX,
    }


@app.get("/api/defaults")
async def get_keitaro_defaults():
    return await keitaro_client.resolve_defaults()


@app.get("/api/offers", response_model=List[OfferOut])
async def search_offers(
    search: str = Query("", description="Search by Offer ID or Offer Name"),
    limit: int = Query(40, ge=1, le=200),
    refresh: bool = Query(False, description="Force refresh offers cache from Keitaro"),
):
    raw_offers = await keitaro_client.get_offers(force_refresh=refresh)
    q = search.strip().lower()

    results: List[OfferOut] = []
    for o in raw_offers:
        if o.get("state") and str(o.get("state")).lower() != "active":
            continue
        oid_str = str(o.get("id", ""))
        oname = str(o.get("name", ""))
        ogroup = str(o.get("group") or "")
        if not q or q in oid_str.lower() or q in oname.lower() or q in ogroup.lower():
            results.append(
                OfferOut(
                    id=int(o["id"]),
                    name=oname,
                    group=o.get("group"),
                    country=o.get("country"),
                    state=o.get("state"),
                    action_type=o.get("action_type"),
                )
            )
            if len(results) >= limit:
                break
    return results


@app.get("/api/campaigns", response_model=List[CampaignListItem])
async def list_campaigns(
    search: str = Query("", description="Filter campaigns by name, alias, or Keitaro ID"),
    limit: int = Query(100, ge=1, le=300),
    db: Session = Depends(get_db),
):
    local_campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()

    try:
        keitaro_campaigns = await keitaro_client.get_campaigns()
    except Exception:
        keitaro_campaigns = []

    q = search.strip().lower()
    merged: List[CampaignListItem] = []
    seen_kids = set()

    k_by_id = {int(kc["id"]): kc for kc in keitaro_campaigns if "id" in kc}
    for lc in local_campaigns:
        kc = k_by_id.get(lc.keitaro_id, {})
        name_str = lc.name or str(kc.get("name") or "")
        alias_str = lc.alias or str(kc.get("alias") or "")
        kid_str = str(lc.keitaro_id)
        if q and (q not in name_str.lower() and q not in alias_str.lower() and q not in kid_str):
            continue
        dirty_count = sum(1 for s in lc.streams if s.is_dirty)
        merged.append(
            CampaignListItem(
                id=lc.id,
                keitaro_id=lc.keitaro_id,
                name=name_str,
                alias=alias_str,
                geo=lc.geo,
                group=kc.get("group") or settings.DEFAULT_GROUP_NAME,
                domain=kc.get("domain"),
                state=kc.get("state", "active"),
                is_local=True,
                dirty_streams_count=dirty_count,
                streams_count=len(lc.streams),
                created_at=lc.created_at,
            )
        )
        seen_kids.add(lc.keitaro_id)

    remote_sorted = sorted(
        keitaro_campaigns,
        key=lambda x: (
            0 if str(x.get("name", "")).lower().startswith("test_pandey_") else (
                1 if str(x.get("name", "")).lower().startswith("test_") else 2
            ),
            -int(x.get("id", 0)),
        ),
    )

    for kc in remote_sorted:
        kid = int(kc["id"])
        if kid in seen_kids:
            continue
        name_str = str(kc.get("name") or f"Campaign #{kid}")
        alias_str = str(kc.get("alias") or "")
        kid_str = str(kid)
        if q and (q not in name_str.lower() and q not in alias_str.lower() and q not in kid_str):
            continue

        merged.append(
            CampaignListItem(
                id=None,
                keitaro_id=kid,
                name=name_str,
                alias=alias_str,
                geo=None,
                group=kc.get("group"),
                domain=kc.get("domain"),
                state=kc.get("state", "active"),
                is_local=False,
                dirty_streams_count=0,
                streams_count=0,
                created_at=kc.get("created_at"),
            )
        )
        if len(merged) >= limit:
            break

    return merged[:limit]


@app.post("/api/campaigns", response_model=CampaignOut)
async def create_campaign(
    payload: CampaignCreateRequest,
    db: Session = Depends(get_db),
):
    return await create_campaign_with_flows(
        db=db,
        raw_name=payload.name,
        geo_input=payload.geo,
        offer_id=payload.offer_id,
        offer_name=payload.offer_name,
    )


@app.get("/api/campaigns/{keitaro_id}", response_model=CampaignOut)
async def get_campaign_details(
    keitaro_id: int,
    db: Session = Depends(get_db),
):
    db_campaign = db.query(Campaign).filter(Campaign.keitaro_id == keitaro_id).first()
    if db_campaign and db_campaign.streams:
        return db_campaign
    return await fetch_and_sync_campaign_streams(db=db, keitaro_campaign_id=keitaro_id)


@app.post("/api/campaigns/{keitaro_id}/fetch-streams", response_model=CampaignOut)
@app.get("/api/campaigns/{keitaro_id}/streams", response_model=CampaignOut)
async def fetch_campaign_streams(
    keitaro_id: int,
    db: Session = Depends(get_db),
):
    return await fetch_and_sync_campaign_streams(db=db, keitaro_campaign_id=keitaro_id)


@app.post("/api/streams/{stream_id}/offers", response_model=StreamOut)
async def api_add_offer_to_stream(
    stream_id: int,
    payload: AddStreamOfferRequest,
    db: Session = Depends(get_db),
):
    return await add_offer_to_stream(
        db=db,
        stream_id=stream_id,
        offer_id=payload.offer_id,
        offer_name=payload.offer_name,
    )


@app.post("/api/streams/{stream_id}/offers/{stream_offer_id}/remove", response_model=StreamOut)
@app.delete("/api/streams/{stream_id}/offers/{stream_offer_id}", response_model=StreamOut)
def api_remove_offer_from_stream(
    stream_id: int,
    stream_offer_id: int,
    db: Session = Depends(get_db),
):
    return remove_offer_from_stream(
        db=db,
        stream_id=stream_id,
        stream_offer_id=stream_offer_id,
    )


@app.post("/api/streams/{stream_id}/offers/{stream_offer_id}/restore", response_model=StreamOut)
def api_restore_offer_in_stream(
    stream_id: int,
    stream_offer_id: int,
    db: Session = Depends(get_db),
):
    return restore_offer_in_stream(
        db=db,
        stream_id=stream_id,
        stream_offer_id=stream_offer_id,
    )


@app.post("/api/streams/{stream_id}/offers/{stream_offer_id}/pin", response_model=StreamOut)
@app.patch("/api/streams/{stream_id}/offers/{stream_offer_id}", response_model=StreamOut)
def api_pin_or_update_offer(
    stream_id: int,
    stream_offer_id: int,
    payload: PinOfferRequest,
    db: Session = Depends(get_db),
):
    return toggle_pin_or_update_share(
        db=db,
        stream_id=stream_id,
        stream_offer_id=stream_offer_id,
        is_pinned=payload.is_pinned,
        new_share=payload.share,
    )


@app.post("/api/streams/{stream_id}/push", response_model=StreamOut)
async def api_push_stream(
    stream_id: int,
    db: Session = Depends(get_db),
):
    return await push_stream_to_keitaro(db=db, stream_id=stream_id)


@app.post("/api/streams/{stream_id}/cancel", response_model=StreamOut)
def api_cancel_stream(
    stream_id: int,
    db: Session = Depends(get_db),
):
    return cancel_stream_changes(db=db, stream_id=stream_id)
