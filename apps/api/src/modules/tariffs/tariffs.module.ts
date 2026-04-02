import { Module, Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Body } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'

const TARIFF_PROMPT = [
  'You are an expert in commission protocols and commercial tariffs.',
  'Analyze this document and extract ALL commissions, tariffs and incentives.',
  'It can be from energy, telecommunications, or any other sector.',
  'Return ONLY a JSON array without any other text:',
  '[{',
  '"company": "company/provider name",',
  '"tariff_type": "product or tariff type",',
  '"valid_from": "YYYY-MM-DD or null",',
  '"valid_until": "YYYY-MM-DD or null",',
  '"energy_price_p1": null, "energy_price_p2": null, "energy_price_p3": null,',
  '"energy_price_p4": null, "energy_price_p5": null, "energy_price_p6": null,',
  '"power_price_p1": null, "power_price_p2": null, "power_price_p3": null,',
  '"power_price_p4": null, "power_price_p5": null, "power_price_p6": null,',
  '"commission_kwh": null,',
  '"commission_power": null,',
  '"bonus": "description of bonuses, volume incentives, loyalty, etc.",',
  '"permanence_months": null,',
  '"conditions": "all conditions, payment terms, penalties, etc."',
  '}]',
  'IMPORTANT: If document has multiple products or categories (fiber, mobile, TV, convergent), create one entry per category.',
].join('\n')

@Controller('tariffs')
@UseGuards(JwtAuthGuard)
export class TariffsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.tariff.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(@UploadedFile() file: any, @Body() body: any, @CurrentUser() user: any) {
    const base64 = file.buffer.toString('base64')
    const mediaType = file.mimetype as 'image/jpeg' | 'image/png' | 'application/pdf'

    const content: any[] = [
      {
        type: mediaType === 'application/pdf' ? 'document' : 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      },
      {
        type: 'text',
        text: TARIFF_PROMPT,
      }
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }]
      })
    })

    const data = await response.json()
    const text = data.content[0].text

    let extracted: any[] = []
    try {
      extracted = JSON.parse(text.replace(/```json|```/g, '').trim())
      if (!Array.isArray(extracted)) extracted = [extracted]
    } catch {}

    const saved = await Promise.all(extracted.map((t: any) =>
      this.prisma.tariff.create({
        data: {
          company: t.company || null,
          tariffType: t.tariff_type || null,
          validFrom: t.valid_from ? new Date(t.valid_from) : null,
          validUntil: t.valid_until ? new Date(t.valid_until) : null,
          energyPriceP1: t.energy_price_p1 || null,
          energyPriceP2: t.energy_price_p2 || null,
          energyPriceP3: t.energy_price_p3 || null,
          energyPriceP4: t.energy_price_p4 || null,
          energyPriceP5: t.energy_price_p5 || null,
          energyPriceP6: t.energy_price_p6 || null,
          powerPriceP1: t.power_price_p1 || null,
          powerPriceP2: t.power_price_p2 || null,
          powerPriceP3: t.power_price_p3 || null,
          powerPriceP4: t.power_price_p4 || null,
          powerPriceP5: t.power_price_p5 || null,
          powerPriceP6: t.power_price_p6 || null,
          commissionKwh: t.commission_kwh || null,
          commissionPower: t.commission_power || null,
          bonus: t.bonus || null,
          permanenceMonths: t.permanence_months || null,
          conditions: t.conditions || null,
          extractedData: t,
          fileName: file.originalname,
          createdBy: user.id,
        }
      })
    ))

    return { tariffs: saved, extracted }
  }
}

@Module({
  controllers: [TariffsController],
  providers: [PrismaService],
})
export class TariffsModule {}
