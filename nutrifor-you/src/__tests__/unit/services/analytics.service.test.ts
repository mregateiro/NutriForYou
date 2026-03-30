import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getMockedPrisma, resetPrismaMocks } from '../../helpers/mock-prisma'
import { buildPatient, buildConsultation } from '../../helpers/test-data-builders'

const prisma = getMockedPrisma()

beforeEach(() => {
  resetPrismaMocks()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helper: set up default Prisma mocks that resolve to empty/zero values
// ---------------------------------------------------------------------------
function mockEmptyAnalytics() {
  prisma.patient.count.mockResolvedValue(0)
  prisma.consultation.count.mockResolvedValue(0)
  prisma.consultation.findMany.mockResolvedValue([])
  prisma.mealPlan.count.mockResolvedValue(0)
  prisma.appointment.count.mockResolvedValue(0)
  prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } })
  prisma.contract.count.mockResolvedValue(0)
}

// ---------------------------------------------------------------------------
// getDashboardAnalytics
// ---------------------------------------------------------------------------
describe('getDashboardAnalytics', () => {
  it('returns correct metrics structure with actual counts', async () => {
    // patient.count is called 3 times + 6 times for monthly growth = 9
    // consultation.count is called 3 times
    // mealPlan.count is called 2 times
    // appointment.count is called 1 time
    // payment.aggregate is called 3 times
    // contract.count is called 1 time
    // consultation.findMany is called 1 time

    // patient.count calls: totalPatients=5, activePatients=3, newPatientsThisMonth=1, then 6 monthly growth calls
    prisma.patient.count
      .mockResolvedValueOnce(5)   // totalPatients
      .mockResolvedValueOnce(3)   // activePatients
      .mockResolvedValueOnce(1)   // newPatientsThisMonth
      // monthly growth (6 months)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)

    prisma.consultation.count
      .mockResolvedValueOnce(10)  // totalConsultations
      .mockResolvedValueOnce(4)   // consultationsThisMonth
      .mockResolvedValueOnce(8)   // completedConsultations

    prisma.mealPlan.count
      .mockResolvedValueOnce(7)   // totalMealPlans
      .mockResolvedValueOnce(2)   // mealPlansThisMonth

    prisma.appointment.count
      .mockResolvedValueOnce(3)   // upcomingAppointments

    prisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1500 } })   // totalRevenue
      .mockResolvedValueOnce({ _sum: { amount: 300 } })    // revenueThisMonth
      .mockResolvedValueOnce({ _sum: { amount: 150 } })    // pendingPayments

    prisma.contract.count
      .mockResolvedValueOnce(2)   // activeContracts

    const recentConsultation = buildConsultation({
      patient: { firstName: 'Jane', lastName: 'Doe' },
    })
    prisma.consultation.findMany.mockResolvedValue([recentConsultation])

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    const result = await getDashboardAnalytics('nutri-1')

    expect(result.patients.total).toBe(5)
    expect(result.patients.active).toBe(3)
    expect(result.patients.newThisMonth).toBe(1)

    expect(result.consultations.total).toBe(10)
    expect(result.consultations.thisMonth).toBe(4)
    expect(result.consultations.completed).toBe(8)
    expect(result.consultations.completionRate).toBe(80) // 8/10 * 100

    expect(result.mealPlans.total).toBe(7)
    expect(result.mealPlans.thisMonth).toBe(2)

    expect(result.appointments.upcoming).toBe(3)

    expect(result.revenue.total).toBe(1500)
    expect(result.revenue.thisMonth).toBe(300)
    expect(result.revenue.pending).toBe(150)

    expect(result.contracts.active).toBe(2)

    expect(result.recentConsultations).toHaveLength(1)
    expect(result.patientGrowth).toHaveLength(6)
  })

  it('returns zero metrics when no data exists', async () => {
    mockEmptyAnalytics()

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    const result = await getDashboardAnalytics('nutri-1')

    expect(result.patients.total).toBe(0)
    expect(result.patients.active).toBe(0)
    expect(result.patients.newThisMonth).toBe(0)
    expect(result.consultations.total).toBe(0)
    expect(result.consultations.thisMonth).toBe(0)
    expect(result.mealPlans.total).toBe(0)
    expect(result.appointments.upcoming).toBe(0)
    expect(result.revenue.total).toBe(0)
    expect(result.revenue.thisMonth).toBe(0)
    expect(result.revenue.pending).toBe(0)
    expect(result.contracts.active).toBe(0)
    expect(result.recentConsultations).toEqual([])
  })

  it('calculates consultation completion rate correctly', async () => {
    prisma.patient.count.mockResolvedValue(0)
    prisma.consultation.count
      .mockResolvedValueOnce(20)  // totalConsultations
      .mockResolvedValueOnce(5)   // consultationsThisMonth
      .mockResolvedValueOnce(15)  // completedConsultations
    prisma.mealPlan.count.mockResolvedValue(0)
    prisma.appointment.count.mockResolvedValue(0)
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.contract.count.mockResolvedValue(0)
    prisma.consultation.findMany.mockResolvedValue([])

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    const result = await getDashboardAnalytics('nutri-1')

    expect(result.consultations.completionRate).toBe(75) // 15/20 * 100
  })

  it('returns zero completion rate when no consultations exist', async () => {
    mockEmptyAnalytics()

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    const result = await getDashboardAnalytics('nutri-1')

    expect(result.consultations.completionRate).toBe(0)
  })

  it('handles null revenue amounts gracefully', async () => {
    prisma.patient.count.mockResolvedValue(0)
    prisma.consultation.count.mockResolvedValue(0)
    prisma.consultation.findMany.mockResolvedValue([])
    prisma.mealPlan.count.mockResolvedValue(0)
    prisma.appointment.count.mockResolvedValue(0)
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } })
    prisma.contract.count.mockResolvedValue(0)

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    const result = await getDashboardAnalytics('nutri-1')

    expect(result.revenue.total).toBe(0)
    expect(result.revenue.thisMonth).toBe(0)
    expect(result.revenue.pending).toBe(0)
  })

  it('throws and logs error on database failure', async () => {
    prisma.patient.count.mockRejectedValue(new Error('Connection refused'))

    const { getDashboardAnalytics } = await import('@/services/analytics.service')

    await expect(getDashboardAnalytics('nutri-1')).rejects.toThrow('Connection refused')

    const { logger } = await import('@/lib/logger')
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ nutritionistId: 'nutri-1' }),
      'Failed to get dashboard analytics',
    )
  })

  it('filters patients by nutritionistId', async () => {
    mockEmptyAnalytics()

    const { getDashboardAnalytics } = await import('@/services/analytics.service')
    await getDashboardAnalytics('nutri-42')

    // First patient.count call is for totalPatients
    expect(prisma.patient.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ nutritionistId: 'nutri-42' }),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// getPatientAnalytics
// ---------------------------------------------------------------------------
describe('getPatientAnalytics', () => {
  it('returns patient analytics when patient belongs to nutritionist', async () => {
    const patient = buildPatient({ id: 'p-1', nutritionistId: 'nutri-1' })
    prisma.patient.findFirst.mockResolvedValue({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      createdAt: patient.createdAt,
    })

    prisma.consultation.count.mockResolvedValue(3)
    prisma.mealPlan.count.mockResolvedValue(1)
    prisma.weightEntry.findMany.mockResolvedValue([
      { weight: 80, createdAt: new Date('2025-01-01') },
      { weight: 78, createdAt: new Date('2025-02-01') },
    ])
    prisma.contract.count.mockResolvedValue(1)
    prisma.consultation.findFirst.mockResolvedValue({
      id: 'c-1',
      createdAt: new Date(),
      status: 'COMPLETED',
    })
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 450 } })

    const { getPatientAnalytics } = await import('@/services/analytics.service')
    const result = await getPatientAnalytics('nutri-1', 'p-1')

    expect(result.patient.id).toBe('p-1')
    expect(result.consultations).toBe(3)
    expect(result.mealPlans).toBe(1)
    expect(result.contracts).toBe(1)
    expect(result.totalPaid).toBe(450)
    expect(result.weightHistory).toHaveLength(2)
    expect(result.weightHistory[0]).toEqual({
      weight: 80,
      date: new Date('2025-01-01').toISOString(),
    })
    expect(result.lastConsultation).toBeDefined()
  })

  it('throws when patient does not belong to nutritionist', async () => {
    prisma.patient.findFirst.mockResolvedValue(null)

    const { getPatientAnalytics } = await import('@/services/analytics.service')

    await expect(getPatientAnalytics('nutri-1', 'unknown-patient')).rejects.toThrow(
      'Patient not found',
    )
  })

  it('handles empty weight history', async () => {
    prisma.patient.findFirst.mockResolvedValue({
      id: 'p-1',
      firstName: 'Jane',
      lastName: 'Doe',
      createdAt: new Date(),
    })
    prisma.consultation.count.mockResolvedValue(0)
    prisma.mealPlan.count.mockResolvedValue(0)
    prisma.weightEntry.findMany.mockResolvedValue([])
    prisma.contract.count.mockResolvedValue(0)
    prisma.consultation.findFirst.mockResolvedValue(null)
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } })

    const { getPatientAnalytics } = await import('@/services/analytics.service')
    const result = await getPatientAnalytics('nutri-1', 'p-1')

    expect(result.weightHistory).toEqual([])
    expect(result.totalPaid).toBe(0)
    expect(result.lastConsultation).toBeNull()
  })
})
