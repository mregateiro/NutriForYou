# NutriForYou — System Architecture Document

> **Version:** 1.0.0
> **Last Updated:** 2025-07-15
> **Status:** Draft

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack & Justifications](#2-tech-stack--justifications)
3. [Project Structure](#3-project-structure)
4. [Database Schema Design](#4-database-schema-design)
5. [API Design](#5-api-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Security Architecture](#7-security-architecture)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

NutriForYou is a multi-tenant SaaS platform for nutritionists to manage patients, consultations, meal plans, billing, and communication. It supports three subscription tiers (Lite, Premium, Business) and three user roles (Admin, Nutritionist, Patient).

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Web Browser  │  │  Mobile PWA  │  │  External (WhatsApp/Cal) │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼─────────────────┼───────────────────────┼─────────────────┘
          │                 │                       │
          ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EDGE / CDN (Vercel / Nginx)                   │
│                     TLS 1.2+ Termination                            │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION (Monolith)                  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    PRESENTATION LAYER                         │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────┐  │  │
│  │  │  App Router  │ │  Server      │ │  Client Components    │  │  │
│  │  │  (Pages)     │ │  Components  │ │  (Interactive UI)     │  │  │
│  │  └─────────────┘ └──────────────┘ └───────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      API LAYER                                │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────┐  │  │
│  │  │  REST API    │ │  NextAuth    │ │  WebSocket Server     │  │  │
│  │  │  Routes      │ │  (Auth.js)   │ │  (Socket.io)          │  │  │
│  │  └─────────────┘ └──────────────┘ └───────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    SERVICE LAYER                               │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐ │  │
│  │  │ Auth   │ │Patient │ │Consult │ │MealPlan│ │  Billing   │ │  │
│  │  │Service │ │Service │ │Service │ │Service │ │  Service   │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘ │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐ │  │
│  │  │ Chat   │ │Calendar│ │Content │ │Contract│ │  Notif.    │ │  │
│  │  │Service │ │Service │ │Service │ │Service │ │  Service   │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    DATA ACCESS LAYER                          │  │
│  │              Prisma ORM — Query Builder & Migrations          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────┬──────────────┬──────────────┬──────────────┬─────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────────┐
│  PostgreSQL  │ │  S3-Compat.  │ │  Redis     │ │  External APIs │
│  (Primary DB)│ │  (Files/Docs)│ │  (Cache +  │ │  ┌───────────┐ │
│              │ │              │ │   Queues)  │ │  │  OpenAI   │ │
│  - Users     │ │  - Lab docs  │ │            │ │  │  Stripe   │ │
│  - Patients  │ │  - Contracts │ │  - Sessions│ │  │  Google   │ │
│  - Consults  │ │  - Meal PDFs │ │  - WS state│ │  │  Calendar │ │
│  - MealPlans │ │  - Avatars   │ │  - Job Q   │ │  │  SendGrid │ │
│  - Payments  │ │  - Exports   │ │            │ │  │  WhatsApp │ │
│  - AuditLogs │ │              │ │            │ │  └───────────┘ │
└──────────────┘ └──────────────┘ └────────────┘ └────────────────┘
```

### 1.2 EPIC-to-Module Mapping

| Module | EPICs Covered | Priority |
|--------|--------------|----------|
| Auth & Users | EPIC 1, 12, 14, 20, 21 | P0 |
| Patient Management | EPIC 2 | P0 |
| Consultations | EPIC 3 | P0 |
| Scheduling / Agenda | EPIC 4, 19 (Google Cal) | P0 |
| Meal Plan Generator | EPIC 5 | P0 |
| Financial / Billing | EPIC 6, 12, 19 (Stripe) | P1 |
| Chat & Communication | EPIC 8, 19 (WhatsApp) | P1 |
| Content & Studies | EPIC 7 | P2 |
| Contracts & Signatures | EPIC 9 | P2 |
| Branding & Customization | EPIC 10 | P2 |
| Landing Page / Blog | EPIC 11 | P2 |
| Support & Helpdesk | EPIC 13 | P2 |
| Admin & Platform Mgmt | EPIC 15 | P1 |
| Marketing & CRM | EPIC 16 | P3 |
| Analytics & Reporting | EPIC 17 | P1 |
| Mobile Experience | EPIC 18 | P1 |
| Security & Infra | EPIC 20 | P0 |
| Regulatory Compliance | EPIC 21 | P0 |

---

## 2. Tech Stack & Justifications

### 2.1 Core Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend** | Next.js (App Router) | 14.x | Server components reduce bundle size; App Router enables layouts, streaming, and server actions. Full-stack in one framework reduces operational complexity. |
| **Language** | TypeScript | 5.x | Type safety across the full stack; catches errors at compile time; improves DX with autocompletion and refactoring support. |
| **UI Framework** | Tailwind CSS + shadcn/ui | 3.x / latest | Utility-first CSS eliminates style conflicts in multi-tenant UI. shadcn/ui provides accessible, customizable components without heavy dependencies. |
| **Database** | PostgreSQL | 16.x | Battle-tested for healthcare/fintech. JSONB for flexible data (meal plans, form schemas). Row-level security. Strong ACID compliance for financial and health data. |
| **ORM** | Prisma | 5.x | Type-safe database access; auto-generated types from schema; declarative migrations; excellent DX with Prisma Studio for debugging. |
| **Authentication** | NextAuth.js (Auth.js) | 5.x | First-class Next.js integration; supports credentials, OAuth, magic links; session management via JWT or database sessions; extensible for RBAC. |
| **Real-time** | Socket.io | 4.x | Reliable WebSocket abstraction with automatic fallback to long-polling; rooms/namespaces for chat channels; scales with Redis adapter. |
| **AI** | OpenAI API | GPT-4o | Best-in-class for meal plan generation from patient context; function calling for structured output; streaming for UX. |
| **Payments** | Stripe | Latest SDK | Industry-standard SaaS billing; supports subscriptions (EPIC 12), invoices (EPIC 6), and one-time charges; PCI DSS compliant. |
| **Object Storage** | S3-Compatible (MinIO dev / AWS S3 prod) | Latest | Stores patient documents, lab reports, signed contracts, exported PDFs. S3 API is universally supported. MinIO for local dev parity. |
| **Cache / Queues** | Redis | 7.x | Session store for Socket.io; caching layer for frequent queries; Bull queue for background jobs (PDF generation, email sends, data exports). |
| **Email** | SendGrid / Resend | Latest | Transactional emails (password reset, appointment reminders, invoices). Template support for EPIC 16 campaigns. |

### 2.2 Development & Operations

| Tool | Purpose |
|------|---------|
| Docker + docker-compose | Local development environment with all services |
| ESLint + Prettier | Code quality and formatting |
| Husky + lint-staged | Pre-commit hooks |
| Vitest + Testing Library | Unit and integration tests |
| Playwright | End-to-end tests |
| GitHub Actions | CI/CD pipeline |
| Prisma Migrate | Database migrations |
| Sentry | Error tracking and performance monitoring |
| Pino | Structured JSON logging |

---

## 3. Project Structure

```
nutrifor-you/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, build
│   │   └── deploy.yml                # Deploy pipeline
│   └── pull_request_template.md
│
├── docker/
│   ├── Dockerfile                    # Production multi-stage build
│   ├── Dockerfile.dev                # Development with hot reload
│   └── nginx.conf                    # Reverse proxy config
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   ├── migrations/                   # Generated migrations
│   └── seed.ts                       # Seed data for development
│
├── public/
│   ├── icons/                        # PWA icons
│   ├── manifest.json                 # PWA manifest
│   └── locales/                      # i18n translation files
│       ├── en/
│       └── pt-BR/
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group (no layout chrome)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/              # Authenticated route group
│   │   │   ├── layout.tsx            # Dashboard shell (sidebar, header)
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   │
│   │   │   ├── patients/
│   │   │   │   ├── page.tsx          # Patient list
│   │   │   │   ├── new/page.tsx      # Create patient
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Patient detail
│   │   │   │       ├── timeline/page.tsx
│   │   │   │       ├── documents/page.tsx
│   │   │   │       ├── meal-plans/page.tsx
│   │   │   │       └── consultations/page.tsx
│   │   │   │
│   │   │   ├── consultations/
│   │   │   │   ├── page.tsx          # Consultation list
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── agenda/
│   │   │   │   ├── page.tsx          # Calendar view
│   │   │   │   └── settings/page.tsx # Availability settings
│   │   │   │
│   │   │   ├── meal-plans/
│   │   │   │   ├── page.tsx          # Meal plan list
│   │   │   │   ├── generate/page.tsx # AI generator
│   │   │   │   ├── templates/page.tsx
│   │   │   │   └── [id]/page.tsx     # Meal plan detail/editor
│   │   │   │
│   │   │   ├── finances/
│   │   │   │   ├── page.tsx          # Financial dashboard
│   │   │   │   ├── payments/page.tsx
│   │   │   │   └── invoices/page.tsx
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx          # Chat list
│   │   │   │   └── [conversationId]/page.tsx
│   │   │   │
│   │   │   ├── content/
│   │   │   │   ├── page.tsx          # Content library
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── contracts/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── templates/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── branding/page.tsx
│   │   │   │   ├── billing/page.tsx
│   │   │   │   ├── team/page.tsx
│   │   │   │   └── integrations/page.tsx
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── admin/                # Admin-only section
│   │   │       ├── users/page.tsx
│   │   │       ├── subscriptions/page.tsx
│   │   │       ├── content/page.tsx
│   │   │       ├── support/page.tsx
│   │   │       └── settings/page.tsx
│   │   │
│   │   ├── (patient-portal)/         # Patient-facing route group
│   │   │   ├── layout.tsx
│   │   │   ├── my-plans/page.tsx
│   │   │   ├── my-appointments/page.tsx
│   │   │   ├── my-documents/page.tsx
│   │   │   └── book/[nutritionistId]/page.tsx
│   │   │
│   │   ├── (public)/                 # Public pages
│   │   │   ├── page.tsx              # Landing page
│   │   │   └── blog/
│   │   │       ├── page.tsx
│   │   │       └── [slug]/page.tsx
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── patients/route.ts
│   │   │   ├── patients/[id]/route.ts
│   │   │   ├── consultations/route.ts
│   │   │   ├── consultations/[id]/route.ts
│   │   │   ├── appointments/route.ts
│   │   │   ├── appointments/[id]/route.ts
│   │   │   ├── meal-plans/route.ts
│   │   │   ├── meal-plans/[id]/route.ts
│   │   │   ├── meal-plans/generate/route.ts
│   │   │   ├── chat/route.ts
│   │   │   ├── finances/
│   │   │   │   ├── payments/route.ts
│   │   │   │   └── invoices/route.ts
│   │   │   ├── contracts/route.ts
│   │   │   ├── content/route.ts
│   │   │   ├── upload/route.ts
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/route.ts
│   │   │   ├── admin/
│   │   │   │   ├── users/route.ts
│   │   │   │   └── settings/route.ts
│   │   │   └── gdpr/
│   │   │       ├── export/route.ts
│   │   │       ├── delete/route.ts
│   │   │       └── consent/route.ts
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── data-table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── breadcrumb.tsx
│   │   ├── patients/
│   │   │   ├── patient-form.tsx
│   │   │   ├── patient-card.tsx
│   │   │   └── patient-timeline.tsx
│   │   ├── consultations/
│   │   ├── meal-plans/
│   │   ├── chat/
│   │   ├── calendar/
│   │   └── charts/
│   │
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── stripe.ts                 # Stripe client
│   │   ├── openai.ts                 # OpenAI client
│   │   ├── s3.ts                     # S3 client
│   │   ├── redis.ts                  # Redis client
│   │   ├── socket.ts                 # Socket.io server setup
│   │   ├── email.ts                  # Email service
│   │   ├── logger.ts                 # Pino logger
│   │   └── utils.ts                  # Shared utilities
│   │
│   ├── services/                     # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── patient.service.ts
│   │   ├── consultation.service.ts
│   │   ├── appointment.service.ts
│   │   ├── meal-plan.service.ts
│   │   ├── billing.service.ts
│   │   ├── chat.service.ts
│   │   ├── contract.service.ts
│   │   ├── content.service.ts
│   │   ├── notification.service.ts
│   │   ├── analytics.service.ts
│   │   ├── gdpr.service.ts
│   │   └── audit.service.ts
│   │
│   ├── hooks/                        # React hooks
│   │   ├── use-auth.ts
│   │   ├── use-patients.ts
│   │   ├── use-chat.ts
│   │   ├── use-calendar.ts
│   │   └── use-debounce.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── patient.ts
│   │   ├── consultation.ts
│   │   ├── meal-plan.ts
│   │   └── enums.ts
│   │
│   ├── validators/                   # Zod schemas for validation
│   │   ├── patient.schema.ts
│   │   ├── consultation.schema.ts
│   │   ├── meal-plan.schema.ts
│   │   ├── appointment.schema.ts
│   │   └── auth.schema.ts
│   │
│   ├── middleware.ts                 # Next.js middleware (auth, RBAC)
│   │
│   └── config/
│       ├── constants.ts
│       ├── navigation.ts
│       └── subscription-plans.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 4. Database Schema Design

### 4.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    Account   │       │      User        │       │  Organization   │
│  (NextAuth)  │──────▶│                  │◀──────│  (Clinic/Team)  │
└──────────────┘       │  id              │       │                 │
                       │  email           │       │  id             │
┌──────────────┐       │  role            │       │  name           │
│   Session    │──────▶│  subscriptionTier│       │  subdomain      │
│  (NextAuth)  │       │  organizationId? │       │  branding       │
└──────────────┘       └────────┬─────────┘       └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────────┐
            │ Patient  │ │Appointmt │ │ AuditLog     │
            │          │ │          │ │              │
            │ id       │ │ id       │ │ id           │
            │ userId   │ │ patientId│ │ userId       │
            │ nutri.Id │ │ nutri.Id │ │ action       │
            │ goals    │ │ startsAt │ │ entity       │
            │ medHist. │ │ status   │ │ timestamp    │
            └────┬─────┘ └──────────┘ └──────────────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
┌────────────┐ ┌─────────┐ ┌──────────────┐
│Consultation│ │MealPlan │ │   Document   │
│            │ │         │ │              │
│ id         │ │ id      │ │ id           │
│ patientId  │ │ patient │ │ patientId    │
│ notes      │ │ nutri.  │ │ type         │
│ templateId │ │ meals[] │ │ url          │
│ attachments│ │ aiGen?  │ │ uploadedBy   │
└────────────┘ └─────────┘ └──────────────┘
```

### 4.2 Core Models Summary

The full Prisma schema is documented in [`database-schema.md`](./database-schema.md). Below is a summary of the core entities and their relationships:

| Model | Description | Key Relations |
|-------|-------------|---------------|
| **User** | All platform users (admins, nutritionists, patients) | → Organization, → Patients, → Appointments |
| **Organization** | Clinic / Business account grouping | → Users (members), → Branding |
| **Patient** | Patient profile managed by a nutritionist | → User (nutritionist), → Consultations, → MealPlans, → Documents |
| **Consultation** | Consultation session with notes and attachments | → Patient, → User (nutritionist), → Template |
| **Appointment** | Scheduled time slot | → Patient, → User (nutritionist) |
| **MealPlan** | AI-generated or manual meal plan | → Patient, → User (nutritionist), → MealPlanDay → Meal → FoodItem |
| **Document** | Uploaded files (labs, reports, contracts) | → Patient, → User (uploader) |
| **Payment** | Payment record linked to invoice | → Patient, → User, → Invoice |
| **Invoice** | Generated invoice | → Payments |
| **ChatConversation / ChatMessage** | Real-time messaging | → Users (participants) |
| **Contract** | Digital agreements | → Patient, → User |
| **Consent** | GDPR consent records | → User |
| **AuditLog** | Immutable action log | → User |
| **Subscription** | User subscription to a plan | → User |
| **FeatureFlag** | Feature toggle management | (standalone) |

---

## 5. API Design

### 5.1 API Conventions

- **Base path:** `/api`
- **Format:** JSON request/response
- **Authentication:** Bearer token (JWT) via `Authorization` header or session cookie
- **Pagination:** `?page=1&limit=20` → response includes `{ data, meta: { total, page, limit, totalPages } }`
- **Filtering:** Query parameters (e.g., `?status=active&search=john`)
- **Sorting:** `?sort=createdAt&order=desc`
- **Errors:** Consistent error envelope `{ error: { code, message, details? } }`
- **Versioning:** URL-based when needed (`/api/v2/...`), not required initially

### 5.2 Core API Routes

#### Authentication (EPIC 1)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/[...nextauth]` | NextAuth handler (login, callback, signout) | Public |
| POST | `/api/auth/forgot-password` | Request password reset | Public |
| POST | `/api/auth/reset-password` | Reset password with token | Public |

#### Users & Teams (EPIC 1)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/users/me` | Get current user profile | User |
| PATCH | `/api/users/me` | Update profile | User |
| GET | `/api/users` | List users (admin) | Admin |
| PATCH | `/api/users/[id]/role` | Update user role | Admin |
| POST | `/api/organizations/[id]/members` | Add team member | Business Owner |
| DELETE | `/api/organizations/[id]/members/[userId]` | Remove team member | Business Owner |

#### Patients (EPIC 2)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/patients` | List nutritionist's patients | Nutritionist |
| POST | `/api/patients` | Register new patient | Nutritionist |
| GET | `/api/patients/[id]` | Get patient detail | Nutritionist, Patient (self) |
| PATCH | `/api/patients/[id]` | Update patient data | Nutritionist |
| DELETE | `/api/patients/[id]` | Soft-delete patient | Nutritionist |
| GET | `/api/patients/[id]/timeline` | Get patient interaction timeline | Nutritionist |
| GET | `/api/patients/[id]/documents` | List patient documents | Nutritionist |
| POST | `/api/patients/[id]/documents` | Upload document | Nutritionist |

#### Consultations (EPIC 3)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/consultations` | List consultations | Nutritionist |
| POST | `/api/consultations` | Create consultation | Nutritionist |
| GET | `/api/consultations/[id]` | Get consultation detail | Nutritionist |
| PATCH | `/api/consultations/[id]` | Update notes/data | Nutritionist |
| DELETE | `/api/consultations/[id]` | Delete consultation | Nutritionist |
| GET | `/api/consultation-templates` | List note templates | Nutritionist |
| POST | `/api/consultation-templates` | Create template | Nutritionist |

#### Appointments & Scheduling (EPIC 4)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/appointments` | List appointments (calendar data) | Nutritionist |
| POST | `/api/appointments` | Create appointment | Nutritionist, Patient |
| GET | `/api/appointments/[id]` | Get appointment detail | Nutritionist, Patient |
| PATCH | `/api/appointments/[id]` | Update/reschedule | Nutritionist, Patient |
| PATCH | `/api/appointments/[id]/cancel` | Cancel appointment | Nutritionist, Patient |
| GET | `/api/availability/[nutritionistId]` | Get available slots | Public |
| PUT | `/api/availability` | Set availability rules | Nutritionist |
| POST | `/api/availability/blocks` | Block time slots | Nutritionist |

#### Meal Plans (EPIC 5)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/meal-plans` | List meal plans | Nutritionist |
| POST | `/api/meal-plans` | Create meal plan (manual) | Nutritionist |
| POST | `/api/meal-plans/generate` | Generate meal plan with AI | Nutritionist |
| GET | `/api/meal-plans/[id]` | Get meal plan detail | Nutritionist, Patient |
| PATCH | `/api/meal-plans/[id]` | Update meal plan | Nutritionist |
| DELETE | `/api/meal-plans/[id]` | Delete meal plan | Nutritionist |
| GET | `/api/meal-plans/[id]/pdf` | Export as PDF | Nutritionist, Patient |
| GET | `/api/meal-plan-templates` | List templates | Nutritionist |
| POST | `/api/meal-plan-templates` | Save as template | Nutritionist |

#### Financial (EPIC 6)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/payments` | List payments | Nutritionist |
| POST | `/api/payments` | Register payment | Nutritionist |
| GET | `/api/invoices` | List invoices | Nutritionist |
| POST | `/api/invoices` | Generate invoice | Nutritionist |
| GET | `/api/invoices/[id]/pdf` | Download invoice PDF | Nutritionist, Patient |
| GET | `/api/finances/dashboard` | Financial dashboard data | Nutritionist |
| POST | `/api/webhooks/stripe` | Stripe webhook handler | Stripe (webhook signature) |

#### Chat (EPIC 8)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/chat/conversations` | List conversations | User |
| POST | `/api/chat/conversations` | Create conversation | User |
| GET | `/api/chat/conversations/[id]/messages` | Get messages (paginated) | User |
| POST | `/api/chat/conversations/[id]/messages` | Send message (REST fallback) | User |
| POST | `/api/chat/broadcast` | Broadcast message | Nutritionist |

> **Note:** Real-time messaging uses Socket.io events (`message:send`, `message:received`, `typing:start`, `typing:stop`). REST endpoints serve as fallback and for history retrieval.

#### GDPR / Compliance (EPIC 21)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/gdpr/consent` | Record consent | User |
| DELETE | `/api/gdpr/consent/[id]` | Withdraw consent | User |
| GET | `/api/gdpr/consent` | Get consent records | User |
| POST | `/api/gdpr/export` | Request data export (Art. 15) | User |
| POST | `/api/gdpr/delete` | Request data deletion (Art. 17) | User |

#### Admin (EPIC 15)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/admin/dashboard` | Platform metrics | Admin |
| GET | `/api/admin/users` | List all users | Admin |
| GET | `/api/admin/feature-flags` | List feature flags | Admin |
| PATCH | `/api/admin/feature-flags/[id]` | Toggle feature flag | Admin |
| GET | `/api/admin/audit-logs` | Query audit logs | Admin |
| GET | `/api/admin/subscriptions` | Subscription overview | Admin |

### 5.3 WebSocket Events (Chat — EPIC 8)

```
Client → Server:
  conversation:join     { conversationId }
  conversation:leave    { conversationId }
  message:send          { conversationId, content, attachments? }
  typing:start          { conversationId }
  typing:stop           { conversationId }

Server → Client:
  message:received      { message }
  message:delivered      { messageId, deliveredAt }
  message:read           { messageId, readAt }
  typing:update          { conversationId, userId, isTyping }
  notification:new       { type, payload }
```

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Client  │────▶│  NextAuth.js │────▶│  Credentials │────▶│ Database │
│          │     │  Middleware   │     │  Provider    │     │ (bcrypt) │
│          │     │              │     │  + OAuth     │     │          │
│          │◀────│  JWT / Session│◀────│  Callback    │◀────│  User    │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

**Supported Providers:**
- Email + Password (credentials provider with bcrypt hashing)
- Google OAuth (future)
- Magic link via email (future)

**Session Strategy:** JWT stored in HTTP-only, Secure, SameSite=Strict cookie. JWT payload includes `userId`, `role`, `organizationId`, and `subscriptionTier`.

### 6.2 Role-Based Access Control (RBAC)

Three primary roles with hierarchical permissions:

```
ADMIN
  └── Full platform access
  └── Manage users, subscriptions, feature flags
  └── View audit logs and platform analytics
  └── Manage content library and support tickets

NUTRITIONIST
  └── Manage own patients
  └── Create consultations, meal plans, appointments
  └── Access financial tools (own data only)
  └── Chat with patients
  └── Customize branding (Premium/Business)
  └── Manage team (Business only)

PATIENT
  └── View own meal plans and documents
  └── Book appointments
  └── Chat with nutritionist
  └── Sign contracts
  └── Request data export/deletion (GDPR)
```

### 6.3 Authorization Middleware

```typescript
// Middleware chain applied to all /api and dashboard routes
// 1. Authentication check (is the user logged in?)
// 2. Role check (does the user have the required role?)
// 3. Resource ownership check (does the user own this resource?)
// 4. Subscription tier check (does the user's plan include this feature?)

// Example: /api/patients/[id] PATCH
// → requireAuth()
// → requireRole(['NUTRITIONIST'])
// → requireOwnership('patient', 'nutritionistId')
// → requireSubscription(['LITE', 'PREMIUM', 'BUSINESS'])
```

### 6.4 Subscription Tier Gating

| Feature | Lite | Premium | Business |
|---------|------|---------|----------|
| Max Patients | 30 | Unlimited | Unlimited |
| Consultations | ✓ | ✓ | ✓ |
| AI Meal Plans | 10/month | Unlimited | Unlimited |
| Chat | ✗ | ✓ | ✓ |
| Financial Tools | Basic | Full | Full |
| Branding | ✗ | ✓ | ✓ |
| Team Members | 1 | 1 | Up to 10 |
| Landing Page | ✗ | ✗ | ✓ |
| API Access | ✗ | ✗ | ✓ |

---

## 7. Security Architecture

### 7.1 Data Protection

| Layer | Mechanism | Details |
|-------|-----------|---------|
| **In Transit** | TLS 1.2+ | All HTTP traffic encrypted. HSTS headers enforced. |
| **At Rest** | AES-256 | PostgreSQL Transparent Data Encryption. S3 server-side encryption (SSE-S3). |
| **Passwords** | bcrypt | Cost factor 12. Passwords never stored in plaintext. |
| **Secrets** | Environment variables | No secrets in code. `.env` files excluded from git. Production uses secret manager. |
| **PHI Fields** | Application-level encryption | Sensitive patient health data encrypted at the application layer before database storage using AES-256-GCM with per-tenant keys. |
| **API Keys** | Hashed storage | Third-party API keys stored as hashed values; decrypted only in memory. |

### 7.2 Application Security

```
Request Flow with Security Controls:

Client Request
    │
    ▼
┌─────────────────────────────────────────┐
│           Rate Limiting                 │
│  (Redis-backed, per IP + per user)      │
│  - Auth endpoints: 5 req/min            │
│  - API endpoints: 100 req/min           │
│  - AI generation: 10 req/hour           │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│           Input Validation              │
│  (Zod schemas on every endpoint)        │
│  - Request body validation              │
│  - Query parameter sanitization         │
│  - File upload type/size checks         │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│           CSRF Protection               │
│  (SameSite cookies + CSRF tokens)       │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│           Authentication                │
│  (NextAuth JWT verification)            │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│           Authorization                 │
│  (Role + ownership + tier checks)       │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│           Audit Logging                 │
│  (Every state mutation logged)          │
└─────────────────┬───────────────────────┘
                  ▼
            Business Logic
```

### 7.3 Audit Logging (EPIC 20)

Every state-changing operation is logged to the `AuditLog` table:

```
{
  id:          UUID
  userId:      UUID (who performed the action)
  action:      "CREATE" | "UPDATE" | "DELETE" | "ACCESS" | "EXPORT" | "LOGIN"
  entityType:  "Patient" | "Consultation" | "MealPlan" | ...
  entityId:    UUID (the affected resource)
  metadata:    JSON (changed fields, IP address, user agent)
  ipAddress:   string
  userAgent:   string
  createdAt:   timestamp
}
```

- Audit logs are **append-only** (no updates or deletes allowed)
- Retained for **minimum 6 years** (HIPAA requirement)
- Anonymized after patient data deletion (GDPR Art. 17)

### 7.4 GDPR & HIPAA Compliance (EPICs 14, 21)

| Requirement | Implementation |
|-------------|---------------|
| **Consent Management** | Explicit consent recorded with timestamp, purpose, and version. Withdrawal triggers access revocation. |
| **Right to Access (Art. 15)** | `/api/gdpr/export` generates a ZIP with JSON/CSV/PDF of all user data. Async job via Bull queue. |
| **Right to Erasure (Art. 17)** | `/api/gdpr/delete` soft-deletes immediately, full purge after retention period. Audit logs anonymized. |
| **Data Minimization** | Schema enforces only required fields. Optional fields clearly marked. Analytics uses pseudonymized data. |
| **PHI Protection** | RBAC with least privilege. All PHI access logged. Encryption at rest and in transit. |
| **Breach Detection** | Anomalous access pattern alerts (e.g., bulk data access, unusual hours). Incident response workflow. |
| **Data Residency** | Configurable per organization. EU organizations' data stays in EU regions. |

### 7.5 Security Headers

```typescript
// next.config.js security headers
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; ...",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}
```

---

## 8. Deployment Architecture

### 8.1 Development Environment

```yaml
# docker-compose.yml (development)
services:
  app:
    build: ./docker/Dockerfile.dev
    ports: ["3000:3000"]
    volumes: ["./src:/app/src"]        # Hot reload
    env_file: .env
    depends_on: [db, redis, minio]

  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: nutriforyou
      POSTGRES_USER: nutrify
      POSTGRES_PASSWORD: dev_password

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]   # API + Console
    command: server /data --console-address ":9001"
    volumes: ["miniodata:/data"]

  mailpit:
    image: axllent/mailpit              # Local email testing
    ports: ["1025:1025", "8025:8025"]

volumes:
  pgdata:
  miniodata:
```

### 8.2 Production Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
│                                                                  │
│  ┌─────────────┐    ┌──────────────────────────────────────┐    │
│  │  CDN / Edge │    │         Load Balancer (Nginx)        │    │
│  │  (Static)   │    │    SSL Termination + Rate Limiting   │    │
│  └─────────────┘    └────────────┬───────────────────────  ┘    │
│                                  │                               │
│                     ┌────────────┴────────────┐                  │
│                     ▼                         ▼                  │
│              ┌─────────────┐          ┌─────────────┐           │
│              │  App Node 1 │          │  App Node 2 │           │
│              │  (Next.js)  │          │  (Next.js)  │           │
│              └──────┬──────┘          └──────┬──────┘           │
│                     │                        │                   │
│              ┌──────┴────────────────────────┴──────┐           │
│              │         Shared Services               │           │
│              │                                       │           │
│              │  ┌──────────┐  ┌───────┐  ┌────────┐│           │
│              │  │PostgreSQL│  │ Redis │  │  S3    ││           │
│              │  │ Primary  │  │Cluster│  │Bucket  ││           │
│              │  │+ Replica │  │       │  │        ││           │
│              │  └──────────┘  └───────┘  └────────┘│           │
│              └───────────────────────────────────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Background Workers                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │
│  │  │PDF Gen.  │ │Email     │ │Data      │ │Scheduled  │  │    │
│  │  │Worker    │ │Worker    │ │Export    │ │Cleanup    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Monitoring                             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐    │    │
│  │  │  Sentry  │ │  Pino    │ │  Health Check        │    │    │
│  │  │  (Errors)│ │  (Logs)  │ │  (/api/health)       │    │    │
│  │  └──────────┘ └──────────┘ └──────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 Production Docker Setup

```dockerfile
# docker/Dockerfile (multi-stage production build)
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### 8.4 Environment Variables

```bash
# .env.example
# ─── App ───
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Database ───
DATABASE_URL=postgresql://nutrify:dev_password@localhost:5432/nutriforyou

# ─── Auth ───
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-strong-secret-here

# ─── Redis ───
REDIS_URL=redis://localhost:6379

# ─── S3 Storage ───
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=nutriforyou
S3_REGION=us-east-1

# ─── OpenAI ───
OPENAI_API_KEY=sk-...

# ─── Stripe ───
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ─── Email ───
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@nutrifor.you

# ─── Google Calendar (EPIC 19) ───
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── Encryption ───
ENCRYPTION_KEY=32-byte-hex-key-for-phi-encryption
```

### 8.5 CI/CD Pipeline

```
Push to Branch
    │
    ▼
┌─────────────────────┐
│  GitHub Actions CI   │
│  1. Install deps     │
│  2. Lint (ESLint)    │
│  3. Type check (tsc) │
│  4. Unit tests       │
│  5. Build            │
│  6. Integration tests│
└──────────┬──────────┘
           │
    ▼ (on merge to main)
┌─────────────────────┐
│  Deploy Pipeline     │
│  1. Build Docker img │
│  2. Run migrations   │
│  3. Deploy to staging│
│  4. E2E tests        │
│  5. Deploy to prod   │
│  6. Health check     │
└─────────────────────┘
```

### 8.6 Backup Strategy (EPIC 20)

| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| PostgreSQL | Daily full + continuous WAL | 30 days | pg_dump + WAL archiving |
| S3 Objects | Versioning enabled | 90 days | S3 versioning + lifecycle rules |
| Redis | RDB snapshots | 7 days | Redis persistence |
| Audit Logs | Continuous + archive | 6 years (HIPAA) | Separate archive storage |

---

## Appendices

### A. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Monolith-first** | Reduces complexity for an early-stage SaaS. Can extract microservices later (chat, AI, billing) when scale demands. |
| **App Router over Pages Router** | Server Components reduce client bundle size. Layouts enable shared UI shells. Streaming improves perceived performance. |
| **Prisma over raw SQL** | Type-safe queries, auto-generated types, declarative migrations. Trade-off: slightly less flexible for complex queries (mitigated by `$queryRaw`). |
| **JWT over Database Sessions** | Stateless auth reduces DB load per request. Trade-off: harder to invalidate (mitigated by short expiry + refresh tokens). |
| **Socket.io over native WS** | Automatic reconnection, room management, Redis adapter for horizontal scaling, fallback to long-polling. |
| **Bull queues for background jobs** | PDF generation, data exports, and email sends should not block HTTP responses. Redis-backed Bull provides reliable job processing. |

### B. Future Considerations

- **Microservice extraction:** Chat service and AI meal plan generation are prime candidates for extraction when traffic grows.
- **GraphQL:** Consider for the patient portal if query flexibility becomes a bottleneck.
- **Multi-region deployment:** Required for EPIC 21 (EU data residency). Use database replicas in EU regions.
- **Mobile app:** EPIC 18 starts as PWA; native app (React Native) can be considered for push notifications and offline support.
