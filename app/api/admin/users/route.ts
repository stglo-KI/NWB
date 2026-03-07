import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.string().optional().default(''),
  street: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  phone: z.string().optional().default(''),
  objectName: z.string().optional(),
  customerNumber: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    include: { profile: true },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createUserSchema.parse(body)

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
        role: 'USER',
        status: 'ACTIVE',
        profile: {
          create: {
            gender: data.gender,
            firstName: data.firstName,
            lastName: data.lastName,
            street: data.street,
            postalCode: data.postalCode,
            city: data.city,
            phone: data.phone,
            objectName: data.objectName,
            customerNumber: data.customerNumber,
          }
        }
      },
      include: { profile: true }
    })

    return NextResponse.json({ 
      message: 'Kunde erfolgreich erstellt',
      user: { id: user.id, email: user.email }
    })
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

  const { userId, action, data } = await request.json()

  if (action === 'lock') {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'LOCKED' }
    })
    return NextResponse.json({ message: 'Benutzer gesperrt' })
  }

  if (action === 'unlock') {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' }
    })
    return NextResponse.json({ message: 'Benutzer entsperrt' })
  }

  if (action === 'resetPassword') {
    const newHash = await bcrypt.hash(data.password, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    })
    return NextResponse.json({ message: 'Passwort zurückgesetzt' })
  }

  if (action === 'updateProfile') {
    const profile = await prisma.customerProfile.update({
      where: { userId },
      data: {
        gender: data.gender,
        firstName: data.firstName,
        lastName: data.lastName,
        street: data.street,
        postalCode: data.postalCode,
        city: data.city,
        phone: data.phone,
        objectName: data.objectName,
        customerNumber: data.customerNumber,
      }
    })
    return NextResponse.json(profile)
  }

  return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Benutzer-ID erforderlich' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ message: 'Benutzer gelöscht' })
}
