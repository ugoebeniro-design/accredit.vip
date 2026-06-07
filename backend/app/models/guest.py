import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from app.core.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    phone_normalized = Column(String, nullable=True)
    phone_country_code = Column(String, nullable=True)
    phone_valid = Column(Boolean, default=False)
    email = Column(String, nullable=True)
    email_valid = Column(Boolean, default=False)
    rsvp_status = Column(String, default="pending")
    rsvp_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    rsvped_at = Column(DateTime(timezone=True), nullable=True)
    invite_sent = Column(Boolean, default=False)
    invite_attempts = Column(Integer, default=0)
    invite_viewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "rsvp_status": self.rsvp_status,
            "rsvp_token": self.rsvp_token,
            "invite_sent": self.invite_sent,
            "invite_attempts": self.invite_attempts,
            "invite_viewed_at": self.invite_viewed_at.isoformat() if self.invite_viewed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
