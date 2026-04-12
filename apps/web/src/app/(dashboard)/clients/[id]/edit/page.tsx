// apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx
'use client'
import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm }   from 'react-hook-form'
import { zodResolver }from '@hookform/resolvers/zod'
import { z }         from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { toast }      from 'sonner'
import Link           from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { cn }         from '@/lib/utils'

const CP_PROVINCE: Record<string, string> = {
  '01': 'ÁLAVA',        '02': 'ALBACETE',    '03': 'ALICANTE',   '04': 'ALMERÍA',
  '05': 'ÁVILA',        '06': 'BADAJOZ',     '07': 'BALEARES',   '08': 'BARCELONA',
  '09': 'BURGOS',       '10': 'CÁCERES',     '11': 'CÁDIZ',      '12': 'CASTELLÓN',
  '13': 'CIUDAD REAL',  '14': 'CÓRDOBA',     '15': 'LA CORUÑA',  '16': 'CUENCA',
  '17': 'GERONA',       '18': 'GRANADA',     '19': 'GUADALAJARA','20': 'GUIPÚZCOA',
  '21': 'HUELVA',       '22': 'HUESCA',      '23': 'JAÉN',       '24': 'LEÓN',
  '25': 'LLEIDA',       '26': 'LA RIOJA',    '27': 'LUGO',       '28': 'MADRID',
  '29': 'MÁLAGA',       '30': 'MURCIA',      '31': 'NAVARRA',    '32': 'ORENSE',
  '33': 'ASTURIAS',     '34': 'PALENCIA',    '35': 'LAS PALMAS', '36': 'PONTEVEDRA',
  '37': 'SALAMANCA',    '38': 'SANTA CRUZ DE TENERIFE', '39': 'CANTABRIA', '40': 'SEGOVIA',
  '41': 'SEVILLA',      '42': 'SORIA',       '43': 'TARRAGONA',  '44': 'TERUEL',
  '45': 'TOLEDO',       '46': 'VALENCIA',    '47': 'VALLADOLID', '48': 'VIZCAYA',
  '49': 'ZAMORA',       '50': 'ZARAGOZA',    '51': 'CEUTA',      '52': 'MELILLA',
}

const schema = z.object({
  type:    z.enum(['individual', 'company', 'autonom']),
  name:    z.string().min(2, 'Mínim 2 caràcters'),
  taxId:   z.string().optional(),
  email:   z.string().email('Email no vàlid').optional().or(z.literal('')),
  phone:   z.string().optional(),
  fixedPhone: z.string().optional(),
  status:  z.enum(['active', 'potential', 'inactive']),
  source:  z.string().optional(),
  notes:   z.string().optional(),
  addressStreet:   z.string().optional(),
  addressCity:     z.string().optional(),
  addressProvince: z.string().optional(),
  addressZip:      z.string().optional(),
  representantName: z.string().optional(),
  representantDni:  z.string().optional(),
})
type Form = z.infer<typeof schema>

function Field({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const qc     = useQueryClient()
  const prevAutoProvince = useRef<string>('')

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', params.id],
    queryFn:  () => clientsApi.get(params.id),
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'individual', status: 'potential' },
  })

  // Pre-fill form once client data arrives
  useEffect(() => {
    if (!client) return
    reset({
      type:            client.type     ?? 'individual',
      name:            client.name     ?? '',
      taxId:           client.taxId    ?? '',
      email:           client.email    ?? '',
      phone:           client.phone    ?? '',
      fixedPhone:      client.fixedPhone ?? '',
      status:          client.status   ?? 'potential',
      source:          client.source   ?? '',
      notes:           client.notes    ?? '',
      addressStreet:   client.addressStreet   ?? '',
      addressCity:     client.addressCity     ?? '',
      addressProvince: client.addressProvince ?? '',
      addressZip:      client.addressZip      ?? '',
      representantName: client.representantName ?? '',
      representantDni:  client.representantDni  ?? '',
    })
    prevAutoProvince.current = client.addressProvince ?? ''
  }, [client, reset])

  const type      = watch('type')
  const zipValue  = watch('addressZip')
  const isCompany = type === 'company'

  useEffect(() => {
    const prefix = (zipValue ?? '').slice(0, 2)
    if (prefix.length === 2 && /^\d{2}$/.test(prefix)) {
      const detected = CP_PROVINCE[prefix]
      if (detected) {
        const currentProvince = (watch('addressProvince') ?? '').trim()
        if (!currentProvince || currentProvince === prevAutoProvince.current) {
          setValue('addressProvince', detected, { shouldDirty: true })
          prevAutoProvince.current = detected
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipValue])

  const { mutate, isPending } = useMutation({
    mutationFn: (d: Form) => clientsApi.update(params.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', params.id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client actualitzat')
      router.push(`/clients/${params.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error actualitzant el client'),
  })

  if (isLoading) return (
    <div className="max-w-2xl space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/clients/${params.id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Editar client</h1>
          <p className="text-sm text-gray-500">{client?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutate(d))} className="space-y-6">
        {/* Informació bàsica */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Informació bàsica</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipus de client" error={errors.type?.message} required>
              <select {...register('type')} className="input">
                <option value="individual">Particular</option>
                <option value="company">Empresa</option>
                <option value="autonom">Autònom</option>
              </select>
            </Field>
            <Field label="Estat" error={errors.status?.message}>
              <select {...register('status')} className="input">
                <option value="potential">Potencial</option>
                <option value="active">Actiu</option>
                <option value="inactive">Inactiu</option>
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <Field label={isCompany ? 'Raó social' : 'Nom complet'} error={errors.name?.message} required>
              <input {...register('name')} className={cn('input', errors.name && 'border-red-400')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Field label={isCompany ? 'CIF' : 'NIF/NIE'} error={errors.taxId?.message}>
              <input {...register('taxId')} className="input" />
            </Field>
            <Field label="Origen" error={errors.source?.message}>
              <input {...register('source')} className="input" />
            </Field>
          </div>

          {isCompany && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Field label="Nom del representant" error={errors.representantName?.message}>
                <input {...register('representantName')} className="input bg-white" />
              </Field>
              <Field label="DNI del representant" error={errors.representantDni?.message}>
                <input {...register('representantDni')} className="input bg-white" />
              </Field>
            </div>
          )}
        </div>

        {/* Contacte */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Contacte</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mòbil" error={errors.phone?.message}>
              <input {...register('phone')} type="tel" className="input" />
            </Field>
            <Field label="Telèfon fix" error={errors.fixedPhone?.message}>
              <input {...register('fixedPhone')} type="tel" className="input" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input" />
            </Field>
          </div>
        </div>

        {/* Adreça */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Adreça fiscal</h2>
          <div className="space-y-4">
            <Field label="Carrer" error={errors.addressStreet?.message}>
              <input {...register('addressStreet')} className="input" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Codi postal" error={errors.addressZip?.message}>
                <input {...register('addressZip')} maxLength={5} className="input" />
              </Field>
              <Field label="Província" error={errors.addressProvince?.message}>
                <input {...register('addressProvince')} className="input" />
              </Field>
              <Field label="Ciutat" error={errors.addressCity?.message}>
                <input {...register('addressCity')} className="input" />
              </Field>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes internes</h2>
          <textarea {...register('notes')} rows={3} className="input resize-none" />
        </div>

        <div className="flex gap-3 pb-6">
          <Link href={`/clients/${params.id}`} className="btn-secondary">Cancel·lar</Link>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Guardant...' : 'Guardar canvis'}
          </button>
        </div>
      </form>
    </div>
  )
}
