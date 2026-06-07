# Phone Number Validation & Guest Management System

## Overview

The system now includes comprehensive phone number validation, normalization, and guest management features that ensure data quality and international support.

## Phone Number Handling

### Features

1. **Automatic Normalization**
   - Converts all phone numbers to E.164 international format
   - Examples:
     - `08101143265` → `+2348101143265` (Nigeria)
     - `+234 810 1143 265` → `+2348101143265`
     - `+1-555-123-4567` → `+15551234567` (USA)

2. **Country Detection**
   - Automatically detects country code from phone number
   - Displays country flag emoji (🇳🇬, 🇺🇸, 🇬🇧, etc.)
   - Validates against known country codes
   - Supports 200+ countries

3. **Validation**
   - Uses the `phonenumbers` library (industry standard)
   - Checks for valid phone number patterns
   - Validates length based on country
   - Marks invalid numbers for review

4. **Email Validation**
   - Simple regex validation for email format
   - Detects invalid/incomplete emails
   - Shows validation status in UI

## Guest Management Features

### Automatic Processing

When guests are uploaded (CSV) or added manually:

1. **Phone Numbers**
   - Automatically normalized to E.164 format
   - Country code extracted and flagged
   - Validation status stored
   - Both original and normalized versions kept

2. **Email Addresses**
   - Validated for correct format
   - Status stored for display

3. **Sorting**
   - Guests automatically sorted alphabetically by name
   - Maintained on all list views

### Guest List Display

The guest list shows:
- **Name** - Guest name (alphabetically sorted)
- **Email** - Email address with validation badge (OK/Invalid)
- **Phone** - Country flag, normalized number, country code, validation status
- **Status** - Whether invite has been sent (Invited/Pending)
- **RSVP** - Response status (Accepted/Declined/Waiting)
- **Actions** - Edit/Delete buttons

## Admin Dashboard

### Available Endpoints

#### Overview
```
GET /api/v1/admin/dashboard/overview
```
Returns:
- Total users, events, guests
- Active events count
- Revenue metrics
- New users/events last 7 days

#### Client Management
```
GET /api/v1/admin/dashboard/clients?limit=50&offset=0
GET /api/v1/admin/dashboard/client/{client_id}
GET /api/v1/admin/dashboard/event/{event_id}
```
Shows:
- All clients with their metrics
- Client activity and events
- Event details and statistics

#### Event Management
```
GET /api/v1/admin/dashboard/events?status=draft&limit=50
```
Lists all events with:
- Organizer information
- Guest counts
- Event status
- Creation date

#### Analytics
```
GET /api/v1/admin/dashboard/analytics/revenue?days=30
GET /api/v1/admin/dashboard/analytics/activity?days=30
```
Provides:
- Revenue metrics by period
- Activity trends
- User engagement stats

### Access Control

Admin dashboard requires `superadmin` role. Regular users cannot access monitoring endpoints.

## Implementation Details

### Backend Files

1. **Phone Validator Service**
   - `backend/app/services/phone_validator.py`
   - `PhoneValidator` class with static methods
   - Supports 200+ countries
   - E.164 format output

2. **Guest Management API**
   - `backend/app/api/guest_management.py`
   - Updated with validation integration
   - Automatic sorting by name
   - Validation status tracking

3. **Admin Dashboard API**
   - `backend/app/api/admin_dashboard.py`
   - Comprehensive monitoring endpoints
   - Role-based access control
   - Analytics and reporting

### Database Schema Updates

Guest model now includes:
- `phone_normalized` - E.164 formatted phone
- `phone_country_code` - 2-letter country code (e.g., "NG")
- `phone_valid` - Boolean validation result
- `email_valid` - Boolean validation result

### Frontend Components

1. **GuestList Component**
   - `frontend/src/components/GuestList.tsx`
   - Displays guests with validation status
   - Shows country flags
   - Responsive table layout

## Usage Examples

### Adding a Guest
```javascript
POST /api/v1/guests/{event_id}/add
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+234 810 1143 265"
}

Response:
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+234 810 1143 265",
  "phone_normalized": "+2348101143265",
  "phone_country_code": "NG",
  "phone_country_flag": "🇳🇬",
  "phone_valid": true,
  "email_valid": true,
  ...
}
```

### Uploading CSV
```csv
name,email,phone
John Doe,john@example.com,+234 810 1143 265
Jane Smith,jane@example.com,08101143265
Bob Wilson,bob@invalid-email,+1-555-123-4567
```

Response includes:
- Count of valid additions
- List of validation warnings
- Error details for failed rows

### Listing Guests
```javascript
GET /api/v1/guests/{event_id}

Returns: Array of guests, sorted alphabetically, with:
- All contact information
- Validation status
- Country flag and code
- Invite status
- RSVP status
```

### Admin Monitoring
```javascript
GET /api/v1/admin/dashboard/overview
GET /api/v1/admin/dashboard/clients
GET /api/v1/admin/dashboard/event/{event_id}
```

## Supported Countries

The system supports phone numbers from 200+ countries including:
- Nigeria (+234)
- USA/Canada (+1)
- UK (+44)
- Across Africa, Europe, Asia, Americas

Invalid numbers or unsupported country codes will be marked as invalid.

## Data Quality

### Guest Validation Report

When uploading guests, the system:
1. Validates each phone number format
2. Checks email address format
3. Identifies incomplete/invalid data
4. Returns detailed error messages by row
5. Allows partial import with warnings

Example response:
```javascript
{
  "added": 45,
  "errors": [
    "Row 3: Name is required",
    "Row 7: Email or phone is required"
  ],
  "validation_warnings": [
    "Row 2: Phone number is invalid",
    "Row 5: Phone number is incomplete"
  ],
  "total_guests": 50
}
```

## Security Notes

- All phone numbers stored in normalized format
- Email validation prevents injection
- Admin dashboard protected by role verification
- Guest data isolated by event ownership
- No exposure of raw user input

## Next Steps

1. Install required packages: `pip install -r requirements.txt`
2. Run migrations to add new Guest fields
3. Update frontend to use GuestList component
4. Test with sample CSV uploads
5. Monitor admin dashboard for activity

