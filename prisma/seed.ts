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
          address: ' Verwaltung',
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

  console.log({ admin, tariff })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
