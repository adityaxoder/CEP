"""Declarative base shared by all SQLAlchemy persistence models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for database models and Alembic metadata discovery."""

