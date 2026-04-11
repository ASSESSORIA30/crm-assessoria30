// apps/api/prisma/ensure-admin.ts
// Runs on every Railway deploy to ensure the admin user exists with the correct password.
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin1234', 12)

  const user = await prisma.user.upsert({
    where:  { email: 'admin@assessoria30.cat' },
    update: { passwordHash },
    create: {
      name:         'Administrador',
      email:        'admin@assessoria30.cat',
      passwordHash,
      role:         'admin',
      treePath:     'root',
      treeLevel:    0,
      isActive:     true,
    },
  })

  // Fix treePath after insert
  await prisma.user.update({
    where: { id: user.id },
    data:  { treePath: `/${user.id}` },
  })

  console.log(`[ensure-admin] Admin user ready: ${user.email}`)
}

main()
  .catch(e => { console.error('[ensure-admin] ERROR:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
