import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nahwaerme.local' },
    update: {},
    create: {
      email: 'admin@nahwaerme.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'Administrator',
          street: 'Rathausplatz 1',
          postalCode: '12345',
          city: 'Musterstadt',
        }
      }
    },
  })

  const tariff = await prisma.tariff.create({
    data: {
      name: 'Standardtarif 2024',
      validFrom: new Date('2024-01-01'),
      energyPrice: 0.12,
      basePrice: 120,
    }
  })

  const customerPassword = await bcrypt.hash('kunde123', 12)
  
  const customer = await prisma.user.upsert({
    where: { email: 'kunde@example.com' },
    update: {},
    create: {
      email: 'kunde@example.com',
      passwordHash: customerPassword,
      role: 'USER',
      status: 'ACTIVE',
      profile: {
        create: {
          gender: 'Herr',
          firstName: 'Max',
          lastName: 'Mustermann',
          street: 'Musterstraße 123',
          postalCode: '12345',
          city: 'Musterstadt',
          phone: '01234 56789',
          objectName: 'Wohnung 1',
          customerNumber: 'KU-2024-001',
        }
      },
      meterEntries: {
        create: [
          { date: new Date('2024-01-15'), value: 10000, entryType: 'METER_READING' },
          { date: new Date('2024-02-15'), value: 10250, entryType: 'METER_READING' },
          { date: new Date('2024-03-15'), value: 10500, entryType: 'METER_READING' },
          { date: new Date('2024-04-15'), value: 10700, entryType: 'METER_READING' },
          { date: new Date('2024-05-15'), value: 10850, entryType: 'METER_READING' },
          { date: new Date('2024-06-15'), value: 10950, entryType: 'METER_READING' },
          { date: new Date('2024-07-15'), value: 11000, entryType: 'METER_READING' },
          { date: new Date('2024-08-15'), value: 11050, entryType: 'METER_READING' },
          { date: new Date('2024-09-15'), value: 11150, entryType: 'METER_READING' },
          { date: new Date('2024-10-15'), value: 11300, entryType: 'METER_READING' },
          { date: new Date('2024-11-15'), value: 11500, entryType: 'METER_READING' },
          { date: new Date('2024-12-15'), value: 11750, entryType: 'METER_READING' },
          { date: new Date('2025-01-15'), value: 12000, entryType: 'METER_READING' },
          { date: new Date('2025-02-15'), value: 12200, entryType: 'METER_READING' },
        ]
      }
    },
  })

  // Abschlag für den Testkunden erstellen
  const installment = await prisma.installment.create({
    data: {
      userId: customer.id,
      amount: 45, // 45€/Monat
      validFrom: new Date('2024-01-01'),
      validTo: null, // aktuell gültig
    }
  })

  console.log({ admin, tariff, customer, installment })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
