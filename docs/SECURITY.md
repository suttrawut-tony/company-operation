# Security Checklist — Company Operation

## ✅ Done

- [x] **Helmet** — HTTP security headers (CSP, X-Frame-Options, HSTS, nosniff)
- [x] **CORS** — Restrict origins via CORS_ORIGIN env var (not wildcard in production)
- [x] **Rate Limiting** — 100 req/min per IP on all /api/ endpoints
- [x] **Auth on login** — bcrypt password hashing + JWT tokens
- [x] **Auth middleware** — `authenticate` on all API routes
- [x] **Role-based access** — `requireRole()` on sensitive operations
- [x] **Permission check** — `requirePermission()` uses company_modules
- [x] **Project access** — `requireProjectAccess()` with async/await
- [x] **SQL parameterized** — All queries use $1,$2 parameters
- [x] **OData injection fix** — sap-client.js escapes single quotes
- [x] **Self-signed cert control** — SAP_ALLOW_SELFSIGNED env flag
- [x] **UUID sanitization** — Empty/"null" string → null in bookings
- [x] **Status state machine** — Backend validates booking status transitions
- [x] **Body size limit** — 2MB max request body
- [x] **Request logging** — morgan access logs
- [x] **Error handlers** — unhandledRejection + uncaughtException
- [x] **WebSocket auth** — Token verification in production mode
- [x] **Auth guard (nav.js)** — checkAuth() redirects to login on ALL pages

## ⚠️ TODO (Before Production)

- [ ] Set CORS_ORIGIN env var to actual domain (not wildcard)
- [ ] Set JWT_EXPIRES_IN to 1d (currently 7d)
- [ ] Add refresh token mechanism
- [ ] Add token blacklist for logout revocation
- [ ] Set SAP_ALLOW_SELFSIGNED=false in production
- [ ] Add input sanitization (escape HTML in user inputs before DB)
- [ ] Add UUID validation on route params
- [ ] Validate file upload types (multer is installed but not configured)
- [ ] Run `npm audit fix` and update vulnerable packages
- [ ] Set NODE_ENV=production on Railway

## 📋 Recommended (Not Urgent)

- [ ] HttpOnly cookie for JWT instead of localStorage
- [ ] Add CAPTCHA on registration
- [ ] Implement password complexity rules (min 8 chars + number)
- [ ] Add login attempt lockout (5 failed = 15min lock)
- [ ] Database connection pool tuning for Railway
- [ ] Add Sentry/error tracking service
- [ ] Regular dependency audit schedule
