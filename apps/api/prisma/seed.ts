// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const adminHash  = await bcrypt.hash('Admin1234', 12)
  const juanHash   = await bcrypt.hash('juan1234',  12)
  const mariaHash  = await bcrypt.hash('maria1234', 12)

  // Admin
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@assessoria30.cat' },
    update: { passwordHash: adminHash },
    create: {
      name:         'Administrador',
      email:        'admin@assessoria30.cat',
      passwordHash: adminHash,
      role:         'admin',
      treePath:     'root',
      treeLevel:    0,
    },
  })
  await prisma.user.update({ where: { id: admin.id }, data: { treePath: `/${admin.id}` } })

  // Colaborador
  const juan = await prisma.user.upsert({
    where:  { email: 'juan@assessoria30.cat' },
    update: {},
    create: {
      name:         'Juan Domínguez',
      email:        'juan@assessoria30.cat',
      passwordHash: juanHash,
      role:         'collaborator',
      phone:        '654321001',
      parentUserId: admin.id,
      treePath:     'tmp',
      treeLevel:    1,
      commissionPct: 30,
      monthlyTarget: 15,
    },
  })
  await prisma.user.update({ where: { id: juan.id }, data: { treePath: `/${admin.id}/${juan.id}` } })

  // Comercial
  const maria = await prisma.user.upsert({
    where:  { email: 'maria@assessoria30.cat' },
    update: {},
    create: {
      name:         'María Álvarez',
      email:        'maria@assessoria30.cat',
      passwordHash: mariaHash,
      role:         'commercial',
      phone:        '654321002',
      parentUserId: juan.id,
      treePath:     'tmp',
      treeLevel:    2,
      commissionPct: 20,
      monthlyTarget: 10,
    },
  })
  await prisma.user.update({ where: { id: maria.id }, data: { treePath: `/${admin.id}/${juan.id}/${maria.id}` } })

  // Clientes de ejemplo
  const clientsData = [
    { name: 'María García López',  taxId: '47234567X', email: 'mgarcia@email.cat',   phone: '654321100', type: 'individual' as const, status: 'active'    as const, assignedTo: juan.id  },
    { name: 'Comerç Soler SL',     taxId: 'B12345678', email: 'soler@comercsoler.cat',phone: '972345100', type: 'company'    as const, status: 'active'    as const, assignedTo: juan.id  },
    { name: 'Bar Ca la Pepeta',    taxId: 'B87654321', email: 'pepeta@gmail.com',     phone: '607890100', type: 'company'    as const, status: 'potential' as const, assignedTo: maria.id },
    { name: 'Rosa Martínez Puig',  taxId: '35678901Z', email: 'rmartinez@gmail.com', phone: '618234100', type: 'individual' as const, status: 'potential' as const, assignedTo: juan.id  },
    { name: 'Farmàcia Ribas',      taxId: 'B11223344', email: 'farmacia@ribas.cat',  phone: '973001200', type: 'company'    as const, status: 'active'    as const, assignedTo: maria.id },
  ]

  const clients: any[] = []
  for (const c of clientsData) {
    const client = await prisma.client.upsert({
      where:  { taxId: c.taxId },
      update: {},
      create: { ...c, createdBy: c.assignedTo, addressCity: 'Lleida', addressProvince: 'Lleida' },
    })
    clients.push(client)
  }

  // Supplies
  const suppliesData = [
    { clientIdx: 0, cups: 'ES002100001234567800', type: 'electric' as const, currentSupplier: 'Endesa',   tariff: '2.0TD', powerP1: 3.45, annualConsumption: 4200, contractEndDate: new Date(Date.now() + 22*86400000), opportunityScore: 92, opportunityCategory: 'urgent' },
    { clientIdx: 1, cups: 'ES002100005678901200', type: 'electric' as const, currentSupplier: 'Naturgy',  tariff: '3.0TD', powerP1: 10.0, annualConsumption: 12000, contractEndDate: new Date(Date.now() + 45*86400000), opportunityScore: 75, opportunityCategory: 'medium' },
    { clientIdx: 1, cups: 'ES002100009012345600', type: 'gas'      as const, currentSupplier: 'Endesa',   tariff: 'TUR',   powerP1: null, annualConsumption: 8000,  contractEndDate: new Date(Date.now() + 60*86400000), opportunityScore: 55, opportunityCategory: 'medium' },
    { clientIdx: 2, cups: 'ES002100003456789000', type: 'electric' as const, currentSupplier: 'Iberdrola',tariff: '2.0TD', powerP1: 3.45, annualConsumption: 3800,  contractEndDate: new Date(Date.now() + 90*86400000), opportunityScore: 40, opportunityCategory: 'low'    },
    { clientIdx: 3, cups: 'ES002100007890123400', type: 'electric' as const, currentSupplier: 'Holaluz',  tariff: '2.0TD', powerP1: 3.45, annualConsumption: 3200,  contractEndDate: new Date(Date.now() + 12*86400000), opportunityScore: 98, opportunityCategory: 'urgent' },
  ]

  const supplies: any[] = []
  for (const s of suppliesData) {
    const { clientIdx, ...data } = s
    const supply = await prisma.supply.upsert({
      where:  { cups: data.cups },
      update: {},
      create: {
        ...data,
        clientId:   clients[clientIdx].id,
        assignedTo: clients[clientIdx].assignedTo,
        addressCity: 'Lleida',
        createdBy:  clients[clientIdx].assignedTo,
      },
    })
    supplies.push(supply)
  }

  // Oportunidades
  const oppData = [
    { title: 'Renovació llum Garcia',  clientIdx: 0, supplyIdx: 0, agentId: juan.id,  stage: 'new_lead'    as const, serviceType: 'electric' as const, estimatedValue: 101, contactStatus: 'not_contacted' as const },
    { title: 'Renovació llum Soler',   clientIdx: 1, supplyIdx: 1, agentId: juan.id,  stage: 'contacted'   as const, serviceType: 'electric' as const, estimatedValue: 134, contactStatus: 'contacted'     as const },
    { title: 'Renovació gas Soler',    clientIdx: 1, supplyIdx: 2, agentId: juan.id,  stage: 'comparison'  as const, serviceType: 'gas'      as const, estimatedValue:  89, contactStatus: 'in_conversation' as const },
    { title: 'Llum Pepeta',            clientIdx: 2, supplyIdx: 3, agentId: maria.id, stage: 'presented'   as const, serviceType: 'electric' as const, estimatedValue:  62, contactStatus: 'in_conversation' as const },
    { title: 'Renovació Martínez',     clientIdx: 3, supplyIdx: 4, agentId: juan.id,  stage: 'new_lead'    as const, serviceType: 'electric' as const, estimatedValue:  98, contactStatus: 'not_contacted' as const },
  ]

  for (const o of oppData) {
    const { clientIdx, supplyIdx, agentId, ...data } = o
    await prisma.opportunity.create({
      data: {
        ...data,
        clientId:       clients[clientIdx].id,
        supplyId:       supplies[supplyIdx].id,
        assignedAgentId: agentId,
        createdBy:      agentId,
      },
    })
  }

  console.log('✅ Seed completat!')
  console.log('')
  console.log('Credencials:')
  console.log('  admin@assessoria30.cat  / admin1234')
  console.log('  juan@assessoria30.cat   / juan1234')
  console.log('  maria@assessoria30.cat  / maria1234')
}

main().catch(console.error).finally(() => prisma.$disconnect())
