# 🎨 Trial Enforcement - Frontend Implementation

**What Frontend Developers Need to Know**

---

## 📋 Quick Summary

**What Changed:**
- Registration now accepts `device_fingerprint` parameter
- Create event endpoint returns 402 if trial is used
- Trials have dedicated endpoints for pre-auth users

**What You Need to Do:**
1. Capture device fingerprint on registration
2. Pass fingerprint to register endpoint
3. Handle 402 errors on create event
4. Show upgrade prompts when trial is expired

---

## 🔧 Frontend Integration

### 1. Device Fingerprinting Library

**Install FingerprintJS (recommended):**
```bash
npm install @fingerprintjs/fingerprintjs
```

**Usage:**
```javascript
import FingerprintJS from '@fingerprintjs/fingerprintjs'

async function getDeviceFingerprint() {
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  return result.visitorId  // Returns: "abc123def456..."
}
```

### 2. Update Register Endpoint Call

**Old:**
```javascript
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password,
    first_name,
    last_name,
    phone
  })
})
```

**New:**
```javascript
async function registerWithTrialTracking(userData) {
  const fingerprint = await getDeviceFingerprint()
  
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
      device_fingerprint: fingerprint  // ← NEW
    })
  })
  
  return await response.json()
}
```

### 3. Handle Trial Exhaustion on Create Event

**Update create event handler:**
```javascript
async function createEvent(eventData) {
  const token = localStorage.getItem('access_token')
  
  const response = await fetch('/api/v1/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(eventData)
  })
  
  // ← NEW: Handle 402 Payment Required
  if (response.status === 402) {
    const error = await response.json()
    showUpgradeModal({
      title: "Trial Expired",
      message: error.detail,
      cta: "Upgrade Now"
    })
    return null
  }
  
  if (!response.ok) {
    throw new Error(`Failed to create event: ${response.statusText}`)
  }
  
  return await response.json()
}
```

### 4. Update Create Invite Handler

**Similar pattern for create invite:**
```javascript
async function createInvite(inviteData) {
  const token = localStorage.getItem('access_token')
  
  const response = await fetch('/api/v1/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(inviteData)
  })
  
  if (response.status === 402) {
    showUpgradeModal({
      title: "Trial Expired",
      message: "You've used your free CREATE INVITE trial. Upgrade to send more.",
      cta: "View Plans"
    })
    return null
  }
  
  return await response.json()
}
```

### 5. Upgrade Modal Component

**Create/UpdateUpgradeModal.jsx:**
```jsx
export function UpgradeModal({ title, message, cta, onClose }) {
  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        
        <div className="pricing-plans">
          <PricingCard
            name="Starter"
            price="₦5,000/month"
            features={['Unlimited Events', 'Unlimited Invites']}
            onSelect={() => selectPlan('starter')}
          />
          <PricingCard
            name="Pro"
            price="₦15,000/month"
            features={['Unlimited Events', 'Unlimited Invites', 'Advanced Analytics']}
            onSelect={() => selectPlan('pro')}
          />
        </div>
        
        <button onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  )
}
```

---

## 🧪 Frontend Testing

### Test 1: Device Fingerprint Capture

```javascript
async function testFingerprintCapture() {
  const fingerprint = await getDeviceFingerprint()
  console.log('Device Fingerprint:', fingerprint)
  // Should return: abc123def456... (consistent across page reloads)
  
  // Refresh page
  const fingerprint2 = await getDeviceFingerprint()
  console.log('Second call:', fingerprint2)
  // Should be same as fingerprint
  
  console.assert(fingerprint === fingerprint2, 'Fingerprint should be consistent')
}
```

### Test 2: Register with Fingerprint

```javascript
async function testRegisterWithFingerprint() {
  const response = await registerWithTrialTracking({
    email: 'test@example.com',
    password: 'StrongPass123!@#',
    first_name: 'Test',
    last_name: 'User',
    phone: '+234808123456'
  })
  
  console.log('Register response:', response)
  // Should have: access_token, user data
  
  const storedFingerprint = localStorage.getItem('deviceFingerprint')
  console.log('Stored fingerprint:', storedFingerprint)
  // Should match what was sent
}
```

### Test 3: Create Event - Trial Available

```javascript
async function testCreateEventWithTrial() {
  const token = localStorage.getItem('access_token')
  
  const response = await fetch('/api/v1/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Test Event',
      venue: 'Lagos',
      event_date: '2026-07-15',
      event_time: '18:00',
      guest_count_range: '100-200'
    })
  })
  
  console.log('Status:', response.status)
  // Should be 200 (success)
  
  const data = await response.json()
  console.log('Event created:', data.id)
}
```

### Test 4: Create Event - Trial Exhausted

```javascript
async function testCreateEventTrialExhausted() {
  // Create first event (succeeds)
  await createEvent({ title: 'Event 1', ... })
  
  // Try to create second event (should fail with 402)
  const response = await fetch('/api/v1/events', {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({ title: 'Event 2', ... })
  })
  
  console.assert(response.status === 402, 'Should return 402 Payment Required')
  
  const error = await response.json()
  console.log('Error message:', error.detail)
  // Should say: "You have already used your free POST EVENT trial"
}
```

---

## 📱 UI/UX Considerations

### Before Registration
```
┌─────────────────────────────────────┐
│        CREATE ACCOUNT               │
├─────────────────────────────────────┤
│                                     │
│ Email: [ input ]                    │
│ Password: [ input ]                 │
│ First Name: [ input ]               │
│ Last Name: [ input ]                │
│ Phone: [ input ]                    │
│                                     │
│ [✓] I understand I get 1 free      │
│     event + 1 free invite           │
│                                     │
│              [Sign Up] [Login]      │
│                                     │
└─────────────────────────────────────┘
```

### After Trial Used - Upgrade CTA
```
┌─────────────────────────────────────┐
│    Trial Expired - Upgrade Now       │
├─────────────────────────────────────┤
│                                     │
│ You've used your free trial!        │
│ Upgrade to create more events.      │
│                                     │
│ ┌─────────────┬─────────────┐      │
│ │ Starter     │ Pro         │      │
│ │ ₦5,000/mo   │ ₦15,000/mo  │      │
│ │             │             │      │
│ │ Unlimited   │ Unlimited   │      │
│ │ Events      │ Events      │      │
│ │ + Invites   │ + Analytics │      │
│ │             │             │      │
│ │ [Choose]    │ [Choose]    │      │
│ └─────────────┴─────────────┘      │
│                                     │
│              [Maybe Later]          │
│                                     │
└─────────────────────────────────────┘
```

### In Dashboard - Trial Status
```
┌─────────────────────────────────────┐
│          DASHBOARD                  │
├─────────────────────────────────────┤
│                                     │
│ ┌─ Trial Status ─────────────────┐ │
│ │ • Create Event: ✅ Used        │ │
│ │ • Create Invite: ⏳ Available   │ │
│ │                                │ │
│ │ Upgrade to unlock unlimited    │ │
│ │ [View Plans]                   │ │
│ └────────────────────────────────┘ │
│                                     │
│ [+ Create Event] [+ Create Invite] │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔄 API Contract

### Register Endpoint

**Request (NEW):**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!@#",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+234808123456",
  "verification_channel": "email",
  "device_fingerprint": "abc123def456..." ← NEW FIELD
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "organizer",
    "is_verified": false,
    "verification_channel": "email"
  }
}
```

### Create Event Endpoint

**Request:**
```json
{
  "title": "My Event",
  "event_type": "concert",
  "host_name": "John Doe",
  "event_date": "2026-07-15",
  "event_time": "18:00",
  "venue": "Lagos",
  ...
}
```

**Response (Success - 200):**
```json
{
  "id": 456,
  "title": "My Event",
  "organizer_id": 123,
  "status": "pending",
  ...
}
```

**Response (Trial Used - 402):**
```json
{
  "detail": "You have already used your free POST EVENT trial. Upgrade your account for unlimited events."
}
```

---

## 📦 Environment Variables

No new environment variables needed on frontend.

Just ensure these are set on backend:
- `SECRET_KEY` - Used for fingerprint hashing
- `DEBUG=False` - Production mode

---

## ✅ Checklist

### Before Deployment
- [ ] Install FingerprintJS: `npm install @fingerprintjs/fingerprintjs`
- [ ] Update register form to capture fingerprint
- [ ] Pass fingerprint to register endpoint
- [ ] Handle 402 errors on create event
- [ ] Handle 402 errors on create invite
- [ ] Create UpgradeModal component
- [ ] Update pricing page with plans
- [ ] Test registration flow in staging
- [ ] Test trial exhaustion in staging
- [ ] Update error handling for 402 status

### After Deployment
- [ ] Monitor error logs for 402 responses
- [ ] Track upgrade conversion rate
- [ ] Verify fingerprint is captured
- [ ] Test with multiple devices
- [ ] Gather user feedback on UX

---

## 🚨 Common Issues

### "Fingerprint is undefined"
```javascript
// Make sure to await the async function
const fingerprint = await getDeviceFingerprint()  // ✅
const fingerprint = getDeviceFingerprint()        // ❌ Missing await
```

### "402 not being caught"
```javascript
// Make sure to check status before calling response.json()
if (response.status === 402) {
  const error = await response.json()
  // Handle upgrade
}
```

### "Register failing silently"
```javascript
// Add error handling
try {
  const response = await registerWithTrialTracking(userData)
  if (!response.ok) {
    console.error('Register failed:', response.status)
  }
} catch (error) {
  console.error('Register error:', error)
}
```

---

## 📞 Support

**For questions about:**
- Backend changes → See TRIAL_ABUSE_PREVENTION_GUIDE.md
- API endpoints → See TRIAL_IMPLEMENTATION_FRONTEND.md
- Testing → See TRIAL_ABUSE_PREVENTION_GUIDE.md Test section

