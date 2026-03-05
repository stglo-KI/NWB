import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  try {
    const { billingPeriodId } = await request.json()

    const period = await prisma.billingPeriod.findUnique({
      where: { id: billingPeriodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Abrechnungszeitraum nicht gefunden' }, { status: 404 })
    }

    const tariff = await prisma.tariff.findFirst({
      where: {
        validFrom: { lte: period.endDate },
        OR: [
          { validTo: null },
          { validTo: { gte: period.startDate } }
        ]
      },
      orderBy: { validFrom: 'desc' }
    })

    if (!tariff) {
      return NextResponse.json({ error: 'Kein gültiger Tarif gefunden' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: { role: 'USER', status: 'ACTIVE' },
      include: { profile: true, meterEntries: true, installments: true }
    })

    const results = []

    for (const user of users) {
      const entriesInPeriod = user.meterEntries.filter(entry => 
        entry.date >= period.startDate && entry.date <= period.endDate && entry.entryType === 'METER_READING'
      )

      let consumption = 0
      if (entriesInPeriod.length >= 2) {
        const sortedEntries = [...entriesInPeriod].sort((a, b) => a.date.getTime() - b.date.getTime())
        consumption = sortedEntries[sortedEntries.length - 1].value - sortedEntries[0].value
      }

      const installmentsInPeriod = user.installments.filter(inst =>
        inst.validFrom <= period.endDate &&
        (!inst.validTo || inst.validTo >= period.startDate)
      )

      const installmentsSum = installmentsInPeriod.reduce((sum, inst) => {
        const months = calculateMonthsOverlap(inst, period.startDate, period.endDate)
        return sum + (inst.amount * months)
      }, 0)

      const energyCosts = consumption * tariff.energyPrice
      const baseCosts = tariff.basePrice
      const totalCosts = energyCosts + baseCosts
      const balance = installmentsSum - totalCosts

      const frozenData = {
        period: { name: period.name, start: period.startDate, end: period.endDate },
        tariff: { name: tariff.name, energyPrice: tariff.energyPrice, basePrice: tariff.basePrice },
        entries: entriesInPeriod.map(e => ({ date: e.date, value: e.value })),
        installments: installmentsInPeriod.map(i => ({ amount: i.amount, validFrom: i.validFrom })),
      }

      const invoice = await prisma.invoice.upsert({
        where: {
          billingPeriodId_userId: {
            billingPeriodId,
            userId: user.id
          }
        },
        update: {
          consumption,
          energyCosts,
          baseCosts,
          totalCosts,
          installmentsSum,
          balance,
          frozenData,
        },
        create: {
          billingPeriodId,
          userId: user.id,
          consumption,
          energyCosts,
          baseCosts,
          totalCosts,
          installmentsSum,
          balance,
          frozenData,
        }
      })

      results.push({
        user: { id: user.id, name: `${user.profile?.firstName} ${user.profile?.lastName}` },
        invoice
      })
    }

    return NextResponse.json({ 
      message: `Abrechnung für ${results.length} Nutzer erstellt`,
      results 
    })
  } catch (error) {
    console.error('Billing error:', error)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

function calculateMonthsOverlap(inst: { validFrom: Date; validTo: Date | null }, start: Date, end: Date): number {
  const instStart = inst.validFrom > start ? inst.validFrom : start
  const instEnd = inst.validTo && inst.validTo < end ? inst.validTo : end
  
  const months = (instEnd.getTime() - instStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return Math.max(0, Math.ceil(months))
}
