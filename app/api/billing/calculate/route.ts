import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { differenceInCalendarMonths, differenceInDays, startOfMonth, endOfMonth, max, min } from 'date-fns'

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

    if (period.status !== 'RUNNING') {
      return NextResponse.json({ error: 'Abrechnungszeitraum muss im Status RUNNING sein' }, { status: 400 })
    }

    // Alle Tarife laden, die im Abrechnungszeitraum gültig sind
    const tariffsInPeriod = await prisma.tariff.findMany({
      where: {
        validFrom: { lte: period.endDate },
        OR: [
          { validTo: null },
          { validTo: { gte: period.startDate } }
        ]
      },
      orderBy: { validFrom: 'asc' }
    })

    if (tariffsInPeriod.length === 0) {
      return NextResponse.json({ error: 'Kein gültiger Tarif gefunden' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: { role: 'USER', status: 'ACTIVE' },
      include: { profile: true, meterEntries: true, installments: true }
    })

    const results = []
    const errors = []

    // Tage im Abrechnungszeitraum
    const periodDays = differenceInDays(period.endDate, period.startDate) + 1
    const daysInYear = 365

    // Tarif-Zeitscheiben berechnen (Tage pro Tarif innerhalb der Periode)
    const tariffSlices = tariffsInPeriod.map(t => {
      const sliceStart = max([t.validFrom, period.startDate])
      const sliceEnd = min([t.validTo || period.endDate, period.endDate])
      const days = differenceInDays(sliceEnd, sliceStart) + 1
      return { tariff: t, days: Math.max(0, days) }
    }).filter(s => s.days > 0)

    for (const user of users) {
      const entriesInPeriod = user.meterEntries.filter(entry =>
        entry.date >= period.startDate && entry.date <= period.endDate && entry.entryType === 'METER_READING'
      )

      let consumption = 0
      if (entriesInPeriod.length >= 2) {
        const sortedEntries = [...entriesInPeriod].sort((a, b) => a.date.getTime() - b.date.getTime())
        consumption = sortedEntries[sortedEntries.length - 1].value - sortedEntries[0].value
      } else if (entriesInPeriod.length < 2) {
        errors.push({
          userId: user.id,
          name: `${user.profile?.firstName} ${user.profile?.lastName}`,
          reason: 'Weniger als 2 Zählerstände im Abrechnungszeitraum'
        })
      }

      const installmentsInPeriod = user.installments.filter(inst =>
        inst.validFrom <= period.endDate &&
        (!inst.validTo || inst.validTo >= period.startDate)
      )

      const installmentsSum = installmentsInPeriod.reduce((sum, inst) => {
        const months = calculateMonthsOverlap(inst, period.startDate, period.endDate)
        return sum + (inst.amount * months)
      }, 0)

      // Energie- und Grundkosten anteilig pro Tarif-Zeitscheibe berechnen
      const totalSliceDays = tariffSlices.reduce((sum, s) => sum + s.days, 0)
      let energyCosts = 0
      let baseCosts = 0

      for (const slice of tariffSlices) {
        const fraction = slice.days / totalSliceDays
        // Verbrauch proportional nach Tagen auf Tarif-Zeitscheiben verteilen
        energyCosts += consumption * fraction * slice.tariff.energyPrice
        // Grundpreis anteilig (€/Jahr -> Tage dieser Zeitscheibe)
        baseCosts += slice.tariff.basePrice / daysInYear * slice.days
      }

      energyCosts = round2(energyCosts)
      baseCosts = round2(baseCosts)
      const totalCosts = round2(energyCosts + baseCosts)
      const balance = round2(installmentsSum - totalCosts)

      const frozenData = JSON.stringify({
        period: { name: period.name, start: period.startDate, end: period.endDate },
        tariffs: tariffSlices.map(s => ({
          name: s.tariff.name,
          energyPrice: s.tariff.energyPrice,
          basePrice: s.tariff.basePrice,
          days: s.days,
        })),
        entries: entriesInPeriod.map(e => ({ date: e.date, value: e.value })),
        installments: installmentsInPeriod.map(i => ({ amount: i.amount, validFrom: i.validFrom, validTo: i.validTo })),
        calculationDetails: {
          periodDays,
          consumption,
          energyCosts,
          baseCosts,
          totalCosts,
          installmentsSum,
          balance,
        }
      })

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
      results,
      warnings: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Billing error:', error)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

/**
 * Berechnet die Anzahl der Monate, in denen ein Abschlag im Abrechnungszeitraum gültig ist.
 * Verwendet echte Kalendermonate statt fixer 30-Tage-Monate.
 */
function calculateMonthsOverlap(inst: { validFrom: Date; validTo: Date | null }, start: Date, end: Date): number {
  const overlapStart = inst.validFrom > start ? inst.validFrom : start
  const overlapEnd = inst.validTo && inst.validTo < end ? inst.validTo : end

  if (overlapStart > overlapEnd) return 0

  // Kalendermonate zählen (inklusiv Start- und Endmonat)
  const months = differenceInCalendarMonths(overlapEnd, overlapStart) + 1
  return Math.max(0, months)
}

/** Rundet auf 2 Dezimalstellen (kaufmännische Rundung) */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}
