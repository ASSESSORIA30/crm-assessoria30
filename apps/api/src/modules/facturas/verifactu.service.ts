import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import { create } from 'xmlbuilder2'

export interface FacturaData {
  numero: string
  serie: string
  dataFactura: string
  baseImponible: number
  ivaImport: number
  total: number
  clientNif: string
  clientNom: string
}

@Injectable()
export class VerifactuService {
  private readonly logger = new Logger(VerifactuService.name)

  private get nifEmisor() { return process.env.EMPRESA_NIF ?? '' }
  private get nomEmisor() { return process.env.EMPRESA_NOM ?? '' }
  private get isProduction() { return process.env.VERIFACTU_PRODUCCION === 'true' }

  private get aeatEndpoint() {
    return this.isProduction
      ? 'https://www7.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP'
      : 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP'
  }

  generateHash(factura: FacturaData, hashAnterior: string): string {
    const chain = [
      this.nifEmisor,
      factura.numero,
      factura.dataFactura,
      factura.baseImponible.toFixed(2),
      factura.ivaImport.toFixed(2),
      hashAnterior,
    ].join('|')
    return crypto.createHash('sha256').update(chain).digest('hex').toUpperCase()
  }

  generateQrUrl(factura: FacturaData): string {
    const params = new URLSearchParams({
      nif: this.nifEmisor,
      numserie: factura.serie,
      num: factura.numero,
      importe: factura.total.toFixed(2),
    })
    return `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${params}`
  }

  generateXml(factura: FacturaData, hash: string, hashAnterior: string): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('soapenv:Envelope', {
        'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
        'xmlns:sf': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SistemaFacturacion.xsd',
      })
      .ele('soapenv:Header').up()
      .ele('soapenv:Body')
        .ele('sf:RegFactuSistemaFacturacion')
          .ele('sf:Cabecera')
            .ele('sf:ObligadoEmision')
              .ele('sf:NombreRazon').txt(this.nomEmisor).up()
              .ele('sf:NIF').txt(this.nifEmisor).up()
            .up()
          .up()
          .ele('sf:RegistroFactura')
            .ele('sf:RegistroAlta')
              .ele('sf:IDFactura')
                .ele('sf:IDEmisorFactura').txt(this.nifEmisor).up()
                .ele('sf:NumSerieFactura').txt(`${factura.serie}-${factura.numero}`).up()
                .ele('sf:FechaExpedicionFactura').txt(factura.dataFactura).up()
              .up()
              .ele('sf:NombreRazonDestinatario').txt(factura.clientNom).up()
              .ele('sf:NIFDestinatario').txt(factura.clientNif).up()
              .ele('sf:TipoFactura').txt('F1').up()
              .ele('sf:ClaveRegimenIvaEsp').txt('01').up()
              .ele('sf:ImporteTotal').txt(factura.total.toFixed(2)).up()
              .ele('sf:Desglose')
                .ele('sf:DetalleDesglose')
                  .ele('sf:BaseImponible').txt(factura.baseImponible.toFixed(2)).up()
                  .ele('sf:TipoImpositivo').txt('21.00').up()
                  .ele('sf:CuotaRepercutida').txt(factura.ivaImport.toFixed(2)).up()
                .up()
              .up()
              .ele('sf:Encadenamiento')
                .ele('sf:RegistroAnterior')
                  .ele('sf:Huella').txt(hashAnterior || '').up()
                .up()
              .up()
              .ele('sf:SistemaInformatico')
                .ele('sf:NombreRazon').txt('Assessoria 3.0').up()
                .ele('sf:NIF').txt(this.nifEmisor).up()
                .ele('sf:IdSistemaInformatico').txt('CRM-A30').up()
                .ele('sf:Version').txt('1.0').up()
                .ele('sf:NumeroInstalacion').txt('001').up()
              .up()
              .ele('sf:Huella').txt(hash).up()
            .up()
          .up()
        .up()
      .up()
    .up()
    return doc.end({ prettyPrint: true })
  }

  async submitToAeat(xml: string): Promise<{ success: boolean; response: any }> {
    try {
      this.logger.log(`Submitting to AEAT (${this.isProduction ? 'PRODUCTION' : 'TEST'})`)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const response = await fetch(this.aeatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'sf:RegFactuSistemaFacturacion',
        },
        body: xml,
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await response.text()
      const success = response.status === 200
      this.logger.log(`AEAT response: ${response.status}`)
      return {
        success,
        response: { status: response.status, statusText: response.statusText, data: data.substring(0, 2000) },
      }
    } catch (error: any) {
      this.logger.error(`AEAT submission failed: ${error.message}`)
      return { success: false, response: { error: error.message } }
    }
  }
}
