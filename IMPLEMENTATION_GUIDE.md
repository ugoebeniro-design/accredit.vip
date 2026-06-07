# AccreditVIP - Complete Invite System Implementation Guide

## System Architecture

### 1. Payment Flow (CREATE INVITE)
```
User fills form → Selects channels & guest count → Sees live preview with pricing
    ↓
"Proceed to Payment" button
    ↓
Paystack payment gateway
    ↓
Payment verification page
    ↓
Redirect to Guest Management Dashboard
```

### 2. Guest Management System
After successful payment, users access:
- Guest list management (manual entry + CSV import)
- Guest status tracking (delivered, opened, RSVP'd, failed, invalid)
- Delivery analytics per channel
- Send history with 3-send limit

### 3. Delivery Channels
Users must select at least one:
- **Email**: ₦100,000 - ₦500,000 (based on guest range)
- **WhatsApp**: ₦200,000 - ₦750,000
- **SMS**: ₦300,000 - ₦1,000,000

Only selected channels are available for sending invites.

## Implementation Completed

### Frontend
✅ **Dashboard Create Page** (`/dashboard/create`)
- Form with all required fields
- Live visual preview showing flyer/invitation
- Pricing breakdown based on selected channels and guest count
- Payment initiation for CREATE INVITE
- Direct event creation for POST EVENT

✅ **Payment Callback** (`/dashboard/payment-callback`)
- Payment verification
- Success/failure handling
- Redirect to guest management on success

✅ **Guest Management Interface** (`/dashboard/invites/[eventId]/manage`)
- Overview tab: Stats and event details
- Guests tab: Guest list with status tracking
- Analytics tab: Channel performance and send history

✅ **UI Features**
- Logo fix (logo-dark-trim.png)
- Button animations (dance animation)
- Selected state styling
- Comprehensive live preview
- Page refresh state restoration

### Backend (Already Implemented)
✅ Payment API (`/payments/initiate`)
✅ Payment verification
✅ Paystack integration
✅ Price calculation
✅ Guest management models
✅ Event creation API
✅ Delivery tracking models

## Implementation TODO

### Phase 2: Guest Management API
- [ ] Create endpoint: `POST /guests/upload` - CSV import
- [ ] Create endpoint: `POST /guests/add` - Manual entry
- [ ] Create endpoint: `GET /guests/{event_id}` - List guests with status
- [ ] Create endpoint: `PUT /guests/{guest_id}` - Edit guest info
- [ ] Create endpoint: `DELETE /guests/{guest_id}` - Delete guest

### Phase 3: Invite Sending
- [ ] Create endpoint: `POST /invites/send` - Send invites to guests
- [ ] Enforce send limit (max 3 sends per event)
- [ ] Implement channel-specific sending:
  - Email sending
  - WhatsApp sending (using WhatsApp Business API)
  - SMS sending (using SMS provider)
- [ ] Track delivery status per guest per channel

### Phase 4: Analytics & Tracking
- [ ] Create endpoint: `GET /analytics/{event_id}` - Delivery metrics
- [ ] Webhook handling for:
  - Email open tracking
  - WhatsApp delivery status
  - SMS delivery status
  - RSVP links
- [ ] Guest status update endpoints

### Phase 5: RSVP Tracking
- [ ] Generate unique RSVP tokens per guest
- [ ] RSVP page: `/rsvp/[token]`
- [ ] Track RSVP responses (yes/no)
- [ ] Update guest status in database

## Database Models Required

```sql
-- Already exists:
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER,
  title VARCHAR,
  guest_count INTEGER,
  delivery_channels VARCHAR[],
  ...
);

CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  status VARCHAR, -- pending, delivered, opened, rsvp_yes, rsvp_no, failed, invalid
  ...
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER,
  organizer_id INTEGER,
  amount DECIMAL,
  status VARCHAR,
  reference VARCHAR,
  ...
);

-- Still needs implementation:
CREATE TABLE invites (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER,
  event_id INTEGER,
  channel VARCHAR, -- email, whatsapp, sms
  status VARCHAR,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  rsvp_token VARCHAR UNIQUE,
  ...
);

CREATE TABLE delivery_logs (
  id SERIAL PRIMARY KEY,
  invite_id INTEGER,
  status VARCHAR,
  error_message VARCHAR,
  timestamp TIMESTAMP,
  ...
);
```

## Feature Details

### Guest Upload
Users can:
1. **Manual Entry**: Click "Add Guest" → Fill name, email/phone
2. **CSV Import**: Upload CSV with columns: Name, Email, Phone
3. **Smart Validation**:
   - Check for duplicates
   - Validate email/phone format
   - Reject entries exceeding quota
   - Mark invalid entries

### Guest Status Tracking
Real-time status updates:
```
pending → sent (to delivery channel)
       → delivered (confirmed by provider)
       → opened (for email)
       → invalid (bad contact info)
       → failed (delivery error)
```

For RSVP:
```
opened → waiting for response
      → rsvp_yes (accepted)
      → rsvp_no (declined)
      → no_response (timeout after X days)
```

### Send History
- Shows all send attempts (max 3)
- Timestamp of each send
- Status breakdown per send
- Option to resend with updated message

### Channel Restrictions
```javascript
availableChannels = {
  email: paidFor.includes('email'),
  whatsapp: paidFor.includes('whatsapp'),
  sms: paidFor.includes('sms')
}
```

Users can send via:
- All selected channels simultaneously
- Individual channels selectively
- Custom message per channel

## API Endpoints Needed

```
POST   /guests/upload              - CSV import
POST   /guests/add                 - Manual entry
GET    /guests/{event_id}          - List with filters
PUT    /guests/{guest_id}          - Edit
DELETE /guests/{guest_id}          - Delete

POST   /invites/send               - Send to all/filtered guests
POST   /invites/{invite_id}/resend - Resend individual
GET    /invites/{event_id}         - List by event

GET    /analytics/{event_id}       - Delivery breakdown
GET    /analytics/{event_id}/by-channel - Per-channel stats

GET    /rsvp/{token}               - RSVP landing page
POST   /rsvp/{token}               - Submit RSVP response

WEBHOOK /webhooks/email/opened     - Email open tracking
WEBHOOK /webhooks/whatsapp/status  - WhatsApp delivery status
WEBHOOK /webhooks/sms/status       - SMS delivery status
```

## Frontend Pages Status

```
/dashboard/create .......................... ✅ READY
/dashboard/payment-callback ................ ✅ READY
/dashboard/invites/[eventId]/manage ....... ✅ READY (basic UI)
/dashboard/invites/[eventId]/guests/add .. ⏳ TODO
/dashboard/invites/[eventId]/guests/import ⏳ TODO
/rsvp/[token] ............................ ⏳ TODO
/dashboard/events ......................... ✅ EXISTING (for POST EVENT)
```

## Configuration Needed

### Environment Variables
```
PAYSTACK_SECRET_KEY=...          # Already in backend
PAYSTACK_PUBLIC_KEY=...          # Already in backend
FRONTEND_URL=...                 # Update for callback
WHATSAPP_BUSINESS_API_TOKEN=...  # For WhatsApp sending
SMS_PROVIDER_API_KEY=...         # For SMS sending
```

### Email Provider
- SendGrid or Resend (already integrated)
- Implement open tracking with webhook

### SMS Provider
- Termii, Vonage, or Twilio
- Implement delivery status tracking

### WhatsApp Business API
- Meta WhatsApp Business API
- Implement template messages
- Track delivery status

## Testing Checklist

```
[ ] Payment flow - successful payment
[ ] Payment flow - failed payment
[ ] Payment flow - pending payment
[ ] Guest upload - manual entry
[ ] Guest upload - CSV import
[ ] Guest upload - validation
[ ] Guest upload - quota enforcement
[ ] Guest edit - update info
[ ] Guest delete - remove from list
[ ] Invite send - all channels
[ ] Invite send - specific channel
[ ] Invite send - send limit (3 max)
[ ] Delivery tracking - status updates
[ ] RSVP - guest responds yes
[ ] RSVP - guest responds no
[ ] Analytics - breakdown by channel
[ ] Analytics - breakdown by status
```

## Notes

1. **Guest Quota**: After payment, users can only upload up to their paid guest count
2. **Channel Restrictions**: Only paid channels appear in send interface
3. **Send Limit**: Max 3 send attempts per event (enforced at API level)
4. **Message Editing**: Users can edit invite message before each send
5. **Batch Operations**: All sends are asynchronous - show queue status
6. **Retry Logic**: Failed deliveries can be retried
7. **Data Retention**: Guest data retained for 6 months post-event (or as per compliance)

## Next Steps

1. Implement guest management API endpoints
2. Create CSV import and validation logic
3. Wire up invite sending (start with email)
4. Implement delivery tracking webhooks
5. Create RSVP landing page
6. Build analytics dashboard
7. Add WhatsApp and SMS sending
8. Performance testing with large guest lists

