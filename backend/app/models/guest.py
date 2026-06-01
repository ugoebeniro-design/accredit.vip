import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from app.core.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    rsvp_status = Column(String, default="pending")
    rsvp_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    rsvped_at = Column(DateTime(timezone=True), nullable=True)
    invite_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
