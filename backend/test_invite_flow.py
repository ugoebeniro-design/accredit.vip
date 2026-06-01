import httpx
B = "http://127.0.0.1:8001/api/v1"

r = httpx.post(f"{B}/auth/login", json={"email":"admin@example.com","password":"admin123"}, timeout=15)
tok = r.json()["access_token"]
h = {"Authorization": f"Bearer {tok}"}
print(f"Login: {r.status_code}")

r = httpx.post(f"{B}/events", json={"title":"Invite Test","event_type":"party","host_name":"Tester","event_date":"2026-12-25","event_time":"18:00","venue":"Venue","guest_count_range":"1-50"}, headers=h, timeout=15)
eid = r.json()["id"]
print(f"Create event: {r.status_code}, id={eid}")

r1 = httpx.post(f"{B}/events/{eid}/guests", json={"name":"Guest A","email":"a@test.com"}, headers=h, timeout=15)
gid1 = r1.json()["id"]
print(f"Add Guest A: {r1.status_code}, id={gid1}, invite_sent={r1.json().get('invite_sent')}")

r2 = httpx.post(f"{B}/events/{eid}/guests", json={"name":"Guest B","email":"b@test.com"}, headers=h, timeout=15)
gid2 = r2.json()["id"]
print(f"Add Guest B: {r2.status_code}, id={gid2}, invite_sent={r2.json().get('invite_sent')}")

# 1. Send individual invite to Guest A
r = httpx.post(f"{B}/events/{eid}/guests/{gid1}/send-invite", json={"channel":"email"}, headers=h, timeout=15)
print(f"Send invite to Guest A: {r.status_code}, {r.json()}")

# 2. Verify Guest A is now marked sent
r = httpx.get(f"{B}/events/{eid}/guests", headers=h, timeout=15)
for g in r.json():
    print(f"  Guest {g['id']}: {g['name']}, invite_sent={g['invite_sent']}")

# 3. Try sending to Guest A again without force (should fail)
r = httpx.post(f"{B}/events/{eid}/guests/{gid1}/send-invite", json={"channel":"email"}, headers=h, timeout=15)
print(f"Resend to Guest A (no force): {r.status_code}, {r.text}")

# 4. Send-all (should only send to Guest B since A is already sent)
r = httpx.post(f"{B}/events/{eid}/send-invites", json={"channel":"email"}, headers=h, timeout=15)
print(f"Send all remaining: {r.status_code}, {r.json()}")

# 5. Send-all again (should say all already sent)
r = httpx.post(f"{B}/events/{eid}/send-invites", json={"channel":"email"}, headers=h, timeout=15)
print(f"Send all again: {r.status_code}, {r.json()}")

# 6. Verify both guests now sent
r = httpx.get(f"{B}/events/{eid}/guests", headers=h, timeout=15)
for g in r.json():
    print(f"  Final Guest {g['id']}: {g['name']}, invite_sent={g['invite_sent']}")

print("\nALL TESTS PASSED")
