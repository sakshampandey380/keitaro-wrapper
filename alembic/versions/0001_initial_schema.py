"""Initial schema for Keitaro Wrapper

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-17 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("keitaro_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=True),
        sa.Column("geo", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keitaro_id"),
    )
    op.create_index(op.f("ix_campaigns_id"), "campaigns", ["id"], unique=False)
    op.create_index(op.f("ix_campaigns_keitaro_id"), "campaigns", ["keitaro_id"], unique=True)

    op.create_table(
        "streams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("keitaro_id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("schema", sa.String(length=100), nullable=True),
        sa.Column("type", sa.String(length=100), nullable=True),
        sa.Column("has_offers", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_dirty", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keitaro_id"),
    )
    op.create_index(op.f("ix_streams_id"), "streams", ["id"], unique=False)
    op.create_index(op.f("ix_streams_keitaro_id"), "streams", ["keitaro_id"], unique=True)
    op.create_index(op.f("ix_streams_campaign_id"), "streams", ["campaign_id"], unique=False)

    op.create_table(
        "stream_offers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stream_id", sa.Integer(), nullable=False),
        sa.Column("offer_id", sa.Integer(), nullable=False),
        sa.Column("offer_name", sa.String(length=500), nullable=False),
        sa.Column("share", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_pinned", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default=sa.text("'active'"), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("published_share", sa.Integer(), nullable=True),
        sa.Column("published_status", sa.String(length=50), nullable=True),
        sa.Column(
            "published_is_pinned",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["stream_id"], ["streams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stream_offers_id"), "stream_offers", ["id"], unique=False)
    op.create_index(op.f("ix_stream_offers_stream_id"), "stream_offers", ["stream_id"], unique=False)
    op.create_index(op.f("ix_stream_offers_offer_id"), "stream_offers", ["offer_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stream_offers_offer_id"), table_name="stream_offers")
    op.drop_index(op.f("ix_stream_offers_stream_id"), table_name="stream_offers")
    op.drop_index(op.f("ix_stream_offers_id"), table_name="stream_offers")
    op.drop_table("stream_offers")

    op.drop_index(op.f("ix_streams_campaign_id"), table_name="streams")
    op.drop_index(op.f("ix_streams_keitaro_id"), table_name="streams")
    op.drop_index(op.f("ix_streams_id"), table_name="streams")
    op.drop_table("streams")

    op.drop_index(op.f("ix_campaigns_keitaro_id"), table_name="campaigns")
    op.drop_index(op.f("ix_campaigns_id"), table_name="campaigns")
    op.drop_table("campaigns")
