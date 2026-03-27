export const APP_NAME = 'NutriForYou'
export const APP_DESCRIPTION = 'All-in-one SaaS platform for nutritionists'

export const SUBSCRIPTION_PLANS = {
  TRIAL: {
    name: 'Trial',
    maxPatients: 5,
    maxConsultations: 10,
    features: ['patient_management', 'consultation_notes', 'basic_meal_plans'],
  },
  LITE: {
    name: 'Lite',
    maxPatients: 50,
    maxConsultations: -1,
    features: ['patient_management', 'consultation_notes', 'basic_meal_plans', 'document_upload'],
  },
  PREMIUM: {
    name: 'Premium',
    maxPatients: -1,
    maxConsultations: -1,
    features: [
      'patient_management',
      'consultation_notes',
      'ai_meal_plans',
      'document_upload',
      'scheduling',
      'chat',
      'analytics',
    ],
  },
  BUSINESS: {
    name: 'Business',
    maxPatients: -1,
    maxConsultations: -1,
    features: [
      'patient_management',
      'consultation_notes',
      'ai_meal_plans',
      'document_upload',
      'scheduling',
      'chat',
      'analytics',
      'team_management',
      'branding',
      'api_access',
    ],
  },
} as const
