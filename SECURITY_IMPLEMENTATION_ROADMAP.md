# Security Implementation Roadmap

## 📋 Week 1: Critical Fixes (MUST DO BEFORE PRODUCTION)

### Day 1: Configuration & Secrets
**Estimated Time: 2 hours**

- [ ] Generate strong SECRET_KEY: 
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

- [ ] Generate ENCRYPTION_KEY:
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

- [ ] Create `.env` file with credentials
  ```bash
  cp backend/.env.example backend/.env
  # Edit and fill in all secrets
  ```

- [ ] Update `backend/app/core/config.py` (use SECURITY_PATCHES.md patch #1)

- [ ] Add `.env` to `.gitignore`:
  ```bash
  echo ".env" >> .gitignore
  ```

### Day 2: CORS & Headers Security
**Estimated Time: 1.5 hours**

- [ ] Update `backend/app/main.py` (use SECURITY_PATCHES.md patch #2)

- [ ] Test CORS locally:
  ```bash
  curl -H "Origin: http://example.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS http://localhost:8000/api/v1/auth/login -v
  ```

- [ ] Verify security headers:
  ```bash
  curl -I https://api.accredit.vip/api/v1/health
  # Should see: X-Content-Type-Options: nosniff, etc.
  ```

### Day 3: Token Security
**Estimated Time: 1 hour**

- [ ] Update token expiration in config to 15 minutes
- [ ] Test token refresh flow
- [ ] Update frontend SessionGuard to handle token expiration

### Day 4: Testing
**Estimated Time: 2 hours**

- [ ] Test with DEBUG=false locally
  ```bash
  DEBUG=false python -m uvicorn app.main:app --reload
  ```

- [ ] Verify no sensitive data in error messages
- [ ] Check logs for secrets
- [ ] Test with curl/Postman

### Day 5: Deployment
**Estimated Time: 1 hour**

- [ ] Set environment variables in production
- [ ] Redeploy with new configuration
- [ ] Verify HTTPS is enforced
- [ ] Test from public IP

---

## 📋 Week 2: High Priority Fixes

### Day 6-7: Rate Limiting & Auth Security
**Estimated Time: 4 hours**

- [ ] Install slowapi:
  ```bash
  pip install slowapi
  ```

- [ ] Add rate limiting to auth (SECURITY_PATCHES.md patch #3)

- [ ] Add failed login tracking to User model:
  ```python
  class User(Base):
      # ... existing fields ...
      failed_login_attempts: int = 0
      locked_until: Optional[datetime] = None
  ```

- [ ] Create migration:
  ```bash
  alembic revision --autogenerate -m "Add login security fields"
  alembic upgrade head
  ```

- [ ] Test rate limiting:
  ```bash
  for i in {1..6}; do
    curl -X POST http://localhost:8000/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@test.com","password":"wrong"}'
    sleep 1
  done
  # Should block on 6th attempt
  ```

### Day 8-9: Password Policy & Input Validation
**Estimated Time: 3 hours**

- [ ] Create schemas with validation (SECURITY_PATCHES.md patch #4)

- [ ] Update all Pydantic models to reject extra fields

- [ ] Add max lengths to all string fields

- [ ] Test with invalid inputs:
  ```python
  # Test weak password
  requests.post(
    "http://localhost:8000/api/v1/auth/register",
    json={
      "email": "test@example.com",
      "password": "123456",  # Too weak
      "first_name": "Test",
      "last_name": "User"
    }
  )
  # Should return error
  ```

### Day 10: Webhook Security
**Estimated Time: 2 hours**

- [ ] Add webhook signature verification (SECURITY_PATCHES.md patch #5)

- [ ] Test Paystack webhook verification
- [ ] Log all webhook attempts
- [ ] Create webhook replay test

---

## 📋 Week 3: Medium Priority Fixes

### Day 11-12: Data Encryption
**Estimated Time: 3 hours**

- [ ] Install cryptography:
  ```bash
  pip install cryptography
  ```

- [ ] Create encryption utilities:
  ```python
  from cryptography.fernet import Fernet
  
  class EncryptionService:
      def __init__(self, key: str):
          self.cipher = Fernet(key.encode())
      
      def encrypt(self, data: str) -> str:
          return self.cipher.encrypt(data.encode()).decode()
      
      def decrypt(self, encrypted_data: str) -> str:
          return self.cipher.decrypt(encrypted_data.encode()).decode()
  ```

- [ ] Encrypt sensitive fields:
  - Bank account numbers
  - Phone numbers (masked in logs)
  - API keys stored in DB

- [ ] Create migration to encrypt existing data

### Day 13-14: Cookie Security
**Estimated Time: 2 hours**

- [ ] Update auth endpoints (SECURITY_PATCHES.md patch #7)

- [ ] Test secure cookie:
  ```bash
  curl -v http://localhost:8000/api/v1/auth/login
  # Should see: Set-Cookie with Secure; HttpOnly; SameSite=Strict
  ```

### Day 15: File Upload Security
**Estimated Time: 2 hours**

- [ ] Implement file validation (SECURITY_PATCHES.md patch #8)

- [ ] Test malicious uploads:
  ```bash
  # Try to upload executable
  curl -F "file=@malicious.exe" http://localhost:8000/api/v1/uploads
  # Should be rejected
  ```

- [ ] Virus scan uploads (optional - use ClamAV)

---

## 📋 Week 4: Best Practices & Monitoring

### Day 16-17: Audit Logging
**Estimated Time: 3 hours**

- [ ] Create AuditLog model:
  ```python
  class AuditLog(Base):
      __tablename__ = "audit_logs"
      id: int = Column(Integer, primary_key=True)
      user_id: int = Column(Integer, ForeignKey("users.id"))
      action: str  # login, event_created, payment_received, etc.
      resource_type: str  # user, event, payment
      resource_id: int
      ip_address: str
      user_agent: str
      created_at: datetime = Column(DateTime, default=datetime.utcnow)
  ```

- [ ] Log critical actions:
  - Login/logout
  - Password change
  - Event creation/deletion
  - Payment received
  - Withdrawal requested

- [ ] Test audit log:
  ```sql
  SELECT * FROM audit_logs 
  WHERE user_id = 1 
  ORDER BY created_at DESC 
  LIMIT 10;
  ```

### Day 18: Dependency Security
**Estimated Time: 2 hours**

- [ ] Install security tools:
  ```bash
  pip install safety bandit pip-audit
  ```

- [ ] Run checks:
  ```bash
  safety check
  bandit -r backend/
  pip-audit
  ```

- [ ] Update vulnerable dependencies:
  ```bash
  pip install --upgrade <package-name>
  ```

- [ ] Add to CI/CD pipeline

### Day 19-20: Testing & Documentation
**Estimated Time: 3 hours**

- [ ] Create security test suite
- [ ] Document security procedures
- [ ] Create incident response plan
- [ ] Train team on security practices

---

## 🔒 Post-Implementation Checklist

### Before Production Launch

```bash
#!/bin/bash
# security-check.sh

echo "=== Security Pre-Production Checklist ==="

# 1. Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
grep -r "password" backend/app --include="*.py" | grep -v "hashed_password" | grep -v "password:" && echo "⚠️  Found hardcoded passwords!" || echo "✓ No hardcoded passwords found"

# 2. Check DEBUG mode
echo "Checking DEBUG setting..."
grep "DEBUG.*True" backend/app/core/config.py && echo "⚠️  DEBUG is True!" || echo "✓ DEBUG is False"

# 3. Check SECRET_KEY
echo "Checking SECRET_KEY..."
grep 'SECRET_KEY.*"change-me' backend/app/core/config.py && echo "⚠️  Using default SECRET_KEY!" || echo "✓ Using custom SECRET_KEY"

# 4. Run security linters
echo "Running security checks..."
safety check
bandit -r backend/

# 5. Check for common vulnerabilities
echo "Checking for SQL injection vulnerabilities..."
grep -r "f\"SELECT" backend/app --include="*.py" && echo "⚠️  Found SQL injection risk!" || echo "✓ No SQL injection risks found"

# 6. Verify HTTPS configuration
echo "Checking HTTPS configuration..."
grep "secure=True" backend/app/api/auth.py || echo "⚠️  HTTPS not enforced in cookies!"

echo ""
echo "=== Security Check Complete ==="
```

### Monitoring Setup (First Month)

**Tools to Install:**

1. **Error Tracking**: Sentry
   ```bash
   pip install sentry-sdk
   ```

2. **Performance Monitoring**: Datadog or New Relic
   
3. **Log Aggregation**: CloudWatch, ELK Stack, or Datadog

4. **Alerting**:
   - Failed login attempts spike
   - Rate limit exceeded
   - Error rate above threshold
   - Deployment failures

### Monthly Security Tasks

- [ ] Review dependencies for updates
- [ ] Check security advisories
- [ ] Review audit logs for anomalies
- [ ] Update security documentation
- [ ] Rotate API keys
- [ ] Review CORS whitelist
- [ ] Check SSL certificate expiration

### Quarterly Tasks

- [ ] Penetration testing
- [ ] Code security review
- [ ] Incident response drill
- [ ] Security training update
- [ ] Compliance audit

---

## 📊 Security Scoring Tracker

Track your security improvements:

| Item | Week 1 | Week 2 | Week 3 | Week 4 |
|------|--------|--------|--------|--------|
| SECRET_KEY & DEBUG | ❌ | ✅ | ✅ | ✅ |
| CORS & Headers | ❌ | ✅ | ✅ | ✅ |
| Token Security | ❌ | ✅ | ✅ | ✅ |
| Rate Limiting | ❌ | ❌ | ✅ | ✅ |
| Password Policy | ❌ | ❌ | ✅ | ✅ |
| Input Validation | ❌ | ❌ | ✅ | ✅ |
| Webhook Security | ❌ | ❌ | ✅ | ✅ |
| Data Encryption | ❌ | ❌ | ❌ | ✅ |
| Audit Logging | ❌ | ❌ | ❌ | ✅ |
| Monitoring | ❌ | ❌ | ❌ | ✅ |

---

## 🆘 If Security Issue Found in Production

1. **Assess Severity**: Critical, High, Medium, Low
2. **Contain Damage**: Disable affected features if needed
3. **Patch Immediately**: Use hotfix branch
4. **Notify Users**: If data is affected
5. **Document Incident**: For compliance
6. **Post-Mortem**: Why did it happen?

---

## 📚 Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework/
- CWE/SANS Top 25: https://cwe.mitre.org/top25/

---

**Last Updated**: 2026-06-08
**Status**: Ready for Implementation
**Estimated Total Time**: 4 weeks (20 hours)
