from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    keitaro_id = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    alias = Column(String(255), nullable=True)
    geo = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    streams = relationship(
        "Stream",
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="Stream.id",
    )


class Stream(Base):
    __tablename__ = "streams"

    id = Column(Integer, primary_key=True, index=True)
    keitaro_id = Column(Integer, unique=True, nullable=False, index=True)
    campaign_id = Column(
        Integer,
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    schema = Column(String(100), nullable=True)
    type = Column(String(100), nullable=True)
    has_offers = Column(Boolean, default=False, nullable=False)
    is_dirty = Column(Boolean, default=False, nullable=False)

    campaign = relationship("Campaign", back_populates="streams")
    offers = relationship(
        "StreamOffer",
        back_populates="stream",
        cascade="all, delete-orphan",
        order_by="StreamOffer.id",
    )


class StreamOffer(Base):
    __tablename__ = "stream_offers"

    id = Column(Integer, primary_key=True, index=True)
    stream_id = Column(
        Integer,
        ForeignKey("streams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    offer_id = Column(Integer, nullable=False, index=True)
    offer_name = Column(String(500), nullable=False)
    share = Column(Integer, default=0, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # 'active' | 'removed'
    is_published = Column(Boolean, default=False, nullable=False)
    published_share = Column(Integer, nullable=True)
    published_status = Column(String(50), nullable=True)
    published_is_pinned = Column(Boolean, default=False, nullable=False)

    stream = relationship("Stream", back_populates="offers")
