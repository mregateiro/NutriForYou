# NutriForYou — Product Backlog

> **Last updated:** 2025-07-15
> **Product Owner:** NutriForYou Product Team

---

## 1. Product Vision

**For** nutritionists, dietitians, and nutrition clinics **who** need an integrated digital platform to manage patients, consultations, and meal plans, **NutriForYou** is a SaaS nutritionist platform **that** streamlines clinical workflows, leverages AI for meal plan generation, and ensures regulatory compliance (GDPR/HIPAA). **Unlike** fragmented tools (spreadsheets, generic CRMs, paper-based plans), **our product** delivers a purpose-built, all-in-one experience from patient onboarding through treatment delivery, with tiered pricing (Lite, Premium, Business) to serve solo practitioners and multi-provider clinics alike.

---

## 2. MVP Definition

### What constitutes the Minimum Viable Product?

The MVP must allow a nutritionist to **sign up, manage patients, conduct consultations, and deliver meal plans** — the core value loop of the platform. Security and infrastructure foundations are non-negotiable for handling health data.

| Phase | Goal | Target Duration |
|-------|------|-----------------|
| **MVP Phase 1** | Core clinical workflow — sign up → manage patients → consult → deliver meal plans | Sprints 1–4 (~8 weeks) |
| **MVP Phase 2** | Monetisation & engagement — scheduling, billing, subscriptions, basic mobile | Sprints 5–8 (~8 weeks) |
| **Post-MVP** | Growth & differentiation — AI, integrations, marketing, compliance hardening | Ongoing after launch |

---

## 3. Prioritized Backlog

| Priority | # | EPIC | Phase | Justification |
|----------|---|------|-------|---------------|
| **P0** | 20 | Security & Infrastructure | MVP Phase 1 | Foundational — encrypted storage, backups, and audit logs must exist before any patient data is stored. |
| **P0** | 1 | User & Authentication System | MVP Phase 1 | No platform without accounts. Roles gate every downstream feature. |
| **P0** | 2 | Patient Management | MVP Phase 1 | Core domain entity. Every feature depends on having patient records. |
| **P0** | 3 | Consultation Management | MVP Phase 1 | Primary clinical workflow — scheduling & documenting sessions is the central value proposition. |
| **P0** | 5 | AI-Powered Meal Plan Generator | MVP Phase 1 | Key differentiator. Nutritionists expect meal-plan delivery as a basic output of consultations. |
| **P1** | 4 | Agenda & Scheduling | MVP Phase 2 | Needed for self-service booking and calendar management; not blocking initial manual workflows. |
| **P1** | 12 | Subscription & Billing System | MVP Phase 2 | Required to monetise the platform before public launch; can be manual/Stripe-only initially. |
| **P1** | 14 | Accessibility & Compliance | MVP Phase 2 | LGPD/GDPR baseline must ship before public launch with real user data. |
| **P1** | 18 | Mobile Experience | MVP Phase 2 | Patients expect mobile-friendly meal plans; responsive web is sufficient for MVP. |
| **P1** | 6 | Financial Management | MVP Phase 2 | Nutritionists need basic payment tracking; invoicing can be simple at first. |
| **P2** | 8 | Chat & Communication | Post-MVP | Valuable for engagement but email/WhatsApp fills the gap initially. |
| **P2** | 15 | Platform Administration | Post-MVP | Internal tooling — admin dashboards and feature flags become critical at scale. |
| **P2** | 17 | Analytics & Reporting | Post-MVP | Nice-to-have for launch; basic patient progress can be shown in consultation views. |
| **P2** | 9 | Digital Contracts & Signatures | Post-MVP | Important for formalising agreements but not blocking first consultations. |
| **P2** | 21 | Regulatory Compliance (GDPR/HIPAA deep) | Post-MVP | Deep compliance (data residency, DPAs, breach notification) builds on EPIC 14 & 20 foundations. |
| **P2** | 10 | Customization & Branding | Post-MVP | Retention/stickiness feature; not needed for first patients. |
| **P3** | 13 | Support & Helpdesk | Post-MVP | Can start with email support; in-app helpdesk is a growth feature. |
| **P3** | 19 | Integrations | Post-MVP | Google Calendar, WhatsApp, payment gateways — valuable but each is incremental. |
| **P3** | 7 | Content & Studies Module | Post-MVP | Educational value but not core to the clinical workflow. |
| **P3** | 11 | Landing Page / Blog Builder | Post-MVP | Marketing feature; nutritionists can use external tools initially. |
| **P3** | 16 | Marketing & CRM Tools | Post-MVP | Growth-phase feature — email campaigns and segmentation post product-market fit. |

---

## 4. Dependencies

```
EPIC 20 (Security & Infrastructure)
  └──▶ ALL EPICs (foundational: encryption, backups, audit logs)

EPIC 1 (Authentication)
  └──▶ EPIC 2 (Patient Mgmt) ──▶ EPIC 3 (Consultations) ──▶ EPIC 5 (Meal Plans)
  └──▶ EPIC 12 (Subscription & Billing) — roles & plan tiers
  └──▶ EPIC 15 (Platform Admin) — admin role required

EPIC 2 (Patient Management)
  └──▶ EPIC 8 (Chat) — patient identity required
  └──▶ EPIC 9 (Contracts) — patient association
  └──▶ EPIC 17 (Analytics) — patient data for reporting

EPIC 3 (Consultation Management)
  └──▶ EPIC 4 (Agenda & Scheduling) — calendar feeds into consultations
  └──▶ EPIC 5 (Meal Plans) — plans are often created during consultations

EPIC 4 (Agenda & Scheduling)
  └──▶ EPIC 19 (Integrations) — Google Calendar sync

EPIC 6 (Financial Management)
  └──▶ EPIC 19 (Integrations) — Stripe/PagSeguro
  └──▶ EPIC 12 (Subscriptions) — plan-level billing

EPIC 14 (Accessibility & Compliance)
  └──▶ EPIC 21 (Regulatory deep-dive) — GDPR/HIPAA hardening

EPIC 18 (Mobile Experience)
  └──▶ EPIC 5 (Meal Plans) — mobile meal plan view
  └──▶ EPIC 8 (Chat) — mobile messaging
```

### Critical Path (MVP)

```
EPIC 20 ──▶ EPIC 1 ──▶ EPIC 2 ──▶ EPIC 3 ──▶ EPIC 5
                                       │
                                       ▼
                              EPIC 4 (Phase 2)
```

---

## 5. MVP Phase 1 — Detailed User Stories

### EPIC 20 — Security & Infrastructure

> **Sprint allocation:** Sprint 1 (runs in parallel with EPIC 1 setup)

#### Story 20.1 — Encrypted Data Storage

**As an** admin, **I want** all data encrypted at rest and in transit **so that** user information is protected.

**Acceptance Criteria:**
- [ ] All database storage uses AES-256 encryption at rest.
- [ ] All API endpoints enforce TLS 1.2+ (HTTP rejected or redirected).
- [ ] Connection strings, API keys, and secrets stored in a secrets manager (e.g., Azure Key Vault / AWS Secrets Manager) — never in source code or environment files committed to VCS.
- [ ] A security configuration test suite validates encryption settings on every deploy.

**Definition of Done:**
- Encryption at rest verified via cloud provider console/audit.
- Penetration test or automated scan confirms no plaintext data exposure.
- CI pipeline includes a secrets-scanning step that blocks commits containing secrets.

---

#### Story 20.2 — Audit Logging

**As an** admin, **I want** audit logs for all data-access events **so that** I can track system activity and detect unauthorized access.

**Acceptance Criteria:**
- [ ] Every create, read, update, and delete operation on patient data generates an immutable audit log entry.
- [ ] Each log entry records: user ID, action, resource type, resource ID, timestamp (UTC), and source IP.
- [ ] Audit logs are stored in append-only storage, separate from application data.
- [ ] Logs are retained for a minimum of 1 year (configurable).
- [ ] An admin API endpoint allows querying audit logs with filters (user, date range, action type).

**Definition of Done:**
- Audit log entries confirmed for all patient-data CRUD operations.
- Log tampering prevention verified (append-only / write-once storage).
- Admin can retrieve filtered logs via API.

---

#### Story 20.3 — Automated Backups

**As an** admin, **I want** automated backups **so that** data can be recovered in case of failure.

**Acceptance Criteria:**
- [ ] Daily automated backups of all databases and blob storage.
- [ ] Backups encrypted and stored in a separate geographic region.
- [ ] Point-in-time restore capability for the last 30 days.
- [ ] Backup success/failure generates alerts to the ops team.
- [ ] Disaster recovery runbook documented and tested at least once.

**Definition of Done:**
- Backup job runs successfully for 7 consecutive days.
- Restore drill completed from a backup with data integrity verified.
- Alerting confirmed (success and failure paths).

---

### EPIC 1 — User & Authentication System

> **Sprint allocation:** Sprint 1–2

#### Story 1.1 — Nutritionist Account Registration

**As a** nutritionist, **I want to** create an account **so that** I can access the platform.

**Acceptance Criteria:**
- [ ] Registration form collects: full name, email, password, professional license number (optional).
- [ ] Email must be unique; duplicate email returns a clear validation error.
- [ ] Password must meet minimum strength requirements (≥ 8 characters, 1 uppercase, 1 number, 1 special character).
- [ ] Confirmation email sent with a verification link that expires in 24 hours.
- [ ] Account remains inactive until email is verified.
- [ ] Upon verification, user is redirected to an onboarding wizard.

**Definition of Done:**
- End-to-end registration flow works (form → email → verification → dashboard).
- Validation errors render inline on the form.
- Unit tests cover: valid registration, duplicate email, weak password, expired link.
- API returns appropriate HTTP status codes (201 Created, 409 Conflict, 422 Unprocessable).

---

#### Story 1.2 — Email/Password Login

**As a** user, **I want to** log in using email and password **so that** I can securely access my data.

**Acceptance Criteria:**
- [ ] Login form accepts email and password.
- [ ] On success, a JWT access token (short-lived, ≤ 15 min) and a refresh token (HTTP-only cookie) are issued.
- [ ] On failure, a generic "Invalid credentials" message is shown (no email/password enumeration).
- [ ] Account locks after 5 consecutive failed attempts for 15 minutes.
- [ ] Login event is recorded in the audit log (EPIC 20).

**Definition of Done:**
- Successful login grants access to the authenticated dashboard.
- Failed login scenarios tested (wrong password, unverified email, locked account).
- JWT token refresh flow works without requiring re-login.
- Security headers set (Strict-Transport-Security, X-Content-Type-Options, etc.).

---

#### Story 1.3 — Password Reset

**As a** user, **I want to** reset my password **so that** I can recover access if I forget it.

**Acceptance Criteria:**
- [ ] "Forgot password" link on login page.
- [ ] User enters email; system always responds with "If an account exists, a reset link has been sent" (no enumeration).
- [ ] Reset link valid for 1 hour, single-use.
- [ ] New password must meet the same strength requirements as registration.
- [ ] After successful reset, all existing sessions are invalidated.

**Definition of Done:**
- Full reset flow tested end-to-end.
- Expired and reused links return clear error messages.
- Session invalidation confirmed (old tokens rejected).

---

#### Story 1.4 — Role Management

**As an** admin, **I want to** manage user roles (Lite, Premium, Business) **so that** I can control feature access.

**Acceptance Criteria:**
- [ ] Three subscription tiers exist: Lite, Premium, Business.
- [ ] Each tier maps to a set of feature flags (documented in a role-permission matrix).
- [ ] Admin UI allows changing a user's tier.
- [ ] Tier changes take effect immediately; downgrade removes access to premium features but retains data.
- [ ] API endpoints enforce role-based access control (RBAC) via middleware.

**Definition of Done:**
- Role-permission matrix documented and reviewed.
- Middleware rejects requests for features outside the user's tier (403 Forbidden).
- Tier upgrade/downgrade tested with feature access verification.
- Integration tests cover all three tiers.

---

#### Story 1.5 — Team Member Management (Business Plan)

**As a** business account owner, **I want to** add/remove team members **so that** I can manage my clinic staff.

**Acceptance Criteria:**
- [ ] Business-tier accounts can invite team members by email.
- [ ] Invited members receive an activation email to set up their account under the clinic.
- [ ] Owner can assign roles to team members: Nutritionist, Assistant, Billing.
- [ ] Owner can deactivate a team member, immediately revoking access.
- [ ] Team members share patient records within the clinic but cannot access other clinics' data.

**Definition of Done:**
- Invite → accept → access flow works end-to-end.
- Deactivated member confirmed unable to log in or access API.
- Data isolation between clinics verified with integration tests.
- Non-Business-tier users see "Upgrade to Business" prompt when accessing team features.

---

### EPIC 2 — Patient Management

> **Sprint allocation:** Sprint 2–3

#### Story 2.1 — Patient Registration

**As a** nutritionist, **I want to** register new patients **so that** I can manage their consultations.

**Acceptance Criteria:**
- [ ] Registration form collects: full name, date of birth, email, phone, gender, and emergency contact.
- [ ] Patient is associated with the creating nutritionist (or clinic in Business plan).
- [ ] Duplicate detection warns if a patient with the same email or phone already exists.
- [ ] Patient record created with a unique ID visible in the UI.
- [ ] Successful creation redirects to the patient profile.

**Definition of Done:**
- Patient appears in the patient list after creation.
- Duplicate warning tested (same email, same phone).
- Validation errors for required fields tested.
- API: POST /patients returns 201 with patient object.

---

#### Story 2.2 — Patient Profile (Personal Data, Goals, Medical History)

**As a** nutritionist, **I want to** store patient personal data, goals, and medical history **so that** I can personalize treatment.

**Acceptance Criteria:**
- [ ] Profile sections: Demographics, Anthropometrics (weight, height, BMI — auto-calculated), Goals, Allergies/Intolerances, Medical History, Current Medications.
- [ ] All sections are editable with save/cancel controls.
- [ ] Changes to medical-critical fields (allergies, medications) generate an audit log entry.
- [ ] Goals section supports free-text and predefined tags (weight loss, muscle gain, clinical nutrition, etc.).
- [ ] Profile completeness indicator shows percentage filled.

**Definition of Done:**
- All profile sections render and save correctly.
- BMI auto-calculates when weight and height are entered.
- Audit log entries confirmed for allergy/medication changes.
- Responsive layout works on tablet and desktop viewports.

---

#### Story 2.3 — Document Upload

**As a** nutritionist, **I want to** upload documents (labs, reports) **so that** I can reference them during consultations.

**Acceptance Criteria:**
- [ ] Supported formats: PDF, JPG, PNG, DOCX (max 10 MB per file).
- [ ] Files stored in encrypted blob storage (ties to EPIC 20).
- [ ] Each document is tagged with: upload date, document type (Lab, Report, Prescription, Other), and optional notes.
- [ ] Documents listed in reverse-chronological order on the patient profile.
- [ ] Documents can be previewed in-browser (PDF/images) and downloaded.
- [ ] Delete requires confirmation; soft-delete with 30-day recovery.

**Definition of Done:**
- Upload, preview, download, and delete flows tested.
- File size and type validation enforced (client and server).
- Encrypted storage verified.
- Soft-delete and recovery confirmed.

---

#### Story 2.4 — Patient Interaction Timeline

**As a** nutritionist, **I want to** view a timeline of patient interactions **so that** I can track progress.

**Acceptance Criteria:**
- [ ] Timeline aggregates: consultations, document uploads, meal plan deliveries, and profile changes.
- [ ] Each entry shows: date, event type (icon-coded), summary, and link to the full record.
- [ ] Timeline is scrollable and sorted by date (newest first by default, with option to reverse).
- [ ] Filters available by event type and date range.

**Definition of Done:**
- Timeline renders all event types with correct icons.
- Clicking an entry navigates to the source record.
- Filters reduce the displayed entries correctly.
- Empty state shown when no events exist.

---

#### Story 2.5 — Patient Search & Filtering

**As a** nutritionist, **I want to** search and filter patients **so that** I can quickly find records.

**Acceptance Criteria:**
- [ ] Search by name, email, or phone — results appear as-you-type (debounced, ≤ 300ms after last keystroke).
- [ ] Filters: status (Active, Inactive, Archived), date range (registered between), and tags/goals.
- [ ] Results paginated (20 per page) with total count displayed.
- [ ] Sort options: Name (A–Z, Z–A), Last consultation date, Registration date.
- [ ] "No results" state offers to clear filters.

**Definition of Done:**
- Search returns correct results for partial name matches.
- Combined filters (e.g., Active + weight-loss goal) work correctly.
- Pagination controls navigate between pages.
- Performance: search returns results in < 500ms for up to 10,000 patient records.

---

### EPIC 3 — Consultation Management

> **Sprint allocation:** Sprint 3–4

#### Story 3.1 — Schedule a Consultation

**As a** nutritionist, **I want to** schedule consultations **so that** I can organize my agenda.

**Acceptance Criteria:**
- [ ] Consultation creation form collects: patient (searchable dropdown), date, start time, duration (30/45/60 min presets + custom), type (Initial, Follow-up, Online, In-person), and notes.
- [ ] System validates against double-booking (same nutritionist, overlapping time).
- [ ] Confirmation shown with summary; consultation appears on the nutritionist's dashboard.
- [ ] Patient receives an email notification with date, time, and type.
- [ ] Consultation statuses: Scheduled, In-progress, Completed, Cancelled, No-show.

**Definition of Done:**
- Consultation created and visible on dashboard.
- Double-booking prevented with clear error message.
- Patient email notification sent and received (verified in test environment).
- Status transitions tested (Scheduled → In-progress → Completed; Scheduled → Cancelled).

---

#### Story 3.2 — Consultation Notes

**As a** nutritionist, **I want to** create consultation notes **so that** I can document each session.

**Acceptance Criteria:**
- [ ] Rich-text editor for notes (bold, italic, lists, headings).
- [ ] Auto-save every 30 seconds while editing (with "Saved" indicator).
- [ ] Notes linked to the consultation record and visible on the patient timeline (EPIC 2).
- [ ] Notes can be marked as "Draft" or "Finalized"; finalized notes are read-only.
- [ ] Finalized notes include a timestamp and the authoring nutritionist's name.

**Definition of Done:**
- Rich-text formatting persists after save and reload.
- Auto-save confirmed (navigate away and return — content preserved).
- Draft → Finalized transition prevents further editing.
- Notes appear on the patient timeline with correct date and summary.

---

#### Story 3.3 — Consultation Note Templates

**As a** nutritionist, **I want to** reuse templates for consultation notes **so that** I can save time.

**Acceptance Criteria:**
- [ ] Nutritionist can create, edit, and delete note templates.
- [ ] Templates have a name and rich-text body with placeholder tokens (e.g., `{{patient_name}}`, `{{date}}`).
- [ ] When starting a new consultation note, user can select a template; placeholders auto-filled.
- [ ] System provides 3–5 default templates (Initial Consultation, Follow-up, Discharge Summary, etc.).
- [ ] Templates are private per nutritionist (Business plan: optionally shared within clinic).

**Definition of Done:**
- Template CRUD operations work correctly.
- Placeholder substitution verified for all supported tokens.
- Default templates seeded on first login.
- Business plan: clinic-wide template sharing tested.

---

#### Story 3.4 — Consultation File Attachments

**As a** nutritionist, **I want to** attach files to consultations **so that** I can keep everything in one place.

**Acceptance Criteria:**
- [ ] Attach files during or after a consultation (same file rules as EPIC 2, Story 2.3).
- [ ] Attachments listed on the consultation detail page.
- [ ] Attachments also appear on the patient timeline under the consultation entry.
- [ ] Maximum 5 attachments per consultation (configurable).

**Definition of Done:**
- Attach, preview, download flows work from the consultation detail page.
- Attachments visible on the patient timeline.
- Limit enforced with user-friendly error message.

---

#### Story 3.5 — Appointment Reminders

**As a** patient, **I want to** receive reminders **so that** I don't miss appointments.

**Acceptance Criteria:**
- [ ] Email reminders sent at: 24 hours and 1 hour before the appointment.
- [ ] Reminder includes: date, time, type (online/in-person), and nutritionist name.
- [ ] Nutritionist can configure reminder timing (24h, 12h, 1h) per consultation or globally.
- [ ] Patient can unsubscribe from reminders via a link in the email.
- [ ] Reminder delivery status logged (sent, bounced).

**Definition of Done:**
- Reminders received at correct intervals in test environment.
- Unsubscribe link works; subsequent reminders not sent.
- Bounce handling tested; bounced status visible to nutritionist.
- Reminder settings UI tested (global and per-consultation).

---

### EPIC 5 — AI-Powered Meal Plan Generator

> **Sprint allocation:** Sprint 4 (with continued refinement post-MVP)

#### Story 5.1 — AI Meal Plan Generation

**As a** nutritionist, **I want to** generate meal plans using AI **so that** I can save time creating personalized plans.

**Acceptance Criteria:**
- [ ] "Generate Meal Plan" action available from the patient profile or consultation.
- [ ] Input form collects: caloric target, macronutrient ratios, dietary restrictions (vegan, gluten-free, etc.), allergies (auto-populated from patient profile), number of meals per day, and plan duration (1 day, 1 week, 2 weeks).
- [ ] AI generates a structured plan with: meal name, ingredients (with quantities), preparation instructions, and nutritional breakdown per meal.
- [ ] Generation completes in ≤ 30 seconds; a loading state is shown.
- [ ] Generated plan is presented for review before saving.

**Definition of Done:**
- AI generates a valid meal plan for common dietary profiles.
- Allergens from patient profile are excluded from generated plans (verified).
- Loading state and error handling (AI service unavailable) tested.
- Generated plan matches the requested caloric/macro targets within ±5% tolerance.

---

#### Story 5.2 — Customize AI-Generated Plans

**As a** nutritionist, **I want to** customize AI-generated plans **so that** I can adapt them to each patient.

**Acceptance Criteria:**
- [ ] After generation, nutritionist can edit any meal: swap foods, adjust quantities, modify instructions.
- [ ] "Regenerate" button available per meal (re-runs AI for just that meal with updated constraints).
- [ ] Nutritional summary recalculates live as edits are made.
- [ ] Changes tracked so the nutritionist can undo/redo.

**Definition of Done:**
- Edit, regenerate, and undo/redo flows work correctly.
- Nutritional summary updates within 1 second of an edit.
- Partial regeneration sends correct constraints to AI service.

---

#### Story 5.3 — Meal Plan Templates

**As a** nutritionist, **I want to** save meal plan templates **so that** I can reuse them for similar patients.

**Acceptance Criteria:**
- [ ] "Save as Template" action available on any finalized meal plan.
- [ ] Templates have a name, description, and tags (e.g., "1500 kcal", "Vegan", "Post-surgery").
- [ ] Templates listed in a searchable library.
- [ ] Applying a template to a patient creates a copy that can be customized.
- [ ] Business plan: templates can be shared across clinic members.

**Definition of Done:**
- Save, list, search, apply template flows tested.
- Applied template is independent of the original (edits don't propagate).
- Tags filter templates correctly.

---

#### Story 5.4 — Patient Meal Plan View (Mobile-Friendly)

**As a** patient, **I want to** view my meal plan in a mobile-friendly format **so that** I can follow it easily.

**Acceptance Criteria:**
- [ ] Patient receives a unique, secure link (no login required; link expires after plan duration + 7 days).
- [ ] Mobile-responsive layout with day/meal navigation.
- [ ] Each meal shows: name, ingredients, quantities, instructions, and nutritional info.
- [ ] Shopping list auto-generated and available as a separate tab.
- [ ] Patient can mark meals as "completed" (visual tracking).

**Definition of Done:**
- Meal plan renders correctly on mobile (iOS Safari, Android Chrome).
- Secure link works without login; expired link shows clear message.
- Shopping list aggregates ingredients correctly across meals.
- "Completed" status persists across sessions.

---

#### Story 5.5 — Export Meal Plan as PDF

**As a** nutritionist, **I want to** export meal plans as PDF **so that** I can share them externally.

**Acceptance Criteria:**
- [ ] "Export PDF" button on the meal plan detail page.
- [ ] PDF includes: clinic/nutritionist branding (name, logo if uploaded), patient name, plan date range, all meals with nutritional info, and a shopping list.
- [ ] PDF is well-formatted for A4 printing.
- [ ] Export completes in ≤ 10 seconds.

**Definition of Done:**
- PDF opens correctly in major viewers (Chrome, Adobe Reader, Preview).
- Branding elements render when configured; placeholder shown when not.
- Print layout verified (no cut-off content, proper page breaks).
- Export time within SLA.

---

## 6. Release Criteria (MVP Phase 1)

Before Phase 1 can be considered releasable:

- [ ] All P0 user stories pass acceptance criteria and have automated test coverage ≥ 80%.
- [ ] Security audit completed — no Critical or High vulnerabilities open.
- [ ] Performance benchmarks met: API p95 latency < 500ms, page load < 3s on 3G.
- [ ] Accessibility baseline: WCAG 2.1 Level A compliance on all Phase 1 screens.
- [ ] Data backup and restore drill completed successfully.
- [ ] Staging environment mirrors production configuration.
- [ ] Product demo delivered to stakeholders with sign-off.

---

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI meal plan quality insufficient | High | Medium | Use validated nutritional databases; allow full manual override; iterate on prompts. |
| GDPR/HIPAA requirements delay launch | High | Medium | Ship Phase 1 as invite-only beta; full compliance required before public launch. |
| Third-party API rate limits (AI provider) | Medium | Medium | Implement request queuing, caching, and graceful degradation. |
| Team unfamiliar with health-data regulations | Medium | High | Engage compliance consultant early; embed privacy-by-design reviews in sprint ceremonies. |
| Scope creep from stakeholder feature requests | Medium | High | Strict adherence to this backlog; new requests go through formal prioritisation. |

---

## Appendix A — Role-Permission Matrix (Draft)

| Feature | Lite | Premium | Business |
|---------|------|---------|----------|
| Patient Management | Up to 30 patients | Unlimited | Unlimited |
| Consultation Notes | Basic text | Rich text + templates | Rich text + templates + clinic sharing |
| AI Meal Plans | 5/month | Unlimited | Unlimited |
| Document Storage | 500 MB | 5 GB | 25 GB |
| Team Members | — | — | Up to 10 |
| Custom Branding | — | Logo + colors | Full white-label |
| Analytics | — | Basic | Advanced |
| API Access | — | — | Full REST API |

---

*This backlog is a living document. It will be refined every sprint during backlog grooming sessions.*
