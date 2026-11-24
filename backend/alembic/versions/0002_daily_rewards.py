"""Recompensas diárias; sorteios anteriores permanecem intactos em draw_requests.

Não há backfill: a elegibilidade consulta também sorteios legados bem-sucedidos
no intervalo UTC do dia local. Isso preserva múltiplos resgates antigos por dia.
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('daily_rewards',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('legend_id', sa.String(120), sa.ForeignKey('legends.id'), nullable=False),
        sa.Column('reward_date', sa.Date(), nullable=False),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('draw_request_id', sa.String(36), sa.ForeignKey('draw_requests.id'), nullable=False, unique=True),
        sa.Column('is_new', sa.Boolean(), nullable=False),
        sa.UniqueConstraint('user_id', 'reward_date', name='uq_daily_user_date'))
    op.create_index('ix_daily_rewards_user_claimed', 'daily_rewards', ['user_id', 'claimed_at'])


def downgrade():
    # Somente rollback deliberado de schema; nunca utilizado automaticamente.
    op.drop_index('ix_daily_rewards_user_claimed', table_name='daily_rewards')
    op.drop_table('daily_rewards')
