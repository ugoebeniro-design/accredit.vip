"""Add trial enforcement fields to users table

Revision ID: 003_add_trial_enforcement
Revises: 002_create_audit_log_table
Create Date: 2026-06-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_trial_enforcement'
down_revision = '002_create_audit_log_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add trial enforcement and fraud detection fields"""
    op.add_column('users', sa.Column('trial_invite_used', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('trial_event_used', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('trial_fingerprint_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('trial_used_at', sa.DateTime(timezone=True), nullable=True))

    # Create index on trial_fingerprint_hash for fraud detection
    op.create_index('ix_users_trial_fingerprint_hash', 'users', ['trial_fingerprint_hash'])


def downgrade() -> None:
    """Remove trial enforcement fields"""
    op.drop_index('ix_users_trial_fingerprint_hash', table_name='users')
    op.drop_column('users', 'trial_used_at')
    op.drop_column('users', 'trial_fingerprint_hash')
    op.drop_column('users', 'trial_event_used')
    op.drop_column('users', 'trial_invite_used')
