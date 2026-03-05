import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

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
      data: data
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
