import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { billingPeriod: true },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(invoices)
}
