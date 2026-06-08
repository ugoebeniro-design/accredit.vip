# Security Hardening Guide - accredit.vip

## 🔴 CRITICAL VULNERABILITIES (Fix Immediately)

### 1. **DEBUG MODE IN PRODUCTION**
**Risk:** Exposes sensitive stack traces, config, and internal structure
```python
# ❌ Current (config.py:7)
DEBUG: bool = True

# ✅ Fix:
DEBUG: bool = False  # In production
# Use environment variable: DEBUG=false
```

### 2. **Default SECRET_KEY**
**Risk:** JWT tokens can be forged
```python
# ❌ Current (config.py:9)
SECRET_KEY: str = "change-me-in-production"

# ✅ Fix:
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY: str = os.getenv("SECRET_KEY", "")
# Raise error if not set in production:
if not SECRET_KEY and not DEBUG:
    raise ValueError("SECRET_KEY must be set in production")
```

### 3. **No HTTPS Enforcement**
**Risk:** Data transmitted in plain text
```python
# ✅ Add to main.py:
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware import httpsredirect

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["accredit.vip", "*.accredit.vip"])
# Add HTTPS redirect in production
if not DEBUG:
    app.add_middleware(httpsredirect.HTTPSRedirectMiddleware)
```

### 4. **Overly Permissive CORS**
**Risk:** Anyone can access your API
```python
# ❌ Current (main.py:23-32)
allow_methods=["*"],
allow_headers=["*"],

# ✅ Fix:
allow_origins=[
    "https://accredit.vip",
    "https://www.accredit.vip",
    "https://app.accredit.vip",  # Specific subdomains only
],
allow_credentials=True,
allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
allow_headers=["Content-Type", "Authorization"],
expose_headers=["Content-Type"],
max_age=600,  # Cache preflight for 10 min
```

### 5. **Weak Token Expiration**
**Risk:** Tokens valid for 24 hours
```python
# ❌ Current (config.py:11)
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

# ✅ Fix:
ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes for access token
REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # Use refresh tokens for longer sessions
```

---

## 🟠 HIGH PRIORITY VULNERABILITIES

### 6. **No Rate Limiting on Auth**
**Risk:** Brute force attacks, credential stuffing
```python
# ✅ Add to auth.py endpoints:
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
# In your endpoint:
@limiter.limit("5/minute")  # Max 5 login attempts per minute
async def login(request: Request, email: str, password: str):
    # implementation
```

### 7. **No Password Policy**
**Risk:** Weak passwords (123456, password, etc.)
```python
# ✅ Add password validation:
import re
from pydantic import BaseModel, field_validator

class RegisterRequest(BaseModel):
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain number')
        if not re.search(r'[!@#$%^&*]', v):
            raise ValueError('Password must contain special character')
        return v
```

### 8. **No Account Lockout**
**Risk:** Unlimited login attempts
```python
# ✅ Add to User model:
from datetime import datetime, timedelta

class User(Base):
    # ... existing fields ...
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None

# In login endpoint:
async def login(email: str, password: str, db: AsyncSession):
    user = await db.execute(select(User).where(User.email == email))
    user = user.scalar_one_or_none()
    
    # Check if account locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=429, detail="Account locked. Try again later.")
    
    if not verify_password(password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Success - reset attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()
```

### 9. **No Input Validation**
**Risk:** SQL Injection, XSS, Command Injection
```python
# ✅ Use Pydantic for validation:
from pydantic import BaseModel, EmailStr, constr

class EventCreate(BaseModel):
    title: constr(min_length=1, max_length=255)  # String with length validation
    description: constr(max_length=5000)
    email: EmailStr  # Validates email format
    
    class Config:
        # Prevent arbitrary fields
        extra = "forbid"
```

### 10. **SQL Injection Risk in Searches**
**Risk:** Unsanitized search parameters
```python
# ❌ Vulnerable:
query = f"SELECT * FROM events WHERE title LIKE '%{search}%'"

# ✅ Safe (already using SQLAlchemy):
query = select(Event).where(Event.title.ilike(f"%{search}%"))
# SQLAlchemy parameterizes automatically
```

### 11. **No CSRF Protection**
**Risk:** Cross-site request forgery
```python
# ✅ Add CSRF middleware:
from fastapi_csrf_protect import CsrfProtect

@CsrfProtect.load_config
def load_config():
    return CsrfSettings(secret_key=settings.SECRET_KEY)

# Use in endpoints that modify data:
@router.post("/events")
async def create_event(
    request: Request,
    csrf_protect: CsrfProtect = Depends()
):
    await csrf_protect.validate_csrf(request)
```

### 12. **Sensitive Data in Logs**
**Risk:** Passwords, tokens, API keys logged
```python
# ✅ Implement logging filter:
class SensitiveDataFilter(logging.Filter):
    def filter(self, record):
        record.msg = re.sub(r'password["\']?\s*[:=]\s*["\']?[^"\']*', 
                           'password=***REDACTED***', str(record.msg))
        record.msg = re.sub(r'token["\']?\s*[:=]\s*["\']?[^"\']*', 
                           'token=***REDACTED***', str(record.msg))
        return True

logger.addFilter(SensitiveDataFilter())
```

### 13. **No Webhook Signature Verification**
**Risk:** Fake webhook calls, spoofed payments
```python
# ✅ Verify Paystack webhooks:
import hmac
import hashlib

@router.post("/webhooks/paystack")
async def paystack_webhook(request: Request, db: AsyncSession):
    body = await request.body()
    signature = request.headers.get("x-paystack-signature")
    
    # Verify signature
    hash = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        body,
        hashlib.sha512
    )
    computed_signature = hash.hexdigest()
    
    if signature != computed_signature:
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Process webhook safely
    data = await request.json()
```

---

## 🟡 MEDIUM PRIORITY

### 14. **No Encryption for Sensitive Data**
**Risk:** Bank account numbers, sensitive info in plaintext
```python
# ✅ Add encryption:
from cryptography.fernet import Fernet

class User(Base):
    # Encrypt sensitive fields
    bank_account: str  # Store encrypted
    
# In service:
def encrypt_sensitive_data(data: str) -> str:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_sensitive_data(encrypted_data: str) -> str:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
    return cipher_suite.decrypt(encrypted_data.encode()).decode()
```

### 15. **No Content Security Policy (CSP)**
**Risk:** XSS attacks
```python
# ✅ Add to frontend layout.tsx or nginx:
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.accredit.vip;
    frame-ancestors 'none';
    base-uri 'self';
">
```

### 16. **No Secure Cookie Settings**
**Risk:** Cookie theft, XSS/CSRF attacks
```python
# ✅ In auth endpoints:
response.set_cookie(
    key="access_token",
    value=token,
    max_age=15 * 60,  # 15 minutes
    expires=15 * 60,
    path="/",
    domain="accredit.vip",
    secure=True,  # HTTPS only
    httponly=True,  # Prevents JavaScript access
    samesite="strict",  # CSRF protection
)
```

### 17. **No Request Size Limits**
**Risk:** DoS attacks, server memory exhaustion
```python
# ✅ Add to main.py:
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)

# Add max upload size:
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.size > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
```

### 18. **No SQL Injection in Complex Queries**
**Risk:** Parameterization in raw SQL
```python
# ✅ Always use parameterized queries:
# ❌ Don't do this:
result = await db.execute(text(f"SELECT * FROM users WHERE id = {user_id}"))

# ✅ Do this:
result = await db.execute(
    text("SELECT * FROM users WHERE id = :id"),
    {"id": user_id}
)
```

---

## 🟢 LOW PRIORITY (Best Practices)

### 19. **Add Security Headers**
```python
# ✅ In main.py:
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

### 20. **Implement Audit Logging**
```python
# ✅ Track all important actions:
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: int = Column(Integer, primary_key=True)
    user_id: int = Column(Integer, ForeignKey("users.id"))
    action: str  # "login", "event_created", "withdrawal_requested"
    resource_type: str  # "event", "payment", "user"
    resource_id: int
    changes: dict  # What changed
    ip_address: str
    user_agent: str
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

# Log every important action
async def log_action(db, user_id, action, resource_type, resource_id, request):
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
```

### 21. **Implement OWASP Top 10 Checks**
- ✅ A1: Broken Access Control → Implement role-based access control
- ✅ A2: Cryptographic Failures → Use HTTPS, encrypt sensitive data
- ✅ A3: Injection → Use parameterized queries (already doing)
- ✅ A4: Insecure Design → Security by default
- ✅ A5: Security Misconfiguration → Secure defaults (DEBUG=false, etc.)
- ✅ A6: Vulnerable Components → Keep dependencies updated
- ✅ A7: Authentication Failures → Implement strong auth (above)
- ✅ A8: Software & Data Integrity → Webhook verification
- ✅ A9: Logging & Monitoring → Audit trails
- ✅ A10: SSRF → Validate URLs, use allowlists

### 22. **Add Dependency Scanning**
```bash
# Install and run:
pip install safety
safety check

# Or use:
pip install bandit
bandit -r backend/
```

### 23. **Frontend Security**
```typescript
// ✅ In frontend/next.config.js:
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 🔒 IMPLEMENTATION PRIORITY

### Phase 1 (Week 1) - CRITICAL
1. Change DEBUG to False
2. Generate and set strong SECRET_KEY
3. Restrict CORS origins
4. Reduce token expiration to 15 minutes
5. Add HTTPS enforcement

### Phase 2 (Week 2) - HIGH
1. Add rate limiting on auth
2. Implement password policy
3. Add account lockout
4. Verify webhook signatures
5. Add input validation

### Phase 3 (Week 3) - MEDIUM
1. Encrypt sensitive data
2. Add secure cookie settings
3. Implement request size limits
4. Add security headers

### Phase 4 (Week 4) - LOW
1. Add CSP headers
2. Implement audit logging
3. Add dependency scanning
4. Security testing

---

## 🛠️ TOOLS & MONITORING

### Testing Tools
```bash
# Static analysis
bandit -r backend/
pylint backend/

# Dependency vulnerabilities
safety check
pip-audit

# OWASP testing
# Use: https://owasp.org/www-project-zap/

# API testing
# Use: Postman + security tests
```

### Monitoring
- Set up error tracking: Sentry
- Add APM: Datadog or New Relic
- Monitor logs for suspicious activity
- Set up alerts for failed login attempts

### Regular Security Updates
- Check dependencies monthly: `pip list --outdated`
- Subscribe to security advisories
- Perform quarterly penetration testing
- Code review all authentication/payment changes

---

## ✅ CHECKLIST

- [ ] DEBUG = False in production
- [ ] Strong SECRET_KEY set
- [ ] HTTPS enforced
- [ ] CORS restricted
- [ ] Short token expiration (15 min)
- [ ] Rate limiting on auth
- [ ] Password policy enforced
- [ ] Account lockout implemented
- [ ] Webhook signatures verified
- [ ] Input validation on all endpoints
- [ ] Sensitive data encrypted
- [ ] Secure cookies configured
- [ ] Security headers added
- [ ] Audit logging implemented
- [ ] Dependency scanning enabled
- [ ] Error tracking configured
- [ ] Penetration testing scheduled
- [ ] Security policy documented

---

**Last Updated:** 2026-06-08
**Severity:** 🔴 CRITICAL - Address Phase 1 immediately before production
