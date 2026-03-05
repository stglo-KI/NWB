import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const billingPeriodId = searchParams.get('billingPeriodId')

  const invoices = await prisma.invoice.findMany({
    where: billingPeriodId ? { billingPeriodId } : undefined,
    include: {
      user: { include: { profile: true } },
      billingPeriod: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(invoices)
}
