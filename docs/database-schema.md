# NutriForYou — Database Schema Design

> **ORM:** Prisma 5.x
> **Database:** PostgreSQL 16.x
> **Version:** 1.0.0

This document contains the complete Prisma schema for the NutriForYou platform, covering all core models across EPICs 1–21.

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Enums](#enums)
3. [Core Models](#core-models)
4. [Indexes & Performance](#indexes--performance)
5. [Data Integrity Rules](#data-integrity-rules)

---

## Schema Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION CLUSTER                          │
│  Account ─── User ─── Session ─── VerificationToken                   │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
┌──────────────────┐ ┌────────────┐ ┌──────────────┐
│ CLINICAL CLUSTER │ │  BUSINESS  │ │  PLATFORM    │
│                  │ │  CLUSTER   │ │  CLUSTER     │
│ Patient          │ │            │ │              │
│ Consultation     │ │ Payment    │ │ Organization │
│ ConsultTemplate  │ │ Invoice    │ │ Subscription │
│ Appointment      │ │ InvoiceItem│ │ FeatureFlag  │
│ AvailabilityRule │ │            │ │ AuditLog     │
│ MealPlan         │ │            │ │ Consent      │
│ MealPlanDay      │ │            │ │ Notification │
│ Meal             │ │            │ │              │
│ FoodItem         │ │            │ │              │
│ MealPlanTemplate │ │            │ │              │
│ Document         │ │            │ │              │
│ Contract         │ │            │ │              │
│ ChatConversation │ │            │ │              │
│ ChatParticipant  │ │            │ │              │
│ ChatMessage      │ │            │ │              │
└──────────────────┘ └────────────┘ └──────────────┘
```

---

## Enums

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ──────────────────────────────────────────────────

enum UserRole {
  ADMIN
  NUTRITIONIST
  PATIENT
}

enum SubscriptionTier {
  TRIAL
  LITE
  PREMIUM
  BUSINESS
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  PAUSED
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELED
  NO_SHOW
}

enum MealPlanStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELED
}

enum ContractStatus {
  DRAFT
  SENT
  SIGNED
  EXPIRED
  REVOKED
}

enum DocumentType {
  LAB_REPORT
  MEDICAL_RECORD
  PRESCRIPTION
  PHOTO
  CONTRACT
  INVOICE
  OTHER
}

enum ConsentPurpose {
  DATA_PROCESSING
  MARKETING
  THIRD_PARTY_SHARING
  HEALTH_DATA_PROCESSING
}

enum AuditAction {
  CREATE
  READ
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  EXPORT
  IMPORT
}

enum NotificationType {
  APPOINTMENT_REMINDER
  APPOINTMENT_CANCELED
  NEW_MESSAGE
  MEAL_PLAN_READY
  PAYMENT_DUE
  PAYMENT_RECEIVED
  CONTRACT_SIGNED
  SYSTEM
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

enum MealType {
  BREAKFAST
  MORNING_SNACK
  LUNCH
  AFTERNOON_SNACK
  DINNER
  EVENING_SNACK
}

enum MessageType {
  TEXT
  FILE
  IMAGE
  SYSTEM
}
```

---

## Core Models

### Authentication & Users (EPIC 1)

```prisma
// ─── NextAuth.js Required Models ────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─── User ───────────────────────────────────────────────────

model User {
  id                String           @id @default(cuid())
  email             String           @unique
  emailVerified     DateTime?
  passwordHash      String?
  name              String?
  firstName         String?
  lastName          String?
  phone             String?
  avatarUrl         String?
  role              UserRole         @default(NUTRITIONIST)
  subscriptionTier  SubscriptionTier @default(TRIAL)
  isActive          Boolean          @default(true)
  organizationId    String?
  timezone          String           @default("UTC")
  locale            String           @default("en")
  lastLoginAt       DateTime?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // Relations
  organization      Organization?    @relation(fields: [organizationId], references: [id])
  accounts          Account[]
  sessions          Session[]
  subscription      Subscription?

  // As Nutritionist
  patients          Patient[]        @relation("NutritionistPatients")
  consultations     Consultation[]   @relation("NutritionistConsultations")
  appointmentsAsNutritionist Appointment[] @relation("NutritionistAppointments")
  mealPlans         MealPlan[]       @relation("NutritionistMealPlans")
  availabilityRules AvailabilityRule[]
  consultationTemplates ConsultationTemplate[]
  mealPlanTemplates MealPlanTemplate[]

  // As Patient
  patientProfile    Patient?         @relation("PatientUser")
  appointmentsAsPatient Appointment[] @relation("PatientAppointments")

  // Shared
  documents         Document[]       @relation("UploadedDocuments")
  contracts         Contract[]       @relation("ContractCreator")
  chatParticipants  ChatParticipant[]
  sentMessages      ChatMessage[]    @relation("MessageSender")
  notifications     Notification[]
  consents          Consent[]
  auditLogs         AuditLog[]
  payments          Payment[]        @relation("PaymentRecorder")

  @@index([email])
  @@index([organizationId])
  @@index([role])
  @@map("users")
}
```

### Organization & Branding (EPICs 1, 10)

```prisma
// ─── Organization (Clinic / Business Account) ──────────────

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  subdomain   String?  @unique
  logoUrl     String?
  primaryColor String? @default("#4F46E5")
  secondaryColor String? @default("#10B981")
  website     String?
  phone       String?
  address     String?
  city        String?
  state       String?
  country     String?  @default("BR")
  postalCode  String?
  taxId       String?
  dataRegion  String   @default("us-east-1") // EU data residency support
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  members     User[]

  @@index([slug])
  @@map("organizations")
}
```

### Patient Management (EPIC 2)

```prisma
// ─── Patient ────────────────────────────────────────────────

model Patient {
  id               String    @id @default(cuid())
  nutritionistId   String
  userId           String?   @unique // Optional: linked when patient creates an account
  firstName        String
  lastName         String
  email            String?
  phone            String?
  dateOfBirth      DateTime?
  gender           String?
  cpf              String?   // Brazilian tax ID — encrypted at app layer
  address          String?
  city             String?
  state            String?
  country          String?   @default("BR")

  // Clinical data
  goals            String?   @db.Text
  medicalHistory   String?   @db.Text  // Encrypted at app layer (PHI)
  allergies        String[]  @default([])
  dietaryRestrictions String[] @default([])
  currentMedications String[] @default([])
  height           Float?    // cm
  weight           Float?    // kg
  targetWeight     Float?    // kg
  activityLevel    String?   // SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE
  notes            String?   @db.Text

  isActive         Boolean   @default(true)
  deletedAt        DateTime? // Soft delete for GDPR
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  nutritionist     User      @relation("NutritionistPatients", fields: [nutritionistId], references: [id])
  user             User?     @relation("PatientUser", fields: [userId], references: [id])
  consultations    Consultation[]
  appointments     Appointment[]
  mealPlans        MealPlan[]
  documents        Document[]
  contracts        Contract[]
  payments         Payment[]
  weightEntries    WeightEntry[]

  @@index([nutritionistId])
  @@index([email])
  @@index([firstName, lastName])
  @@index([createdAt])
  @@map("patients")
}

// ─── Weight Tracking ────────────────────────────────────────

model WeightEntry {
  id        String   @id @default(cuid())
  patientId String
  weight    Float    // kg
  notes     String?
  recordedAt DateTime @default(now())
  createdAt DateTime @default(now())

  patient   Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([patientId, recordedAt])
  @@map("weight_entries")
}
```

### Consultations (EPIC 3)

```prisma
// ─── Consultation ───────────────────────────────────────────

model Consultation {
  id              String    @id @default(cuid())
  patientId       String
  nutritionistId  String
  appointmentId   String?   @unique
  templateId      String?

  // Session data
  title           String?
  chiefComplaint  String?   @db.Text
  notes           String?   @db.Text  // Rich text (HTML/Markdown)
  assessment      String?   @db.Text
  plan            String?   @db.Text
  privateNotes    String?   @db.Text  // Not visible to patient
  duration        Int?      // minutes

  // Measurements taken during consultation
  weight          Float?
  height          Float?
  bmi             Float?
  bodyFat         Float?
  waistCirc       Float?    // cm
  hipCirc         Float?    // cm

  status          String    @default("COMPLETED") // DRAFT, COMPLETED
  scheduledAt     DateTime?
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  patient         Patient   @relation(fields: [patientId], references: [id])
  nutritionist    User      @relation("NutritionistConsultations", fields: [nutritionistId], references: [id])
  appointment     Appointment? @relation(fields: [appointmentId], references: [id])
  template        ConsultationTemplate? @relation(fields: [templateId], references: [id])
  attachments     Document[] @relation("ConsultationDocuments")

  @@index([patientId])
  @@index([nutritionistId])
  @@index([scheduledAt])
  @@index([createdAt])
  @@map("consultations")
}

// ─── Consultation Template ──────────────────────────────────

model ConsultationTemplate {
  id              String   @id @default(cuid())
  nutritionistId  String
  name            String
  description     String?
  content         String   @db.Text  // Template content with placeholders
  isDefault       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  nutritionist    User     @relation(fields: [nutritionistId], references: [id])
  consultations   Consultation[]

  @@index([nutritionistId])
  @@map("consultation_templates")
}
```

### Appointments & Scheduling (EPIC 4)

```prisma
// ─── Appointment ────────────────────────────────────────────

model Appointment {
  id              String            @id @default(cuid())
  nutritionistId  String
  patientId       String
  title           String?
  description     String?
  startsAt        DateTime
  endsAt          DateTime
  status          AppointmentStatus @default(SCHEDULED)
  type            String            @default("IN_PERSON") // IN_PERSON, VIDEO, PHONE
  location        String?
  videoLink       String?
  cancelReason    String?
  reminderSentAt  DateTime?
  googleEventId   String?           // Google Calendar sync (EPIC 19)
  notes           String?           @db.Text
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  nutritionist    User              @relation("NutritionistAppointments", fields: [nutritionistId], references: [id])
  patient         Patient           @relation(fields: [patientId], references: [id])
  patientUser     User?             @relation("PatientAppointments", fields: [patientUserId], references: [id])
  patientUserId   String?
  consultation    Consultation?

  @@index([nutritionistId, startsAt])
  @@index([patientId])
  @@index([status])
  @@index([startsAt])
  @@map("appointments")
}

// ─── Availability Rules ─────────────────────────────────────

model AvailabilityRule {
  id              String    @id @default(cuid())
  nutritionistId  String
  dayOfWeek       DayOfWeek
  startTime       String    // "09:00" (HH:mm format)
  endTime         String    // "17:00"
  slotDuration    Int       @default(60) // minutes
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  nutritionist    User      @relation(fields: [nutritionistId], references: [id])

  @@unique([nutritionistId, dayOfWeek, startTime])
  @@index([nutritionistId])
  @@map("availability_rules")
}

// ─── Time Blocks (blocked/unavailable time) ─────────────────

model TimeBlock {
  id              String   @id @default(cuid())
  nutritionistId  String
  title           String?  @default("Blocked")
  startsAt        DateTime
  endsAt          DateTime
  isRecurring     Boolean  @default(false)
  recurrenceRule  String?  // iCal RRULE format
  createdAt       DateTime @default(now())

  @@index([nutritionistId, startsAt])
  @@map("time_blocks")
}
```

### Meal Plans (EPIC 5)

```prisma
// ─── Meal Plan ──────────────────────────────────────────────

model MealPlan {
  id              String         @id @default(cuid())
  patientId       String
  nutritionistId  String
  title           String
  description     String?        @db.Text
  status          MealPlanStatus @default(DRAFT)
  startDate       DateTime?
  endDate         DateTime?

  // Nutritional targets (daily)
  targetCalories  Int?
  targetProtein   Float?         // grams
  targetCarbs     Float?         // grams
  targetFat       Float?         // grams
  targetFiber     Float?         // grams

  // AI generation metadata
  isAiGenerated   Boolean        @default(false)
  aiPrompt        String?        @db.Text
  aiModel         String?        // e.g., "gpt-4o"

  // Branding
  headerNote      String?        @db.Text
  footerNote      String?        @db.Text

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  patient         Patient        @relation(fields: [patientId], references: [id])
  nutritionist    User           @relation("NutritionistMealPlans", fields: [nutritionistId], references: [id])
  days            MealPlanDay[]

  @@index([patientId])
  @@index([nutritionistId])
  @@index([status])
  @@map("meal_plans")
}

// ─── Meal Plan Day ──────────────────────────────────────────

model MealPlanDay {
  id         String   @id @default(cuid())
  mealPlanId String
  dayNumber  Int      // 1-based (Day 1, Day 2, ...)
  label      String?  // "Monday", "Day 1", custom label
  notes      String?  @db.Text
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  meals      Meal[]

  @@unique([mealPlanId, dayNumber])
  @@index([mealPlanId])
  @@map("meal_plan_days")
}

// ─── Meal ───────────────────────────────────────────────────

model Meal {
  id            String   @id @default(cuid())
  mealPlanDayId String
  type          MealType
  time          String?  // "07:30"
  name          String?  // Custom meal name override
  notes         String?  @db.Text
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  mealPlanDay   MealPlanDay @relation(fields: [mealPlanDayId], references: [id], onDelete: Cascade)
  foodItems     FoodItem[]

  @@index([mealPlanDayId])
  @@map("meals")
}

// ─── Food Item ──────────────────────────────────────────────

model FoodItem {
  id           String  @id @default(cuid())
  mealId       String
  name         String
  quantity     Float
  unit         String  // "g", "ml", "cup", "tbsp", "unit"
  calories     Float?
  protein      Float?  // grams
  carbs        Float?  // grams
  fat          Float?  // grams
  fiber        Float?  // grams
  notes        String?
  alternatives String? // Substitution suggestions
  sortOrder    Int     @default(0)

  meal         Meal    @relation(fields: [mealId], references: [id], onDelete: Cascade)

  @@index([mealId])
  @@map("food_items")
}

// ─── Meal Plan Template ─────────────────────────────────────

model MealPlanTemplate {
  id              String   @id @default(cuid())
  nutritionistId  String
  name            String
  description     String?
  content         Json     // Stores the full meal plan structure as JSON
  tags            String[] @default([])
  isPublic        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  nutritionist    User     @relation(fields: [nutritionistId], references: [id])

  @@index([nutritionistId])
  @@map("meal_plan_templates")
}
```

### Documents & Files (EPIC 2, 3)

```prisma
// ─── Document ───────────────────────────────────────────────

model Document {
  id              String       @id @default(cuid())
  patientId       String?
  uploadedById    String
  consultationId  String?
  type            DocumentType @default(OTHER)
  fileName        String
  fileSize        Int          // bytes
  mimeType        String
  storageKey      String       // S3 object key
  storageUrl      String?      // Pre-signed URL (generated on access)
  description     String?
  isConfidential  Boolean      @default(false)
  deletedAt       DateTime?    // Soft delete
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  patient         Patient?     @relation(fields: [patientId], references: [id])
  uploadedBy      User         @relation("UploadedDocuments", fields: [uploadedById], references: [id])
  consultation    Consultation? @relation("ConsultationDocuments", fields: [consultationId], references: [id])

  @@index([patientId])
  @@index([uploadedById])
  @@index([consultationId])
  @@index([type])
  @@map("documents")
}
```

### Financial (EPIC 6)

```prisma
// ─── Payment ────────────────────────────────────────────────

model Payment {
  id              String        @id @default(cuid())
  patientId       String
  recordedById    String
  invoiceId       String?
  amount          Float         // In the smallest currency unit (cents)
  currency        String        @default("BRL")
  method          String        @default("CASH") // CASH, CREDIT_CARD, DEBIT_CARD, PIX, TRANSFER, STRIPE
  status          PaymentStatus @default(PENDING)
  stripePaymentId String?       @unique
  description     String?
  paidAt          DateTime?
  dueDate         DateTime?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  patient         Patient       @relation(fields: [patientId], references: [id])
  recordedBy      User          @relation("PaymentRecorder", fields: [recordedById], references: [id])
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id])

  @@index([patientId])
  @@index([recordedById])
  @@index([status])
  @@index([dueDate])
  @@map("payments")
}

// ─── Invoice ────────────────────────────────────────────────

model Invoice {
  id              String        @id @default(cuid())
  number          String        @unique // INV-2024-0001
  patientId       String
  nutritionistId  String
  status          InvoiceStatus @default(DRAFT)
  subtotal        Float
  taxRate         Float?        @default(0)
  taxAmount       Float?        @default(0)
  discount        Float?        @default(0)
  total           Float
  currency        String        @default("BRL")
  notes           String?       @db.Text
  issuedAt        DateTime?
  dueDate         DateTime?
  paidAt          DateTime?
  storageKey      String?       // S3 key for generated PDF
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  payments        Payment[]
  items           InvoiceItem[]

  @@index([patientId])
  @@index([nutritionistId])
  @@index([status])
  @@index([number])
  @@map("invoices")
}

// ─── Invoice Item ───────────────────────────────────────────

model InvoiceItem {
  id          String @id @default(cuid())
  invoiceId   String
  description String
  quantity    Int    @default(1)
  unitPrice   Float
  total       Float

  invoice     Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("invoice_items")
}
```

### Chat & Communication (EPIC 8)

```prisma
// ─── Chat Conversation ──────────────────────────────────────

model ChatConversation {
  id          String   @id @default(cuid())
  title       String?
  isGroup     Boolean  @default(false)
  lastMessageAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  participants ChatParticipant[]
  messages     ChatMessage[]

  @@index([lastMessageAt])
  @@map("chat_conversations")
}

// ─── Chat Participant ───────────────────────────────────────

model ChatParticipant {
  id              String   @id @default(cuid())
  conversationId  String
  userId          String
  lastReadAt      DateTime?
  isMuted         Boolean  @default(false)
  joinedAt        DateTime @default(now())

  conversation    ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user            User             @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
  @@index([userId])
  @@map("chat_participants")
}

// ─── Chat Message ───────────────────────────────────────────

model ChatMessage {
  id              String      @id @default(cuid())
  conversationId  String
  senderId        String
  type            MessageType @default(TEXT)
  content         String      @db.Text
  fileUrl         String?
  fileName        String?
  fileMimeType    String?
  isEdited        Boolean     @default(false)
  deletedAt       DateTime?   // Soft delete
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  conversation    ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender          User             @relation("MessageSender", fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@index([senderId])
  @@map("chat_messages")
}
```

### Contracts & Signatures (EPIC 9)

```prisma
// ─── Contract ───────────────────────────────────────────────

model Contract {
  id              String         @id @default(cuid())
  creatorId       String
  patientId       String
  templateId      String?
  title           String
  content         String         @db.Text  // HTML/Markdown contract body
  status          ContractStatus @default(DRAFT)
  signedAt        DateTime?
  signatureData   String?        @db.Text  // Base64 encoded signature image
  signerIp        String?
  signerUserAgent String?
  expiresAt       DateTime?
  storageKey      String?        // S3 key for signed PDF
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Relations
  creator         User           @relation("ContractCreator", fields: [creatorId], references: [id])
  patient         Patient        @relation(fields: [patientId], references: [id])
  template        ContractTemplate? @relation(fields: [templateId], references: [id])

  @@index([creatorId])
  @@index([patientId])
  @@index([status])
  @@map("contracts")
}

// ─── Contract Template ──────────────────────────────────────

model ContractTemplate {
  id          String   @id @default(cuid())
  name        String
  content     String   @db.Text
  variables   String[] @default([]) // Placeholder variable names
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contracts   Contract[]

  @@map("contract_templates")
}
```

### Content & Studies (EPIC 7)

```prisma
// ─── Content Article ────────────────────────────────────────

model ContentArticle {
  id          String   @id @default(cuid())
  authorId    String
  title       String
  slug        String   @unique
  summary     String?  @db.Text
  content     String   @db.Text  // Rich text content
  coverImage  String?
  tags        String[] @default([])
  category    String?
  isPublished Boolean  @default(false)
  publishedAt DateTime?
  viewCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bookmarks   ContentBookmark[]

  @@index([slug])
  @@index([isPublished, publishedAt])
  @@index([category])
  @@map("content_articles")
}

// ─── Content Bookmark ───────────────────────────────────────

model ContentBookmark {
  id        String @id @default(cuid())
  userId    String
  articleId String
  createdAt DateTime @default(now())

  article   ContentArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([userId, articleId])
  @@index([userId])
  @@map("content_bookmarks")
}
```

### Subscriptions & Billing (EPIC 12)

```prisma
// ─── Subscription ───────────────────────────────────────────

model Subscription {
  id                  String             @id @default(cuid())
  userId              String             @unique
  tier                SubscriptionTier   @default(TRIAL)
  status              SubscriptionStatus @default(TRIALING)
  stripeCustomerId    String?            @unique
  stripeSubscriptionId String?           @unique
  stripePriceId       String?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  trialEndsAt         DateTime?
  canceledAt          DateTime?
  cancelReason        String?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  user                User               @relation(fields: [userId], references: [id])

  @@index([status])
  @@index([stripeCustomerId])
  @@map("subscriptions")
}
```

### Notifications (EPICs 3, 4, 8, 18)

```prisma
// ─── Notification ───────────────────────────────────────────

model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType
  title       String
  body        String
  data        Json?            // Additional payload (e.g., appointment ID)
  isRead      Boolean          @default(false)
  readAt      DateTime?
  channel     String           @default("IN_APP") // IN_APP, EMAIL, PUSH, SMS
  sentAt      DateTime?
  createdAt   DateTime         @default(now())

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

### GDPR & Compliance (EPIC 21)

```prisma
// ─── Consent ────────────────────────────────────────────────

model Consent {
  id          String         @id @default(cuid())
  userId      String
  purpose     ConsentPurpose
  version     String         // Consent text version (e.g., "1.0")
  granted     Boolean
  grantedAt   DateTime?
  revokedAt   DateTime?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime       @default(now())

  user        User           @relation(fields: [userId], references: [id])

  // Consent records are immutable — new records supersede old ones
  @@index([userId, purpose])
  @@index([userId, createdAt])
  @@map("consents")
}

// ─── Data Deletion Request ──────────────────────────────────

model DataDeletionRequest {
  id            String   @id @default(cuid())
  userId        String
  status        String   @default("PENDING") // PENDING, PROCESSING, COMPLETED, REJECTED
  reason        String?
  requestedAt   DateTime @default(now())
  processedAt   DateTime?
  completedAt   DateTime?
  processedBy   String?  // Admin who processed the request

  @@index([userId])
  @@index([status])
  @@map("data_deletion_requests")
}
```

### Audit Logging (EPIC 20)

```prisma
// ─── Audit Log ──────────────────────────────────────────────

model AuditLog {
  id          String      @id @default(cuid())
  userId      String?
  action      AuditAction
  entityType  String      // "Patient", "Consultation", "MealPlan", etc.
  entityId    String?
  metadata    Json?       // Changed fields, previous values
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  user        User?       @relation(fields: [userId], references: [id])

  // Audit logs are APPEND-ONLY — no update or delete operations
  @@index([userId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Platform Administration (EPIC 15)

```prisma
// ─── Feature Flag ───────────────────────────────────────────

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique  // e.g., "ai_meal_plans", "chat_module"
  name        String
  description String?
  isEnabled   Boolean  @default(false)
  allowedTiers SubscriptionTier[] @default([])
  metadata    Json?    // Additional config (e.g., rollout percentage)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([key])
  @@map("feature_flags")
}

// ─── System Setting ─────────────────────────────────────────

model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   @db.Text
  type      String   @default("STRING") // STRING, NUMBER, BOOLEAN, JSON
  category  String   @default("general")
  updatedAt DateTime @updatedAt

  @@index([key])
  @@index([category])
  @@map("system_settings")
}
```

### Blog & Landing Page (EPIC 11)

```prisma
// ─── Blog Post ──────────────────────────────────────────────

model BlogPost {
  id              String   @id @default(cuid())
  authorId        String
  organizationId  String?
  title           String
  slug            String
  excerpt         String?  @db.Text
  content         String   @db.Text
  coverImage      String?
  tags            String[] @default([])
  isPublished     Boolean  @default(false)
  publishedAt     DateTime?
  metaTitle       String?  // SEO
  metaDescription String?  // SEO
  viewCount       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, slug])
  @@index([authorId])
  @@index([isPublished, publishedAt])
  @@map("blog_posts")
}
```

### Support & Helpdesk (EPIC 13)

```prisma
// ─── Support Ticket ─────────────────────────────────────────

model SupportTicket {
  id          String   @id @default(cuid())
  userId      String
  assigneeId  String?
  subject     String
  description String   @db.Text
  status      String   @default("OPEN") // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority    String   @default("MEDIUM") // LOW, MEDIUM, HIGH, URGENT
  category    String?
  resolvedAt  DateTime?
  closedAt    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  replies     SupportTicketReply[]

  @@index([userId])
  @@index([assigneeId])
  @@index([status])
  @@map("support_tickets")
}

// ─── Support Ticket Reply ───────────────────────────────────

model SupportTicketReply {
  id        String   @id @default(cuid())
  ticketId  String
  userId    String
  content   String   @db.Text
  isStaff   Boolean  @default(false)
  createdAt DateTime @default(now())

  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, createdAt])
  @@map("support_ticket_replies")
}
```

---

## Indexes & Performance

### Composite Indexes Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| `patients` | `(nutritionistId, createdAt)` | List patients for a nutritionist, sorted by date |
| `appointments` | `(nutritionistId, startsAt)` | Calendar queries for a nutritionist |
| `consultations` | `(patientId, createdAt)` | Patient timeline |
| `meal_plans` | `(patientId, status)` | Active meal plans for a patient |
| `chat_messages` | `(conversationId, createdAt)` | Paginated message history |
| `audit_logs` | `(entityType, entityId)` | Audit trail for a specific entity |
| `notifications` | `(userId, isRead)` | Unread notification count |
| `payments` | `(patientId, dueDate)` | Overdue payment queries |

### Query Optimization Notes

- **Soft deletes:** Queries on patient-facing data should always include `WHERE deletedAt IS NULL`
- **Pagination:** Use cursor-based pagination (Prisma `cursor`) for chat messages and audit logs; offset pagination for tables with filters
- **Full-text search:** PostgreSQL `tsvector` indexes on `patients(firstName, lastName, email)` and `content_articles(title, content)` for search features (EPIC 2, 7)
- **JSON queries:** Use PostgreSQL JSONB operators for querying `metadata` fields in `AuditLog` and `FeatureFlag`

---

## Data Integrity Rules

### Cascade Behaviors

| Parent | Child | On Delete |
|--------|-------|-----------|
| User | Account, Session | CASCADE |
| Patient | WeightEntry | CASCADE |
| MealPlan | MealPlanDay | CASCADE |
| MealPlanDay | Meal | CASCADE |
| Meal | FoodItem | CASCADE |
| ChatConversation | ChatParticipant, ChatMessage | CASCADE |
| Invoice | InvoiceItem | CASCADE |
| SupportTicket | SupportTicketReply | CASCADE |
| Patient | Consultation, Appointment, MealPlan | RESTRICT (prevent orphans) |

### Soft Delete Entities

The following entities use soft deletes (`deletedAt` timestamp) to support GDPR data retention:

- `Patient`
- `Document`
- `ChatMessage`

### Immutable Entities

The following entities are append-only — `UPDATE` and `DELETE` operations are blocked at the service layer:

- `AuditLog` — Security and compliance trail
- `Consent` — GDPR consent history (new records supersede old)

### Business Rules Enforced at Schema Level

1. **Unique constraints** prevent duplicate bookings: `AvailabilityRule(nutritionistId, dayOfWeek, startTime)`
2. **One subscription per user:** `Subscription.userId` has a `@unique` constraint
3. **One patient profile per user:** `Patient.userId` has a `@unique` constraint
4. **One consultation per appointment:** `Consultation.appointmentId` has a `@unique` constraint
5. **Invoice numbers are unique:** `Invoice.number` has a `@unique` constraint
