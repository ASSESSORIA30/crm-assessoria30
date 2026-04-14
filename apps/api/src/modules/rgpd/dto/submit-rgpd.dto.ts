import { IsBoolean, IsEmail, IsString, MinLength } from 'class-validator'

export class SubmitRgpdDto {
  @IsString() @MinLength(2)
  nom: string

  @IsString() @MinLength(2)
  adreca: string

  @IsString() @MinLength(2)
  poblacio: string

  @IsString() @MinLength(2)
  provincia: string

  @IsEmail()
  email: string

  @IsString() @MinLength(9)
  telefon: string

  @IsBoolean()
  consentimentComunicacions: boolean

  @IsBoolean()
  consentimentTrucades: boolean

  @IsString()
  signatura: string // data:image/png;base64,... de la signatura canvas
}
