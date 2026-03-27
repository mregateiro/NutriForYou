import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function getDashboardAnalytics(nutritionistId: string) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  try {
    const [
      totalPatients,
      activePatients,
      newPatientsThisMonth,
      totalConsultations,
      consultationsThisMonth,
      completedConsultations,
      totalMealPlans,
      mealPlansThisMonth,
      upcomingAppointments,
      totalRevenue,
      revenueThisMonth,
      pendingPayments,
      activeContracts,
      recentConsultations,
      patientGrowth,
    ] = await Promise.all([
      // Patient metrics
      prisma.patient.count({ where: { nutritionistId, isActive: true } }),
      prisma.patient.count({
        where: {
          nutritionistId,
          isActive: true,
          consultations: { some: { createdAt: { gte: ninetyDaysAgo } } },
        },
      }),
      prisma.patient.count({
        where: { nutritionistId, createdAt: { gte: thirtyDaysAgo } },
      }),

      // Consultation metrics
      prisma.consultation.count({ where: { nutritionistId } }),
      prisma.consultation.count({
        where: { nutritionistId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.consultation.count({
        where: { nutritionistId, status: 'COMPLETED' },
      }),

      // Meal plan metrics
      prisma.mealPlan.count({ where: { nutritionistId } }),
      prisma.mealPlan.count({
        where: { nutritionistId, createdAt: { gte: thirtyDaysAgo } },
      }),

      // Appointment metrics
      prisma.appointment.count({
        where: {
          nutritionistId,
          startsAt: { gte: now },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),

      // Revenue metrics
      prisma.payment.aggregate({
        where: { recordedById: nutritionistId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          recordedById: nutritionistId,
          status: 'COMPLETED',
          paidAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { recordedById: nutritionistId, status: 'PENDING' },
        _sum: { amount: true },
      }),

      // Contract metrics
      prisma.contract.count({
        where: {
          createdById: nutritionistId,
          status: { in: ['SENT', 'SIGNED'] },
        },
      }),

      // Recent consultations for activity feed
      prisma.consultation.findMany({
        where: { nutritionistId },
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Patient growth (monthly for last 6 months)
      getMonthlyPatientGrowth(nutritionistId),
    ])

    return {
      patients: {
        total: totalPatients,
        active: activePatients,
        newThisMonth: newPatientsThisMonth,
      },
      consultations: {
        total: totalConsultations,
        thisMonth: consultationsThisMonth,
        completed: completedConsultations,
        completionRate: totalConsultations > 0
          ? Math.round((completedConsultations / totalConsultations) * 100)
          : 0,
      },
      mealPlans: {
        total: totalMealPlans,
        thisMonth: mealPlansThisMonth,
      },
      appointments: {
        upcoming: upcomingAppointments,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisMonth: revenueThisMonth._sum.amount || 0,
        pending: pendingPayments._sum.amount || 0,
      },
      contracts: {
        active: activeContracts,
      },
      recentConsultations,
      patientGrowth,
    }
  } catch (error) {
    logger.error({ error, nutritionistId }, 'Failed to get dashboard analytics')
    throw error
  }
}

async function getMonthlyPatientGrowth(nutritionistId: string) {
  const months = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const label = start.toLocaleString('default', { month: 'short', year: '2-digit' })

    const count = await prisma.patient.count({
      where: {
        nutritionistId,
        createdAt: { gte: start, lte: end },
      },
    })

    months.push({ month: label, count })
  }

  return months
}

export async function getPatientAnalytics(
  nutritionistId: string,
  patientId: string
) {
  // Verify patient belongs to nutritionist
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, nutritionistId },
    select: { id: true, firstName: true, lastName: true, createdAt: true },
  })
  if (!patient) throw new Error('Patient not found')

  const [
    consultationCount,
    mealPlanCount,
    weightEntries,
    contractCount,
    lastConsultation,
    paymentTotal,
  ] = await Promise.all([
    prisma.consultation.count({ where: { patientId, nutritionistId } }),
    prisma.mealPlan.count({ where: { patientId, nutritionistId } }),
    prisma.weightEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
      select: { weight: true, createdAt: true },
    }),
    prisma.contract.count({
      where: { patientId, createdById: nutritionistId },
    }),
    prisma.consultation.findFirst({
      where: { patientId, nutritionistId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, status: true },
    }),
    prisma.payment.aggregate({
      where: { patientId, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ])

  return {
    patient,
    consultations: consultationCount,
    mealPlans: mealPlanCount,
    contracts: contractCount,
    totalPaid: paymentTotal._sum.amount || 0,
    lastConsultation,
    weightHistory: weightEntries.map((e) => ({
      weight: e.weight,
      date: e.createdAt.toISOString(),
    })),
  }
}
