import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const meterEntrySchema = z.object({
  userId: z.string(),
  date: z.string(),
  value: z.number().positive('Wert muss positiv sein'),
  comment: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId erforderlich' }, { status: 400 })
  }

  const entries = await prisma.meterEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' }
  })

  const entriesWithConsumption = entries.map((entry, index) => {
    let consumption = null
    if (entry.entryType === 'METER_READING' && index < entries.length - 1) {
      const nextEntry = entries[index + 1]
      if (nextEntry.entryType === 'METER_READING') {
        consumption = entry.value - nextEntry.value
      }
    }
    return { ...entry, consumption }
  })

  return NextResponse.json(entriesWithConsumption)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = meterEntrySchema.parse(body)

    const newDate = new Date(data.date)

    // Prüfe gegen den chronologisch letzten Eintrag VOR dem neuen Datum
    const previousEntry = await prisma.meterEntry.findFirst({
      where: { userId: data.userId, date: { lt: newDate }, entryType: 'METER_READING' },
      orderBy: { date: 'desc' }
    })

    if (previousEntry && data.value < previousEntry.value) {
      return NextResponse.json({
        error: 'Zählerstand darf nicht kleiner als der vorherige Wert sein'
      }, { status: 400 })
    }

    // Prüfe gegen den chronologisch nächsten Eintrag NACH dem neuen Datum
    const nextEntry = await prisma.meterEntry.findFirst({
      where: { userId: data.userId, date: { gt: newDate }, entryType: 'METER_READING' },
      orderBy: { date: 'asc' }
    })

    if (nextEntry && data.value > nextEntry.value) {
      return NextResponse.json({
        error: 'Zählerstand darf nicht größer als der nächste Wert sein'
      }, { status: 400 })
    }

    // Prüfe auf doppelte Einträge am selben Datum
    const sameDate = await prisma.meterEntry.findFirst({
      where: { userId: data.userId, date: newDate, entryType: 'METER_READING' }
    })

    if (sameDate) {
      return NextResponse.json({
        error: 'Es existiert bereits ein Zählerstand für dieses Datum'
      }, { status: 400 })
    }

    const entry = await prisma.meterEntry.create({
      data: {
        userId: data.userId,
        date: newDate,
        value: data.value,
        entryType: 'METER_READING',
        comment: data.comment,
      }
    })

    return NextResponse.json(entry)
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
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, date, value, comment } = body

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })
    }

    const existing = await prisma.meterEntry.findFirst({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    const newDate = date ? new Date(date) : existing.date
    const newValue = typeof value === 'number' ? value : existing.value

    // Chronologische Validierung (eigenen Eintrag ausschließen)
    const previousEntry = await prisma.meterEntry.findFirst({
      where: { userId: existing.userId, date: { lt: newDate }, entryType: 'METER_READING', id: { not: id } },
      orderBy: { date: 'desc' }
    })

    if (previousEntry && newValue < previousEntry.value) {
      return NextResponse.json({
        error: 'Zählerstand darf nicht kleiner als der vorherige Wert sein'
      }, { status: 400 })
    }

    const nextEntry = await prisma.meterEntry.findFirst({
      where: { userId: existing.userId, date: { gt: newDate }, entryType: 'METER_READING', id: { not: id } },
      orderBy: { date: 'asc' }
    })

    if (nextEntry && newValue > nextEntry.value) {
      return NextResponse.json({
        error: 'Zählerstand darf nicht größer als der nächste Wert sein'
      }, { status: 400 })
    }

    // Duplikat-Datum prüfen (eigenen Eintrag ausschließen)
    if (date) {
      const sameDate = await prisma.meterEntry.findFirst({
        where: { userId: existing.userId, date: newDate, entryType: 'METER_READING', id: { not: id } }
      })
      if (sameDate) {
        return NextResponse.json({
          error: 'Es existiert bereits ein Zählerstand für dieses Datum'
        }, { status: 400 })
      }
    }

    const updated = await prisma.meterEntry.update({
      where: { id },
      data: {
        date: newDate,
        value: newValue,
        comment: comment !== undefined ? comment : existing.comment,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })
  }

  const entry = await prisma.meterEntry.findFirst({
    where: { id }
  })

  if (!entry) {
    return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
  }

  await prisma.meterEntry.delete({ where: { id } })

  return NextResponse.json({ message: 'Eintrag gelöscht' })
}
