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

export function buildBlogPost(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: `Blog Post ${id}`,
    slug: `blog-post-${id}`,
    content: 'Blog post content here',
    excerpt: 'A short excerpt',
    category: 'NUTRITION',
    status: 'DRAFT' as const,
    coverImageUrl: null,
    viewCount: 0,
    publishedAt: null,
    authorId: 'test-nutritionist-id',
    author: { id: 'test-nutritionist-id', name: 'Test User' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildLandingPage(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: `Landing Page ${id}`,
    slug: `landing-page-${id}`,
    sections: [{ type: 'hero', title: 'Welcome' }],
    isPublished: false,
    authorId: 'test-nutritionist-id',
    author: { id: 'test-nutritionist-id', name: 'Test User' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildChatConversation(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: null,
    isGroup: false,
    lastMessageAt: null,
    participants: [],
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildChatParticipant(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    conversationId: 'test-conversation-id',
    userId: 'test-user-id',
    lastReadAt: null,
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildChatMessage(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    conversationId: 'test-conversation-id',
    senderId: 'test-user-id',
    type: 'TEXT' as const,
    content: 'Hello, world!',
    fileUrl: null,
    isEdited: false,
    isDeleted: false,
    sender: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildConsent(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    userId: 'test-user-id',
    purpose: 'DATA_PROCESSING' as const,
    granted: true,
    version: '1.0',
    ipAddress: '127.0.0.1',
    grantedAt: new Date(),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildContentArticle(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: `Article ${id}`,
    slug: `article-${id}`,
    content: 'Article content here',
    excerpt: 'A short excerpt',
    category: 'NUTRITION',
    contentType: 'ARTICLE',
    coverImageUrl: null,
    isPublished: false,
    viewCount: 0,
    authorId: 'test-nutritionist-id',
    author: { id: 'test-nutritionist-id', name: 'Test User' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildStudyReference(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: `Study ${id}`,
    journal: 'Journal of Nutrition',
    authors: 'Smith J, Doe A',
    year: 2024,
    doi: `10.1234/${id}`,
    url: `https://doi.org/10.1234/${id}`,
    summary: 'Study summary here',
    addedById: 'test-nutritionist-id',
    addedBy: { id: 'test-nutritionist-id', name: 'Test User' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildCampaign(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    name: `Campaign ${id}`,
    type: 'EMAIL' as const,
    subject: 'Campaign Subject',
    content: 'Campaign content here',
    status: 'DRAFT' as const,
    templateId: null,
    segmentId: null,
    scheduledAt: null,
    sentAt: null,
    authorId: 'test-nutritionist-id',
    author: { id: 'test-nutritionist-id', name: 'Test User' },
    template: null,
    segment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildEmailTemplate(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    name: `Template ${id}`,
    subject: 'Template Subject',
    htmlContent: '<h1>Hello</h1>',
    textContent: 'Hello',
    authorId: 'test-nutritionist-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildContactSegment(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    name: `Segment ${id}`,
    filters: { roles: ['NUTRITIONIST'] },
    count: 10,
    authorId: 'test-nutritionist-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildFeatureFlag(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    key: `feature-${id}`,
    name: `Feature ${id}`,
    description: 'A feature flag',
    isEnabled: true,
    tiers: [] as string[],
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildNotification(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    userId: 'test-user-id',
    type: 'SYSTEM' as const,
    title: `Notification ${id}`,
    message: 'You have a new notification',
    data: null,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildSupportTicket(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    subject: `Support Ticket ${id}`,
    description: 'I need help with something',
    category: 'GENERAL',
    priority: 'MEDIUM' as const,
    status: 'OPEN' as const,
    userId: 'test-user-id',
    assignedTo: null,
    resolvedAt: null,
    closedAt: null,
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    assignee: null,
    replies: [],
    _count: { replies: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildTicketReply(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    ticketId: 'test-ticket-id',
    userId: 'test-user-id',
    message: 'Reply message here',
    isStaff: false,
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildKBArticle(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    title: `KB Article ${id}`,
    slug: `kb-article-${id}`,
    content: 'Knowledge base article content',
    category: 'GETTING_STARTED',
    isPublished: true,
    viewCount: 0,
    authorId: 'test-nutritionist-id',
    author: { id: 'test-nutritionist-id', name: 'Test User' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildOrganization(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    name: `Organization ${id}`,
    slug: `org-${id}`,
    logoUrl: null,
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    website: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postalCode: null,
    taxId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildAuditLog(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    userId: 'test-user-id',
    action: 'CREATE' as const,
    entity: 'User',
    entityId: 'test-entity-id',
    details: null,
    ipAddress: null,
    userAgent: null,
    user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
    createdAt: new Date(),
    ...overrides,
  }
}
