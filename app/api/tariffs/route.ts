import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const tariffSchema = z.object({
  name: z.string().min(1),
  validFrom: z.string(),
  validTo: z.string().optional(),
  energyPrice: z.number().positive(),
  basePrice: z.number().default(0),
})

export async function GET() {
  const tariffs = await prisma.tariff.findMany({
    orderBy: { validFrom: 'desc' }
  })

  return NextResponse.json(tariffs)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = tariffSchema.parse(body)

    if (data.validTo) {
      await prisma.tariff.updateMany({
        where: {
          validTo: null,
          validFrom: { lte: new Date(data.validTo) },
        },
        data: {
          validTo: new Date(data.validTo),
        }
      })
    }

    const tariff = await prisma.tariff.create({
      data: {
        name: data.name,
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
        energyPrice: data.energyPrice,
        basePrice: data.basePrice,
      }
    })

    return NextResponse.json(tariff)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
