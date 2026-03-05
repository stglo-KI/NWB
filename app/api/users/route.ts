import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().min(1),
  objectName: z.string().optional(),
  customerNumber: z.string().optional(),
  connectionId: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id }
  })

  return NextResponse.json(profile)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            address: data.address,
            objectName: data.objectName,
            customerNumber: data.customerNumber,
            connectionId: data.connectionId,
          }
        }
      },
      include: { profile: true }
    })

    return NextResponse.json({ 
      message: 'Registrierung erfolgreich',
      user: { id: user.id, email: user.email }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ungültige Eingabedaten' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { firstName, lastName, address, objectName, customerNumber, connectionId } = body

    const profile = await prisma.customerProfile.update({
      where: { userId: session.user.id },
      data: {
        firstName,
        lastName,
        address,
        objectName,
        customerNumber,
        connectionId,
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
