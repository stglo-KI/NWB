import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

// Selbstregistrierung deaktiviert - Kunden werden nur vom Admin angelegt
export async function POST() {
  return NextResponse.json(
    { error: 'Selbstregistrierung ist deaktiviert. Bitte kontaktieren Sie Ihren Energieversorger.' },
    { status: 403 }
  )
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { gender, firstName, lastName, street, postalCode, city, phone } = body

    // Kunden dürfen nur persönliche Daten ändern - Kundennummer, Objekt und Anschluss-ID
    // werden nur vom Admin verwaltet
    const profile = await prisma.customerProfile.update({
      where: { userId: session.user.id },
      data: {
        gender,
        firstName,
        lastName,
        street,
        postalCode,
        city,
        phone,
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
