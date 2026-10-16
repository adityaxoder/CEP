"""Initialize the EmotionIQ schema version history.

No application tables exist yet. This baseline revision lets every developer
create and advance a local schema consistently before user/history models are
introduced in later migrations.

Revision ID: 32fb52418b52
Revises: 
Create Date: 2026-10-16 21:47:08.615766

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '32fb52418b52'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Record the initial schema version."""
    pass


def downgrade() -> None:
    """Return to an unversioned schema."""
    pass
