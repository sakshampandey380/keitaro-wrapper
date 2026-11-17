from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, ConfigDict, Field


class OfferOut(BaseModel):
    id: int
    name: str
    group: Optional[str] = None
    country: Optional[Union[List[str], str]] = None
    state: Optional[str] = "active"
    action_type: Optional[str] = None


class StreamOfferOut(BaseModel):
    id: int
    stream_id: int
    offer_id: int
    offer_name: str
    share: int
    is_pinned: bool
    status: str
    is_published: bool
    published_share: Optional[int] = None
    published_status: Optional[str] = None
    published_is_pinned: bool = False

    model_config = ConfigDict(from_attributes=True)


class StreamOut(BaseModel):
    id: int
    keitaro_id: int
    campaign_id: int
    name: str
    schema: Optional[str] = None
    type: Optional[str] = None
    has_offers: bool
    is_dirty: bool
    offers: List[StreamOfferOut] = []

    model_config = ConfigDict(from_attributes=True)


class CampaignOut(BaseModel):
    id: int
    keitaro_id: int
    name: str
    alias: Optional[str] = None
    geo: Optional[str] = None
    created_at: datetime
    streams: List[StreamOut] = []

    model_config = ConfigDict(from_attributes=True)


class CampaignListItem(BaseModel):
    id: Optional[int] = None
    keitaro_id: int
    name: str
    alias: Optional[str] = None
    geo: Optional[str] = None
    group: Optional[str] = None
    domain: Optional[str] = None
    state: Optional[str] = "active"
    is_local: bool = False
    dirty_streams_count: int = 0
    streams_count: int = 0
    created_at: Optional[Union[datetime, str]] = None


class CampaignCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Campaign name (auto-prefixed with test_pandey_)")
    geo: Union[str, List[str]] = Field(..., description="One or more ISO country codes, e.g. 'AU' or ['AU', 'MX']")
    offer_id: int = Field(..., gt=0, description="Keitaro Offer ID for Flow 2")
    offer_name: Optional[str] = None


class AddStreamOfferRequest(BaseModel):
    offer_id: int = Field(..., gt=0)
    offer_name: Optional[str] = None


class PinOfferRequest(BaseModel):
    is_pinned: bool
    share: Optional[int] = Field(None, ge=0, le=100)


class UpdateOfferShareRequest(BaseModel):
    share: int = Field(..., ge=0, le=100)
