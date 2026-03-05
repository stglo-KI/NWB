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

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const installments = await prisma.installment.findMany({
    where: { userId: session.user.id },
    orderBy: { validFrom: 'desc' }
  })

  return NextResponse.json(installments)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = installmentSchema.parse(body)

    await prisma.installment.updateMany({
      where: {
        userId: session.user.id,
        validTo: null,
      },
      data: {
        validTo: new Date(data.validFrom),
      }
    })

    const installment = await prisma.installment.create({
      data: {
        userId: session.user.id,
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
