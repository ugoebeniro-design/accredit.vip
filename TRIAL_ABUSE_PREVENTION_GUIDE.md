# 🛡️ Trial Abuse Prevention Guide

**Preventing Users from Cheating the One-Time Trial System**

---

## 📋 Overview

The Accredit.vip trial system allows new users to test features like "CREATE INVITE" and "POST EVENT" once before requiring payment. This guide explains how to prevent abuse.

### Vulnerabilities Prevented

| Vulnerability | Attack | Prevention |
|---------------|--------|-----------|
| **Multiple Accounts** | Create many accounts to get many trials | Link device fingerprint to account |
| **Device Spoofing** | Change device fingerprint for each trial | Hash fingerprint with SECRET_KEY |
| **Account Sharing** | Share account with friends to multiply trials | Detect simultaneous logins from different IPs |
| **Trial Bypass** | Create account after trial used | Enforce trial check on create_event endpoint |
| **Trial Multiplication** | Get trial for invite, then trial for event | Track trial_invite_used and trial_event_used separately |

---

## 🔐 How It Works

### Trial Enforcement Architecture

```
┌──────────────────────────────┐
│   User Opens Trial Page       │
├──────────────────────────────┤
│ • Send fingerprint data       │
│   (browser, OS, GPU, etc.)    │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│   POST /trials/check          │
├──────────────────────────────┤
│ • Hash fingerprint            │
│ • Check trial_usages table    │
│ • Return allowed: true/false  │
└─────────────┬────────────────┘
              │
              ▼
        ┌─────────────┐
        │ Has trial?  │
        └──┬──────┬──┘
        Yes│      │No
          ▼      ▼
      [Show]  [Upgrade]
      Trial    CTA
```

### Registration Flow with Trial Tracking

```
┌──────────────────────────────┐
│   User Registers Account      │
├──────────────────────────────┤
│ • Capture device_fingerprint  │
│ • Hash and store              │
│   trial_fingerprint_hash      │
│ • Initialize:                 │
│   - trial_invite_used = false │
│   - trial_event_used = false  │
│   - trial_used_at = null      │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│   User Logs In Later          │
├──────────────────────────────┤
│ • Store IP + User-Agent       │
│ • last_login_ip = <IP>        │
│ • Detect account sharing      │
│   (same IP, different users)  │
└──────────────────────────────┘
```

### Create Event with Trial Enforcement

```
┌──────────────────────────────┐
│   User clicks "POST EVENT"    │
├──────────────────────────────┤
│ 1. Check if user authenticated
│ 2. TrialEnforcementService    │
│    .check_trial_available()   │
│ 3. If trial_event_used=true   │
│    → Return 402 Payment       │
│    Required with upgrade CTA  │
│ 4. If trial_event_used=false  │
│    → Allow event creation     │
│ 5. Set trial_event_used=true  │
│ 6. Set trial_used_at=now()    │
└──────────────────────────────┘
```

---

## 🛠️ Implementation Details

### 1. User Model Changes

**New Fields in User table:**
```sql
trial_invite_used BOOLEAN DEFAULT false    -- One-time invite trial
trial_event_used BOOLEAN DEFAULT false     -- One-time event trial
trial_fingerprint_hash VARCHAR              -- Device fingerprint hash
trial_used_at TIMESTAMP WITH TIME ZONE     -- When trial was used
```

**Indexes:**
```sql
CREATE INDEX ix_users_trial_fingerprint_hash 
ON users(trial_fingerprint_hash);
```

### 2. Device Fingerprinting

**Fingerprint Data (from frontend):**
```javascript
{
  "fingerprint": "sha256(browser + OS + screenResolution + GPU + ...)"
}
```

**Hashing on Backend:**
```python
fingerprint_hash = hashlib.sha256(
    f"{SECRET_KEY}:fingerprint:{fingerprint}".encode()
).hexdigest()
```

**Security Properties:**
- ✅ Uses SECRET_KEY (unique per deployment)
- ✅ Deterministic (same fingerprint = same hash)
- ✅ Non-reversible (hash → fingerprint impossible)
- ✅ Prevents replaying hashes between deployments

### 3. Multi-Account Fraud Detection

**Detection Methods:**

**Method 1: Fingerprint Matching**
```python
# If fingerprint is linked to another user account
SELECT * FROM users 
WHERE trial_fingerprint_hash = ?
AND id != current_user_id

# If found → Multiple accounts from same device
```

**Method 2: Client Hash Frequency**
```python
# If same IP + User-Agent used for 3+ trials
SELECT COUNT(*) FROM trial_usages 
WHERE client_hash = ?
GROUP BY trial_type

# If count > 3 → Suspicious activity
```

**Method 3: Account Sharing Detection**
```python
# If user logged in from IP A, 
# then IP B within 10 minutes
time_diff = (now - last_login_at).total_seconds()

if (current_ip != last_login_ip 
    and 0 < time_diff < 600):
    # Possible account sharing
    # Two people using same account
```

### 4. Trial Usage Recording

**When User Uses Trial (unauthenticated):**
```python
# POST /trials/use
usage = TrialUsage(
    trial_type="event",
    fingerprint_hash=_hash(req.fingerprint),
    client_hash=_hash(f"{ip}:{user_agent}"),
    summary=json.dumps({...payload...})
)
```

**When User Creates Event (authenticated):**
```python
# POST /events
# After event creation:
user.trial_event_used = True
user.trial_used_at = datetime.now(timezone.utc)
db.add(user)
```

---

## 📊 Trial System States

### Per-User Trial States

```
┌─────────────────────────────────────────────┐
│          Initial Registration                 │
├─────────────────────────────────────────────┤
│ trial_invite_used = false                    │
│ trial_event_used = false                     │
│ trial_fingerprint_hash = <hash>              │
│ trial_used_at = NULL                         │
└─────────────────────────────────────────────┘
                    ↓
        ┌─────────────────────────┐
        │  User Tries Trial (UI)   │
        │  /trials/check → allowed │
        └───────────┬─────────────┘
                    │
        ┌───────────▼─────────────┐
        │ User Uses Trial (UI)     │
        │ /trials/use → success    │
        │ Records in trial_usages  │
        └─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      After Creating Account                   │
├─────────────────────────────────────────────┤
│ trial_invite_used = false  ← Not used yet    │
│ trial_event_used = true    ← Already used!   │
│ trial_fingerprint_hash = <hash>              │
│ trial_used_at = 2026-06-08 12:34:56         │
└─────────────────────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ User tries create_event        │
    │ TrialEnforcementService       │
    │ .check_trial_available()       │
    │ → Returns:                     │
    │   allowed = false              │
    │   reason = "Already used"      │
    └───────────┬───────────────────┘
                │
    ┌───────────▼───────────────────┐
    │ API returns 402 Payment        │
    │ Required                       │
    │                               │
    │ "Upgrade to create more       │
    │  events"                       │
    └───────────────────────────────┘
```

---

## 🚀 API Usage

### 1. Check Trial Availability (Unauthenticated)

**Request:**
```bash
POST /api/v1/trials/check
Content-Type: application/json

{
  "trial_type": "event",
  "fingerprint": "sha256(browser+OS+...)"
}
```

**Response (Trial Available):**
```json
{
  "allowed": true,
  "used": false
}
```

**Response (Trial Already Used):**
```json
{
  "allowed": false,
  "used": true
}
```

### 2. Use Trial (Unauthenticated)

**Request:**
```bash
POST /api/v1/trials/use
Content-Type: application/json

{
  "trial_type": "event",
  "fingerprint": "sha256(browser+OS+...)",
  "payload": {
    "title": "My Event",
    "venue": "Location",
    "category": "Music",
    "event_date": "2026-07-15"
  }
}
```

**Response (Success):**
```json
{
  "allowed": false,
  "message": "Trial used. Create an account to continue.",
  "flier_url": "https://..."
}
```

**Response (Fraud Detected):**
```json
{
  "status": 409,
  "detail": "This device is already linked to another account. Each device gets one free trial."
}
```

### 3. Register with Device Fingerprint

**Request:**
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123!@#",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+234808123456",
  "verification_channel": "email",
  "device_fingerprint": "sha256(browser+OS+...)"  ← Links to trial
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "organizer",
    "is_verified": false
  }
}
```

### 4. Create Event (Authenticated) - Trial Enforced

**Request:**
```bash
POST /api/v1/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Awesome Event",
  "venue": "Lagos, Nigeria",
  "event_date": "2026-07-15",
  ...
}
```

**Response (Trial Available):**
```json
{
  "id": 456,
  "title": "My Awesome Event",
  "organizer_id": 123,
  ...
}
```

**Response (Trial Used):**
```json
{
  "status": 402,
  "detail": "You have already used your free POST EVENT trial. Upgrade your account for unlimited events."
}
```

---

## 🔍 Fraud Detection Examples

### Example 1: Multiple Accounts from Same Device

**Attack:**
```
User creates account 1 on Device A
→ Uses trial event
→ Logs out

User creates account 2 on Device A (different email)
→ Tries to use trial event
→ System detects same device
```

**Prevention:**
```python
# In TrialEnforcementService.detect_multi_account_abuse()

fingerprint_hash = hash("Device A")
result = SELECT * FROM trial_usages 
         WHERE fingerprint_hash = hash("Device A")

# Found! Return error:
# "This device is already linked to another account"
```

### Example 2: Account Sharing

**Attack:**
```
User A (IP: 192.168.1.1) logs in at 12:00pm
User A's friend (IP: 203.0.113.45) logs in at 12:05pm
Both try to create events using User A's account
```

**Prevention:**
```python
# In TrialEnforcementService.detect_account_sharing()

current_ip = "203.0.113.45"
last_login_ip = "192.168.1.1"
time_diff = 300 seconds (5 minutes)

if (current_ip != last_login_ip and 
    0 < time_diff < 600):
    # Return error:
    # "Account accessed from multiple locations simultaneously"
```

### Example 3: Device Fingerprint Spoofing

**Attack:**
```
User generates random fingerprints for each trial attempt
→ fingerprint1 = random()
→ Uses trial
→ fingerprint2 = random()
→ Tries trial again
```

**Prevention:**
```
1. Client-side fingerprinting uses hardware properties:
   - CPU cores, RAM, GPU, screen resolution
   - These are hard to fake
   
2. Server validates frequency:
   - If 10+ different fingerprints, same IP
   → Flag as suspicious
```

---

## 📈 Monitoring & Alerting

### Metrics to Track

```sql
-- Daily trial usage
SELECT DATE(created_at) as date,
       trial_type,
       COUNT(*) as count
FROM trial_usages
GROUP BY date, trial_type;

-- Fraud attempts
SELECT user_id, 
       COUNT(*) as attempts,
       MAX(created_at)
FROM trial_usages
WHERE fingerprint_hash IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Multi-device usage
SELECT trial_fingerprint_hash,
       COUNT(DISTINCT id) as account_count
FROM users
WHERE trial_fingerprint_hash IS NOT NULL
GROUP BY trial_fingerprint_hash
HAVING COUNT(DISTINCT id) > 1;
```

### Alert Rules

```yaml
alerts:
  - name: multiple_accounts_same_device
    query: |
      SELECT trial_fingerprint_hash, COUNT(id)
      FROM users
      WHERE trial_fingerprint_hash IS NOT NULL
      GROUP BY trial_fingerprint_hash
      HAVING COUNT(id) > 1
    threshold: 1
    action: notify_fraud_team

  - name: rapid_trial_attempts
    query: |
      SELECT ip_address, COUNT(*) as attempts
      FROM trial_usages
      WHERE created_at > NOW() - INTERVAL 1 hour
      GROUP BY ip_address
      HAVING COUNT(*) > 5
    threshold: 1
    action: rate_limit_ip

  - name: account_sharing
    query: |
      SELECT user_id, 
             COUNT(DISTINCT last_login_ip) as ips
      FROM users
      WHERE last_login_at > NOW() - INTERVAL 1 hour
      GROUP BY user_id
      HAVING COUNT(DISTINCT last_login_ip) > 2
    threshold: 1
    action: request_verification
```

---

## 📝 Testing the Trial System

### Test 1: Normal Trial Usage

```bash
# 1. Check trial availability
curl -X POST http://localhost:8000/api/v1/trials/check \
  -H "Content-Type: application/json" \
  -d '{
    "trial_type": "event",
    "fingerprint": "unique-device-123"
  }'

# Expected: {"allowed": true, "used": false}

# 2. Use the trial
curl -X POST http://localhost:8000/api/v1/trials/use \
  -H "Content-Type: application/json" \
  -d '{
    "trial_type": "event",
    "fingerprint": "unique-device-123",
    "payload": {"title": "Test Event"}
  }'

# Expected: {"allowed": false, "message": "Trial used..."}

# 3. Check again
curl -X POST http://localhost:8000/api/v1/trials/check \
  -H "Content-Type: application/json" \
  -d '{
    "trial_type": "event",
    "fingerprint": "unique-device-123"
  }'

# Expected: {"allowed": false, "used": true}
```

### Test 2: Multi-Account Fraud Detection

```bash
# Account 1
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "password": "StrongPass123!@#",
    "first_name": "User",
    "last_name": "One",
    "device_fingerprint": "unique-device-abc"
  }'

# Account 2 (same device)
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@example.com",
    "password": "StrongPass123!@#",
    "first_name": "User",
    "last_name": "Two",
    "device_fingerprint": "unique-device-abc"
  }'

# Try trial on account 2
curl -X POST http://localhost:8000/api/v1/trials/use \
  -H "Content-Type: application/json" \
  -d '{
    "trial_type": "event",
    "fingerprint": "unique-device-abc",
    "payload": {"title": "Test"}
  }'

# Expected: 409 Conflict
# "This device is already linked to another account"
```

### Test 3: Trial Enforcement on Create Event

```bash
# Create account and get token
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPass123!@#",
    "first_name": "User",
    "last_name": "Test"
  }' | jq -r '.access_token')

# Create event (trial)
curl -X POST http://localhost:8000/api/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Event",
    "venue": "Lagos",
    "event_date": "2026-07-15",
    "event_time": "18:00",
    "guest_count_range": "100-200"
  }'

# Expected: 200 OK, event created

# Create second event
curl -X POST http://localhost:8000/api/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Second Event",
    "venue": "Lagos",
    "event_date": "2026-07-20",
    "event_time": "18:00",
    "guest_count_range": "100-200"
  }'

# Expected: 402 Payment Required
# "You have already used your free POST EVENT trial"
```

---

## ✅ Deployment Checklist

- [ ] Run migration: `alembic upgrade head`
- [ ] Update frontend to capture device fingerprint
- [ ] Add device_fingerprint to register request
- [ ] Update create event endpoint URL
- [ ] Test trial enforcement in staging
- [ ] Monitor fraud attempts in production
- [ ] Set up alerts for multi-account abuse
- [ ] Document upgrade flow for users

---

## 🎯 Summary

**One-time trial enforcement prevents:**
- ✅ Multiple accounts per user (fingerprint tracking)
- ✅ Trial bypass (check_trial_available on endpoints)
- ✅ Device spoofing (SECRET_KEY hashing)
- ✅ Account sharing (IP/time-based detection)
- ✅ Unlimited free usage (trial_used flags)

**Three layers of protection:**
1. **Device level** - Fingerprint hashing
2. **Account level** - Trial used flags
3. **Network level** - IP/User-Agent matching

