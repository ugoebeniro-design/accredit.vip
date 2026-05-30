from app.models.user import User
from app.models.event import Event
from app.models.guest import Guest
from app.models.invite import InviteMessage, InviteBatch
from app.models.qr_code import QRCode
from app.models.checkin import CheckIn
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from app.models.event_settings import EventSetting
from app.models.support_ticket import SupportTicket
from app.models.attachment import Attachment
from app.models.flier import FlierAsset
from app.models.accreditation import AccreditationRequest
from app.models.staff import StaffAssignment
from app.models.ticket_purchase import TicketPurchase
from app.models.password_reset import PasswordResetToken
from app.models.trial_usage import TrialUsage
from app.models.subscription import Subscription
from app.models.community_post import CommunityPost

all_models = [
    User, Event, Guest, InviteMessage, InviteBatch, QRCode, CheckIn,
    Payment, AuditLog, EventSetting, SupportTicket, Attachment,
    FlierAsset, AccreditationRequest, StaffAssignment, TicketPurchase,
    PasswordResetToken, TrialUsage, Subscription, CommunityPost,
]
