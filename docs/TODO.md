# TODO — Company Operation

## P0: Security (ก่อน Production)
- [ ] Set CORS_ORIGIN to real domain
- [ ] Reduce JWT expiry to 1d
- [ ] Add HTML sanitization on user inputs
- [ ] Configure multer file upload validation
- [ ] Run npm audit fix
- [ ] Set NODE_ENV=production

## P1: Bugs
- [ ] SAP routes are stubs — hide "Push to SAP" buttons or implement
- [ ] pr-create.html line items CRUD not fully connected
- [ ] doc-detail.html attachment upload not implemented
- [ ] Some alert() still used instead of showToast() in edge cases

## P2: Missing Features
- [ ] Pagination on all list endpoints (?page=1&limit=50)
- [ ] Transaction safety (BEGIN/COMMIT) for multi-step operations
- [ ] Email notification delivery (SMTP config in Settings)
- [ ] Backup/export data feature
- [ ] Approval matrix CRUD in Settings
- [ ] Calendar event sync (Google Calendar integration)

## P3: UX Improvements
- [ ] overview.html, phases.html use prompt() → change to modal
- [ ] projects.html PM dropdown shows only current user → load all users
- [ ] Loading skeletons/spinners during API calls
- [ ] Keyboard shortcuts (Ctrl+S to save, Escape to close)
- [ ] Dark mode toggle

## P4: Nice to Have
- [ ] PWA (Progressive Web App) support
- [ ] Offline mode for field workers
- [ ] Mobile app (React Native/Flutter)
- [ ] Dashboard customization (drag widgets)
- [ ] Report builder / custom queries
- [ ] Multi-language (EN/TH toggle)
- [ ] Audit log viewer page
- [ ] API documentation (Swagger/OpenAPI)
