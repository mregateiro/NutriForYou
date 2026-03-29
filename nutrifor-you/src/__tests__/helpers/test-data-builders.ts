/**
 * Test data builders for NutriForYou entities.
 * Uses builder pattern for flexible test data creation.
 */

let idCounter = 0
function nextId() {
  idCounter++
  return `test-id-${idCounter}`
}

// Reset counter between test runs
export function resetIdCounter() {
  idCounter = 0
}

export function buildUser(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    email: `user-${id}@example.com`,
    name: `Test User ${id}`,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2a$12$hashedpassword',
    role: 'NUTRITIONIST' as const,
    subscriptionTier: 'PREMIUM' as const,
    isActive: true,
    organizationId: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildPatient(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    firstName: 'John',
    lastName: 'Doe',
    email: `patient-${id}@example.com`,
    phone: '+5511999999999',
    dateOfBirth: new Date('1990-01-15'),
    gender: 'MALE',
    cpf: null,
    address: null,
    city: null,
    state: null,
    country: 'BR',
    goals: null,
    medicalHistory: null,
    allergies: [],
    dietaryRestrictions: [],
    currentMedications: [],
    height: 175,
    weight: 80,
    targetWeight: 75,
    activityLevel: 'MODERATE',
    notes: null,
    isActive: true,
    deletedAt: null,
    nutritionistId: 'test-nutritionist-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildConsultation(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: 'Initial Consultation',
    patientId: 'test-patient-id',
    nutritionistId: 'test-nutritionist-id',
    status: 'COMPLETED',
    chiefComplaint: 'Weight loss',
    notes: 'Patient wants to lose 5kg',
    assessment: 'BMI slightly elevated',
    plan: 'Reduce caloric intake',
    privateNotes: null,
    duration: 60,
    weight: 80,
    height: 175,
    bmi: 26.12,
    bodyFat: null,
    waistCircumference: null,
    hipCircumference: null,
    scheduledAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildMealPlan(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: 'Weight Loss Plan',
    description: 'A balanced weight loss meal plan',
    patientId: 'test-patient-id',
    nutritionistId: 'test-nutritionist-id',
    status: 'DRAFT' as const,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 86400000),
    totalCalories: 2000,
    totalProtein: 150,
    totalCarbs: 200,
    totalFat: 70,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    days: [],
    ...overrides,
  }
}

export function buildMealPlanDay(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    mealPlanId: 'test-meal-plan-id',
    dayOfWeek: 'MONDAY' as const,
    date: null,
    notes: null,
    meals: [],
    ...overrides,
  }
}

export function buildMeal(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    dayId: 'test-day-id',
    mealType: 'BREAKFAST' as const,
    name: 'Breakfast',
    time: '08:00',
    notes: null,
    foodItems: [],
    ...overrides,
  }
}

export function buildFoodItem(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    mealId: 'test-meal-id',
    name: 'Oatmeal',
    quantity: 100,
    unit: 'g',
    calories: 389,
    protein: 16.9,
    carbs: 66.3,
    fat: 6.9,
    fiber: 10.6,
    notes: null,
    ...overrides,
  }
}

export function buildAppointment(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    patientId: 'test-patient-id',
    nutritionistId: 'test-nutritionist-id',
    title: 'Follow-up Appointment',
    status: 'SCHEDULED' as const,
    startTime: new Date(Date.now() + 86400000),
    endTime: new Date(Date.now() + 86400000 + 3600000),
    duration: 60,
    type: 'IN_PERSON',
    location: null,
    notes: null,
    reminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildSubscription(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    userId: 'test-user-id',
    tier: 'PREMIUM' as const,
    status: 'ACTIVE' as const,
    billingCycle: 'MONTHLY',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    trialEndsAt: null,
    canceledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildPayment(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    patientId: 'test-patient-id',
    recordedById: 'test-nutritionist-id',
    amount: 150.00,
    currency: 'EUR',
    status: 'COMPLETED' as const,
    method: 'CREDIT_CARD',
    description: 'Consultation fee',
    transactionId: null,
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildContract(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: 'Nutritional Service Agreement',
    content: 'Terms and conditions...',
    patientId: 'test-patient-id',
    nutritionistId: 'test-nutritionist-id',
    status: 'DRAFT' as const,
    signedAt: null,
    signatureData: null,
    expiresAt: new Date(Date.now() + 365 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildConsultationTemplate(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    name: 'Initial Assessment Template',
    description: 'Template for initial patient assessments',
    content: 'Patient Name: {{patient_name}}\nDate: {{date}}\nComplaint: \nAssessment: \nPlan: ',
    isDefault: false,
    nutritionistId: 'test-nutritionist-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildInvoice(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    invoiceNumber: `INV-${Date.now()}`,
    patientId: 'test-patient-id',
    userId: 'test-nutritionist-id',
    status: 'PENDING' as const,
    subtotal: 150.00,
    tax: 0,
    total: 150.00,
    currency: 'EUR',
    dueDate: new Date(Date.now() + 30 * 86400000),
    paidAt: null,
    notes: null,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildAvailabilityRule(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    nutritionistId: 'test-nutritionist-id',
    dayOfWeek: 'MONDAY' as const,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 60,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
