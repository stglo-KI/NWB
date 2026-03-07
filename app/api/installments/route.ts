import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const installmentSchema = z.object({
  amount: z.number().positive('Betrag muss positiv sein'),
  validFrom: z.string(),
  validTo: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  // Admin kann Abschläge eines bestimmten Kunden abrufen
  const targetUserId = (userId && session.user.role === 'ADMIN') ? userId : session.user.id

  const installments = await prisma.installment.findMany({
    where: { userId: targetUserId },
    orderBy: { validFrom: 'desc' }
  })

  return NextResponse.json(installments)
}

const createInstallmentSchema = z.object({
  userId: z.string(),
  amount: z.number().positive('Betrag muss positiv sein'),
  validFrom: z.string(),
  validTo: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Nur Admins dürfen Abschläge anlegen
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren dürfen Abschläge ändern' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createInstallmentSchema.parse(body)

    // Vorherige offene Abschläge des Kunden beenden
    await prisma.installment.updateMany({
      where: {
        userId: data.userId,
        validTo: null,
      },
      data: {
        validTo: new Date(data.validFrom),
      }
    })

    const installment = await prisma.installment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
      }
    })

    return NextResponse.json(installment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
