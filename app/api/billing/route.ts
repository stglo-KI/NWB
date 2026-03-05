import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { startOfYear, endOfYear, parseISO, isWithinInterval, format } from 'date-fns'

const billingPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
})

const controlReadingSchema = z.object({
  billingPeriodId: z.string(),
  date: z.string(),
  value: z.number().positive(),
  comment: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  const periods = await prisma.billingPeriod.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      invoices: true,
      controlReadings: true,
    }
  })

  return NextResponse.json(periods)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = billingPeriodSchema.parse(body)

    const period = await prisma.billingPeriod.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      }
    })

    return NextResponse.json(period)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, billingPeriodId, ...data } = body

    if (action === 'start') {
      await prisma.billingPeriod.update({
        where: { id: billingPeriodId },
        data: { status: 'RUNNING' }
      })
      return NextResponse.json({ message: 'Abrechnung gestartet' })
    }

    if (action === 'complete') {
      await prisma.billingPeriod.update({
        where: { id: billingPeriodId },
        data: { status: 'COMPLETED' }
      })
      return NextResponse.json({ message: 'Abrechnung abgeschlossen' })
    }

    if (action === 'controlReading') {
      const reading = controlReadingSchema.parse(data)
      
      const readingEntry = await prisma.controlReading.create({
        data: {
          billingPeriodId: reading.billingPeriodId,
          date: new Date(reading.date),
          value: reading.value,
          comment: reading.comment,
        }
      })
      return NextResponse.json(readingEntry)
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
