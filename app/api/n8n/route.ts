import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const n8nMeterEntrySchema = z.object({
  action: z.enum(['createMeterEntry', 'getUser', 'getUsers']),
  userEmail: z.string().email().optional(),
  date: z.string().optional(),
  value: z.number().positive().optional(),
  entryType: z.enum(['METER_READING', 'CONSUMPTION']).optional(),
  comment: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-n8n-api-key')
    
    if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userEmail, date, value, entryType, comment } = n8nMeterEntrySchema.parse(body)

    if (action === 'getUsers') {
      const users = await prisma.user.findMany({
        where: { role: 'USER', status: 'ACTIVE' },
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              street: true,
              postalCode: true,
              city: true,
              customerNumber: true,
            }
          }
        }
      })
      return NextResponse.json({ users })
    }

    if (action === 'getUser') {
      if (!userEmail) {
        return NextResponse.json({ error: 'userEmail required' }, { status: 400 })
      }
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { 
          profile: true,
          meterEntries: { orderBy: { date: 'desc' }, take: 12 },
          installments: { orderBy: { validFrom: 'desc' }, take: 1 },
        }
      })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ user })
    }

    if (action === 'createMeterEntry') {
      if (!userEmail || !date || !value) {
        return NextResponse.json({ error: 'userEmail, date, value required' }, { status: 400 })
      }
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const entry = await prisma.meterEntry.create({
        data: {
          userId: user.id,
          date: new Date(date),
          value,
          entryType: entryType || 'METER_READING',
          comment,
        }
      })
      return NextResponse.json({ success: true, entry })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-n8n-api-key')
  
  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ 
    message: 'n8n API is running',
    actions: ['createMeterEntry', 'getUser', 'getUsers']
  })
}
