import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/validators/auth.schema'
import {
  createPatientSchema,
  updatePatientSchema,
  searchPatientsSchema,
} from '@/validators/patient.schema'
import {
  createConsultationSchema,
  updateConsultationSchema,
  createTemplateSchema,
} from '@/validators/consultation.schema'
import {
  createMealPlanSchema,
  generateMealPlanSchema,
  updateMealPlanSchema,
  saveMealPlanTemplateSchema,
} from '@/validators/meal-plan.schema'
import {
  changeSubscriptionSchema,
  cancelSubscriptionSchema,
} from '@/validators/subscription.schema'
import {
  connectIntegrationSchema,
  updateIntegrationSchema,
  webhookConfigSchema,
} from '@/validators/integration.schema'

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------
describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid input', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({ password: 'password123' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('rejects password shorter than 8 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    const validInput = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    }

    it('accepts valid input', () => {
      const result = registerSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects password without uppercase letter', () => {
      const result = registerSchema.safeParse({
        ...validInput,
        password: 'password1',
        confirmPassword: 'password1',
      })
      expect(result.success).toBe(false)
    })

    it('rejects password without lowercase letter', () => {
      const result = registerSchema.safeParse({
        ...validInput,
        password: 'PASSWORD1',
        confirmPassword: 'PASSWORD1',
      })
      expect(result.success).toBe(false)
    })

    it('rejects password without number', () => {
      const result = registerSchema.safeParse({
        ...validInput,
        password: 'Passwordx',
        confirmPassword: 'Passwordx',
      })
      expect(result.success).toBe(false)
    })

    it('rejects when passwords do not match', () => {
      const result = registerSchema.safeParse({
        ...validInput,
        confirmPassword: 'Different1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.errors.map((e) => e.path.join('.'))
        expect(paths).toContain('confirmPassword')
      }
    })

    it('rejects missing firstName', () => {
      const { firstName: _, ...rest } = validInput
      const result = registerSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty firstName', () => {
      const result = registerSchema.safeParse({ ...validInput, firstName: '' })
      expect(result.success).toBe(false)
    })

    it('rejects firstName longer than 100 characters', () => {
      const result = registerSchema.safeParse({
        ...validInput,
        firstName: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'bad' })
      expect(result.success).toBe(false)
    })

    it('rejects missing email', () => {
      const result = forgotPasswordSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    const validInput = {
      token: 'reset-token-123',
      password: 'NewPass1x',
      confirmPassword: 'NewPass1x',
    }

    it('accepts valid input', () => {
      const result = resetPasswordSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects missing token', () => {
      const { token: _, ...rest } = validInput
      const result = resetPasswordSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty token', () => {
      const result = resetPasswordSchema.safeParse({ ...validInput, token: '' })
      expect(result.success).toBe(false)
    })

    it('rejects when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        ...validInput,
        confirmPassword: 'Mismatch1',
      })
      expect(result.success).toBe(false)
    })

    it('rejects weak password', () => {
      const result = resetPasswordSchema.safeParse({
        ...validInput,
        password: 'weak',
        confirmPassword: 'weak',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Patient Schemas
// ---------------------------------------------------------------------------
describe('Patient Schemas', () => {
  describe('createPatientSchema', () => {
    it('accepts valid minimal input (firstName + lastName)', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.firstName).toBe('Jane')
        expect(result.data.lastName).toBe('Smith')
      }
    })

    it('applies default values', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.country).toBe('BR')
        expect(result.data.allergies).toEqual([])
        expect(result.data.dietaryRestrictions).toEqual([])
        expect(result.data.currentMedications).toEqual([])
      }
    })

    it('accepts full input with all optional fields', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '5511999999999',
        dateOfBirth: '1990-01-15',
        gender: 'female',
        country: 'US',
        allergies: ['peanuts'],
        dietaryRestrictions: ['vegan'],
        currentMedications: ['aspirin'],
        height: 170,
        weight: 65,
        targetWeight: 60,
        activityLevel: 'MODERATE',
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative weight', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
        weight: -5,
      })
      expect(result.success).toBe(false)
    })

    it('rejects zero height', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
        height: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid activityLevel', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
        activityLevel: 'EXTREME',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing firstName', () => {
      const result = createPatientSchema.safeParse({ lastName: 'Smith' })
      expect(result.success).toBe(false)
    })

    it('accepts empty string as email', () => {
      const result = createPatientSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
        email: '',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updatePatientSchema', () => {
    it('accepts empty object (all fields are partial)', () => {
      const result = updatePatientSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts partial updates', () => {
      const result = updatePatientSchema.safeParse({ weight: 70 })
      expect(result.success).toBe(true)
    })

    it('rejects invalid field values', () => {
      const result = updatePatientSchema.safeParse({ weight: -10 })
      expect(result.success).toBe(false)
    })
  })

  describe('searchPatientsSchema', () => {
    it('applies default values when given empty object', () => {
      const result = searchPatientsSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.perPage).toBe(20)
        expect(result.data.sortBy).toBe('createdAt')
        expect(result.data.sortOrder).toBe('desc')
      }
    })

    it('accepts valid search parameters', () => {
      const result = searchPatientsSchema.safeParse({
        query: 'john',
        page: 2,
        perPage: 50,
        sortBy: 'firstName',
        sortOrder: 'asc',
      })
      expect(result.success).toBe(true)
    })

    it('coerces string numbers to integers', () => {
      const result = searchPatientsSchema.safeParse({
        page: '3',
        perPage: '25',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.perPage).toBe(25)
      }
    })

    it('rejects perPage greater than 100', () => {
      const result = searchPatientsSchema.safeParse({ perPage: 101 })
      expect(result.success).toBe(false)
    })

    it('rejects invalid sortBy value', () => {
      const result = searchPatientsSchema.safeParse({ sortBy: 'email' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid sortOrder value', () => {
      const result = searchPatientsSchema.safeParse({ sortOrder: 'random' })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Consultation Schemas
// ---------------------------------------------------------------------------
describe('Consultation Schemas', () => {
  describe('createConsultationSchema', () => {
    it('accepts valid input with patientId', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
      })
      expect(result.success).toBe(true)
    })

    it('defaults status to COMPLETED', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('COMPLETED')
      }
    })

    it('rejects missing patientId', () => {
      const result = createConsultationSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects empty patientId', () => {
      const result = createConsultationSchema.safeParse({ patientId: '' })
      expect(result.success).toBe(false)
    })

    it('rejects bodyFat greater than 100', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        bodyFat: 101,
      })
      expect(result.success).toBe(false)
    })

    it('rejects bodyFat less than 0', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        bodyFat: -1,
      })
      expect(result.success).toBe(false)
    })

    it('accepts valid bodyFat value', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        bodyFat: 22.5,
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid status', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        status: 'DRAFT',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('DRAFT')
      }
    })

    it('rejects invalid status', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        status: 'PENDING',
      })
      expect(result.success).toBe(false)
    })

    it('accepts positive duration', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        duration: 30,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative duration', () => {
      const result = createConsultationSchema.safeParse({
        patientId: 'patient-1',
        duration: -5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateConsultationSchema', () => {
    it('accepts partial updates', () => {
      const result = updateConsultationSchema.safeParse({
        notes: 'Updated notes',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
      const result = updateConsultationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('does not include patientId', () => {
      const result = updateConsultationSchema.safeParse({
        patientId: 'patient-1',
      })
      // patientId is omitted from the type – it should be stripped
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('patientId')
      }
    })
  })

  describe('createTemplateSchema', () => {
    it('accepts valid input', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Initial Assessment',
        content: '<template>Initial assessment template</template>',
      })
      expect(result.success).toBe(true)
    })

    it('defaults isDefault to false', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Template',
        content: 'content',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isDefault).toBe(false)
      }
    })

    it('rejects missing name', () => {
      const result = createTemplateSchema.safeParse({ content: 'content' })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = createTemplateSchema.safeParse({ name: '', content: 'content' })
      expect(result.success).toBe(false)
    })

    it('rejects name longer than 200 characters', () => {
      const result = createTemplateSchema.safeParse({
        name: 'x'.repeat(201),
        content: 'content',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing content', () => {
      const result = createTemplateSchema.safeParse({ name: 'Template' })
      expect(result.success).toBe(false)
    })

    it('rejects empty content', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Template',
        content: '',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Meal Plan Schemas
// ---------------------------------------------------------------------------
describe('Meal Plan Schemas', () => {
  describe('createMealPlanSchema', () => {
    it('accepts valid minimal input', () => {
      const result = createMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Weekly Plan',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.days).toEqual([])
      }
    })

    it('accepts valid input with nested days, meals, and foodItems', () => {
      const result = createMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Weekly Plan',
        days: [
          {
            dayOfWeek: 'MONDAY',
            meals: [
              {
                mealType: 'BREAKFAST',
                name: 'Oatmeal',
                foodItems: [
                  { name: 'Oats', quantity: 100, unit: 'g', calories: 389 },
                  { name: 'Banana', quantity: 1, unit: 'unit', calories: 105 },
                ],
              },
            ],
          },
        ],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.days).toHaveLength(1)
        expect(result.data.days[0].meals).toHaveLength(1)
        expect(result.data.days[0].meals[0].foodItems).toHaveLength(2)
      }
    })

    it('rejects missing patientId', () => {
      const result = createMealPlanSchema.safeParse({ title: 'Plan' })
      expect(result.success).toBe(false)
    })

    it('rejects title longer than 200 characters', () => {
      const result = createMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'x'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty title', () => {
      const result = createMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid dayOfWeek', () => {
      const result = createMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        days: [{ dayOfWeek: 'FUNDAY' }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid mealType', () => {
      const result = createMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        days: [
          {
            dayOfWeek: 'MONDAY',
            meals: [{ mealType: 'BRUNCH' }],
          },
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('generateMealPlanSchema', () => {
    it('applies defaults (numberOfDays=7, mealsPerDay=5)', () => {
      const result = generateMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Generated Plan',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.numberOfDays).toBe(7)
        expect(result.data.mealsPerDay).toBe(5)
      }
    })

    it('rejects numberOfDays greater than 7', () => {
      const result = generateMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        numberOfDays: 8,
      })
      expect(result.success).toBe(false)
    })

    it('rejects numberOfDays less than 1', () => {
      const result = generateMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        numberOfDays: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects mealsPerDay less than 3', () => {
      const result = generateMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        mealsPerDay: 2,
      })
      expect(result.success).toBe(false)
    })

    it('rejects mealsPerDay greater than 6', () => {
      const result = generateMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        mealsPerDay: 7,
      })
      expect(result.success).toBe(false)
    })

    it('accepts valid custom values', () => {
      const result = generateMealPlanSchema.safeParse({
        patientId: 'patient-1',
        title: 'Plan',
        numberOfDays: 3,
        mealsPerDay: 4,
        calorieTarget: 2000,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateMealPlanSchema', () => {
    it('accepts empty object (all optional)', () => {
      const result = updateMealPlanSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts valid status', () => {
      const result = updateMealPlanSchema.safeParse({ status: 'ACTIVE' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = updateMealPlanSchema.safeParse({ status: 'DELETED' })
      expect(result.success).toBe(false)
    })

    it('accepts valid title update', () => {
      const result = updateMealPlanSchema.safeParse({ title: 'Updated Title' })
      expect(result.success).toBe(true)
    })

    it('rejects title longer than 200 characters', () => {
      const result = updateMealPlanSchema.safeParse({
        title: 'x'.repeat(201),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('saveMealPlanTemplateSchema', () => {
    it('accepts valid input', () => {
      const result = saveMealPlanTemplateSchema.safeParse({
        name: 'Low Carb Template',
        mealPlanId: 'mp-123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
      const result = saveMealPlanTemplateSchema.safeParse({
        mealPlanId: 'mp-123',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = saveMealPlanTemplateSchema.safeParse({
        name: '',
        mealPlanId: 'mp-123',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing mealPlanId', () => {
      const result = saveMealPlanTemplateSchema.safeParse({
        name: 'Template',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty mealPlanId', () => {
      const result = saveMealPlanTemplateSchema.safeParse({
        name: 'Template',
        mealPlanId: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects name longer than 200 characters', () => {
      const result = saveMealPlanTemplateSchema.safeParse({
        name: 'x'.repeat(201),
        mealPlanId: 'mp-123',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Subscription Schemas
// ---------------------------------------------------------------------------
describe('Subscription Schemas', () => {
  describe('changeSubscriptionSchema', () => {
    it('accepts valid input', () => {
      const result = changeSubscriptionSchema.safeParse({ tier: 'PREMIUM' })
      expect(result.success).toBe(true)
    })

    it('defaults billingCycle to MONTHLY', () => {
      const result = changeSubscriptionSchema.safeParse({ tier: 'LITE' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.billingCycle).toBe('MONTHLY')
      }
    })

    it('accepts ANNUAL billingCycle', () => {
      const result = changeSubscriptionSchema.safeParse({
        tier: 'BUSINESS',
        billingCycle: 'ANNUAL',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.billingCycle).toBe('ANNUAL')
      }
    })

    it('rejects invalid tier', () => {
      const result = changeSubscriptionSchema.safeParse({ tier: 'GOLD' })
      expect(result.success).toBe(false)
    })

    it('rejects TRIAL tier (not in enum)', () => {
      const result = changeSubscriptionSchema.safeParse({ tier: 'TRIAL' })
      expect(result.success).toBe(false)
    })

    it('rejects missing tier', () => {
      const result = changeSubscriptionSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects invalid billingCycle', () => {
      const result = changeSubscriptionSchema.safeParse({
        tier: 'PREMIUM',
        billingCycle: 'WEEKLY',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('cancelSubscriptionSchema', () => {
    it('accepts empty object', () => {
      const result = cancelSubscriptionSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('defaults immediate to false', () => {
      const result = cancelSubscriptionSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.immediate).toBe(false)
      }
    })

    it('accepts reason as optional string', () => {
      const result = cancelSubscriptionSchema.safeParse({
        reason: 'Too expensive',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reason).toBe('Too expensive')
      }
    })

    it('accepts immediate as true', () => {
      const result = cancelSubscriptionSchema.safeParse({ immediate: true })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.immediate).toBe(true)
      }
    })
  })
})

// ---------------------------------------------------------------------------
// Integration Schemas
// ---------------------------------------------------------------------------
describe('Integration Schemas', () => {
  describe('connectIntegrationSchema', () => {
    it('rejects when config is missing', () => {
      const result = connectIntegrationSchema.safeParse({ provider: 'STRIPE' })
      expect(result.success).toBe(false)
    })

    it('rejects when config is empty for providers that require fields', () => {
      const result = connectIntegrationSchema.safeParse({ provider: 'STRIPE', config: {} })
      expect(result.success).toBe(false)
    })

    it('rejects invalid provider', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'INVALID',
        config: { apiKey: 'key123' },
      })
      expect(result.success).toBe(false)
    })

    // GOOGLE_CALENDAR
    it('accepts valid Google Calendar config', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'GOOGLE_CALENDAR',
        config: { clientId: 'id-123', clientSecret: 'secret-456' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects Google Calendar config without clientSecret', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'GOOGLE_CALENDAR',
        config: { clientId: 'id-123' },
      })
      expect(result.success).toBe(false)
    })

    it('rejects Google Calendar config with empty clientId', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'GOOGLE_CALENDAR',
        config: { clientId: '', clientSecret: 'secret-456' },
      })
      expect(result.success).toBe(false)
    })

    // WHATSAPP
    it('accepts valid WhatsApp config', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'WHATSAPP',
        config: { apiToken: 'token-123', phoneNumberId: 'phone-456' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects WhatsApp config without phoneNumberId', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'WHATSAPP',
        config: { apiToken: 'token-123' },
      })
      expect(result.success).toBe(false)
    })

    // STRIPE
    it('accepts valid Stripe config', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'STRIPE',
        config: { apiKey: 'sk_live_abc123' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects Stripe config with empty apiKey', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'STRIPE',
        config: { apiKey: '' },
      })
      expect(result.success).toBe(false)
    })

    // PAGSEGURO
    it('accepts valid PagSeguro config', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'PAGSEGURO',
        config: { email: 'test@example.com', token: 'tok-123' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects PagSeguro config without token', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'PAGSEGURO',
        config: { email: 'test@example.com' },
      })
      expect(result.success).toBe(false)
    })

    // ZOOM
    it('accepts valid Zoom config', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'ZOOM',
        config: { clientId: 'zoom-id', clientSecret: 'zoom-secret' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects Zoom config without clientId', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'ZOOM',
        config: { clientSecret: 'zoom-secret' },
      })
      expect(result.success).toBe(false)
    })

    // WEBHOOK
    it('accepts valid Webhook config with url only', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'WEBHOOK',
        config: { url: 'https://example.com/webhook' },
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid Webhook config with url and secret', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'WEBHOOK',
        config: { url: 'https://example.com/webhook', secret: 'my-secret' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects Webhook config with invalid url', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'WEBHOOK',
        config: { url: 'not-a-url' },
      })
      expect(result.success).toBe(false)
    })

    it('rejects Webhook config without url', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'WEBHOOK',
        config: {},
      })
      expect(result.success).toBe(false)
    })

    it('includes config path prefix in error paths', () => {
      const result = connectIntegrationSchema.safeParse({
        provider: 'STRIPE',
        config: {},
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.errors.map((e) => e.path.join('.'))
        expect(paths.some((p) => p.startsWith('config'))).toBe(true)
      }
    })
  })

  describe('updateIntegrationSchema', () => {
    it('accepts empty object', () => {
      const result = updateIntegrationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts valid status', () => {
      const result = updateIntegrationSchema.safeParse({ status: 'CONNECTED' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = updateIntegrationSchema.safeParse({ status: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('accepts config object', () => {
      const result = updateIntegrationSchema.safeParse({ config: { key: 'value' } })
      expect(result.success).toBe(true)
    })
  })

  describe('webhookConfigSchema', () => {
    it('accepts valid webhook config', () => {
      const result = webhookConfigSchema.safeParse({
        url: 'https://example.com/hook',
        events: ['patient.created'],
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid url', () => {
      const result = webhookConfigSchema.safeParse({
        url: 'not-url',
        events: ['patient.created'],
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty events array', () => {
      const result = webhookConfigSchema.safeParse({
        url: 'https://example.com/hook',
        events: [],
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional secret with min length 8', () => {
      const result = webhookConfigSchema.safeParse({
        url: 'https://example.com/hook',
        events: ['patient.created'],
        secret: 'longsecret',
      })
      expect(result.success).toBe(true)
    })

    it('rejects secret shorter than 8 characters', () => {
      const result = webhookConfigSchema.safeParse({
        url: 'https://example.com/hook',
        events: ['patient.created'],
        secret: 'short',
      })
      expect(result.success).toBe(false)
    })
  })
})
