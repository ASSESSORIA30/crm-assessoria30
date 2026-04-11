import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('type')   type?: string,
  ) {
    return this.prisma.supply.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(type   && { type:   type   as any }),
      },
      include: {
        client: { select: { id: true, name: true, taxId: true, phone: true } },
        agent:  { select: { id: true, name: true } },
      },
      orderBy: [
        { contractEndDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 500,
    })
  }
}
