import time
import uuid
import logging
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException
from app.config import settings

logger = logging.getLogger(__name__)


class KeitaroClient:
    """
    High-performance async HTTP client wrapper for the live Keitaro Admin API v1.
    Uses a persistent httpx.AsyncClient connection pool (keep-alive) and in-memory
    caching for defaults (Domain, Group, Traffic Source) and Offers so campaign
    creation and stream updates complete in <1-2 seconds.
    """

    def __init__(self) -> None:
        self.base_url = settings.KEITARO_API_URL.rstrip("/")
        self.headers = {
            "Api-Key": settings.KEITARO_API_KEY,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KeitaroWrapper/2.0",
        }
        self._client: Optional[httpx.AsyncClient] = None
        self._offers_cache: List[Dict[str, Any]] = []
        self._offers_cache_ts: float = 0.0
        self._cache_ttl: float = 300.0  # 5 minutes TTL for offers metadata

        # Pre-seeded defaults from live Keitaro inspection (updated dynamically if needed)
        self._defaults_cache: Optional[Dict[str, Any]] = {
            "domain_id": 1813,
            "domain_name": "kylovoa.com",
            "group_id": 10332,
            "group_name": "FORTESTS",
            "traffic_source_id": 836,
            "traffic_source_name": "FORTESTS",
        }
        self._defaults_cache_ts: float = time.time()

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=httpx.Timeout(20.0, connect=5.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=40, keepalive_expiry=60.0),
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        clean_path = f"/{path.lstrip('/')}"
        client = self._get_client()
        try:
            response = await client.request(
                method=method,
                url=clean_path,
                json=json_data,
                params=params,
            )
        except httpx.RequestError as exc:
            logger.error("Keitaro network error on %s %s: %s", method, clean_path, exc)
            raise HTTPException(
                status_code=502,
                detail=f"Unable to reach Keitaro API ({clean_path}): {str(exc)}",
            )

        if response.status_code >= 400:
            body_text = response.text
            logger.error(
                "Keitaro API error %s on %s %s: %s",
                response.status_code,
                method,
                clean_path,
                body_text,
            )
            raise HTTPException(
                status_code=response.status_code if response.status_code < 500 else 502,
                detail=f"Keitaro API Error [{response.status_code}]: {body_text}",
            )

        if not response.content:
            return {}
        return response.json()

    async def get_domains(self) -> List[Dict[str, Any]]:
        data = await self._request("GET", "/domains")
        return data if isinstance(data, list) else []

    async def get_campaign_groups(self) -> List[Dict[str, Any]]:
        data = await self._request("GET", "/groups", params={"type": "campaigns"})
        return data if isinstance(data, list) else []

    async def get_traffic_sources(self) -> List[Dict[str, Any]]:
        try:
            data = await self._request("GET", "/traffic_sources")
            return data if isinstance(data, list) else []
        except HTTPException:
            data = await self._request("GET", "/sources")
            return data if isinstance(data, list) else []

    async def get_offers(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        now = time.time()
        if not force_refresh and self._offers_cache and (now - self._offers_cache_ts) < self._cache_ttl:
            return self._offers_cache
        data = await self._request("GET", "/offers")
        if isinstance(data, list):
            self._offers_cache = data
            self._offers_cache_ts = now
            return data
        return []

    async def get_offers_map(self, force_refresh: bool = False) -> Dict[int, str]:
        offers = await self.get_offers(force_refresh=force_refresh)
        return {int(o["id"]): str(o.get("name") or f"Offer #{o['id']}") for o in offers if "id" in o}

    def get_cached_offer_name(self, offer_id: int) -> Optional[str]:
        for o in self._offers_cache:
            if int(o.get("id", -1)) == int(offer_id):
                return str(o.get("name") or f"Offer #{offer_id}")
        return None

    async def get_campaigns(self) -> List[Dict[str, Any]]:
        data = await self._request("GET", "/campaigns")
        return data if isinstance(data, list) else []

    async def get_campaign(self, keitaro_campaign_id: int) -> Dict[str, Any]:
        return await self._request("GET", f"/campaigns/{keitaro_campaign_id}")

    async def get_campaign_streams(self, keitaro_campaign_id: int) -> List[Dict[str, Any]]:
        data = await self._request("GET", f"/campaigns/{keitaro_campaign_id}/streams")
        return data if isinstance(data, list) else []

    async def resolve_defaults(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Returns cached Domain, Group (FORTESTS), and Traffic Source (FORTESTS) IDs
        immediately (0ms) so campaign creation never blocks on 3 list requests.
        """
        if not force_refresh and self._defaults_cache is not None:
            return self._defaults_cache

        domains = await self.get_domains()
        groups = await self.get_campaign_groups()
        sources = await self.get_traffic_sources()

        target_domain_key = settings.DEFAULT_DOMAIN_NAME.lower().replace("https://", "").replace("http://", "").strip("/")
        domain_obj = None
        for d in domains:
            d_name = str(d.get("name", "")).lower().strip("/")
            if target_domain_key in d_name or d_name in target_domain_key:
                domain_obj = d
                break
        if not domain_obj and domains:
            active_domains = [d for d in domains if d.get("state") == "active"]
            domain_obj = active_domains[0] if active_domains else domains[0]

        target_group = settings.DEFAULT_GROUP_NAME.lower()
        group_obj = None
        for g in groups:
            if str(g.get("name", "")).strip().lower() == target_group:
                group_obj = g
                break
        if not group_obj and groups:
            group_obj = groups[0]

        target_source = settings.DEFAULT_SOURCE_NAME.lower()
        source_obj = None
        for s in sources:
            if str(s.get("name", "")).strip().lower() == target_source:
                source_obj = s
                break
        if not source_obj and sources:
            source_obj = sources[0]

        self._defaults_cache = {
            "domain_id": domain_obj["id"] if domain_obj else 1813,
            "domain_name": domain_obj.get("name") if domain_obj else settings.DEFAULT_DOMAIN_NAME,
            "group_id": group_obj["id"] if group_obj else 10332,
            "group_name": group_obj.get("name") if group_obj else settings.DEFAULT_GROUP_NAME,
            "traffic_source_id": source_obj["id"] if source_obj else 836,
            "traffic_source_name": source_obj.get("name") if source_obj else settings.DEFAULT_SOURCE_NAME,
        }
        self._defaults_cache_ts = time.time()
        return self._defaults_cache

    async def create_campaign(
        self,
        name: str,
        domain_id: Optional[int],
        group_id: Optional[int],
        traffic_source_id: Optional[int],
    ) -> Dict[str, Any]:
        alias = f"pandey-{uuid.uuid4().hex[:8]}"
        payload: Dict[str, Any] = {
            "name": name,
            "alias": alias,
            "type": "position",
            "state": "active",
            "cost_type": "CPC",
            "cost_value": 0,
            "cost_currency": "USD",
            "cost_auto": False,
        }
        if domain_id is not None:
            payload["domain_id"] = domain_id
        if group_id is not None:
            payload["group_id"] = group_id
        if traffic_source_id is not None:
            payload["traffic_source_id"] = traffic_source_id

        return await self._request("POST", "/campaigns", json_data=payload)

    async def create_geo_redirect_stream(
        self,
        keitaro_campaign_id: int,
        geo_codes: List[str],
    ) -> Dict[str, Any]:
        """
        Creates Flow 1 matching campaign #212745 stream #1314284 structure 100%.
        """
        geo_label = ",".join(geo_codes)
        payload: Dict[str, Any] = {
            "campaign_id": keitaro_campaign_id,
            "type": "regular",
            "name": f"{geo_label} -> Google",
            "position": 1,
            "state": "active",
            "action_type": "http",
            "action_payload": "https://google.com",
            "schema": "redirect",
            "collect_clicks": True,
            "filter_or": False,
            "weight": 0,
            "offer_selection": "before_click",
            "filters": [
                {
                    "name": "country",
                    "mode": "accept",
                    "payload": geo_codes,
                }
            ],
        }
        return await self._request("POST", "/streams", json_data=payload)

    async def create_offer_stream(
        self,
        keitaro_campaign_id: int,
        offer_id: int,
    ) -> Dict[str, Any]:
        """
        Creates Flow 2 matching campaign #212745 stream #1314285 structure 100%.
        Includes `"action_type": "http"` and `"action_payload": ""` alongside `"schema": "landings"`
        so Keitaro never returns 422 {"action_type": ["Action type is required"]}.
        """
        payload: Dict[str, Any] = {
            "campaign_id": keitaro_campaign_id,
            "type": "regular",
            "name": "Offers",
            "position": 2,
            "state": "active",
            "action_type": "http",
            "action_payload": "",
            "schema": "landings",
            "collect_clicks": True,
            "filter_or": False,
            "weight": 0,
            "offer_selection": "before_click",
            "comments": "",
            "offers": [
                {
                    "offer_id": int(offer_id),
                    "share": 100,
                    "state": "active",
                }
            ],
        }
        return await self._request("POST", "/streams", json_data=payload)

    async def update_stream_offers(
        self,
        keitaro_stream_id: int,
        active_offers: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Pushes ONLY active offers and their shares to Keitaro via PUT /streams/{id}.
        Includes action_type="http" and schema="landings" to match Keitaro stream validation.
        """
        payload: Dict[str, Any] = {
            "schema": "landings",
            "action_type": "http",
            "action_payload": "",
            "offers": [
                {
                    "offer_id": int(item["offer_id"]),
                    "share": int(item["share"]),
                    "state": "active",
                }
                for item in active_offers
            ],
        }
        return await self._request("PUT", f"/streams/{keitaro_stream_id}", json_data=payload)


keitaro_client = KeitaroClient()
