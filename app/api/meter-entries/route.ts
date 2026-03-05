import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const meterEntrySchema = z.object({
  date: z.string(),
  value: z.number().positive('Wert muss positiv sein'),
  entryType: z.enum(['METER_READING', 'CONSUMPTION']).default('METER_READING'),
  comment: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const entries = await prisma.meterEntry.findMany({
    where: { userId: session.user.id },
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
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = meterEntrySchema.parse(body)

    const lastEntry = await prisma.meterEntry.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' }
    })

    if (data.entryType === 'METER_READING' && lastEntry && data.value < lastEntry.value) {
      return NextResponse.json({ 
        error: 'Zählerstand darf nicht kleiner als der vorherige Wert sein' 
      }, { status: 400 })
    }

    const entry = await prisma.meterEntry.create({
      data: {
        userId: session.user.id,
        date: new Date(data.date),
        value: data.value,
        entryType: data.entryType,
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

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 })
  }

  const entry = await prisma.meterEntry.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!entry) {
    return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
  }

  await prisma.meterEntry.delete({ where: { id } })

  return NextResponse.json({ message: 'Eintrag gelöscht' })
}
