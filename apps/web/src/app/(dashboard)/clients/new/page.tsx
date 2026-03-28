// apps/web/src/app/(dashboard)/clients/new/page.tsx
'use client'
import { useRouter } from 'next/navigation'
import { useForm }   from 'react-hook-form'
import { zodResolver }from '@hookform/resolvers/zod'
import { z }         from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { toast }      from 'sonner'
import Link           from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { cn }         from '@/lib/utils'

const schema = z.object({
  type:    z.enum(['individual', 'company']),
  name:    z.string().min(2, 'Mínim 2 caràcters'),
  taxId:   z.string().optional(),
  email:   z.string().email('Email no vàlid').optional().or(z.literal('')),
  phone:   z.string().optional(),
  status:  z.enum(['active', 'potential', 'inactive']).default('potential'),
  source:  z.string().optional(),
  notes:   z.string().optional(),
  addressStreet:   z.string().optional(),
  addressCity:     z.string().optional(),
  addressProvince: z.string().optional(),
  addressZip:      z.string().optional(),
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

export default function NewClientPage() {
  const router = useRouter()
  const qc     = useQueryClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'individual', status: 'potential' },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client creat correctament')
      router.push(`/clients/${data.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error en crear el client'),
  })

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nou client</h1>
          <p className="text-sm text-gray-500">Omple les dades bàsiques del client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutate(d))} className="space-y-6">
        {/* Tipus + Estat */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Informació bàsica</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipus de client" error={errors.type?.message} required>
              <select {...register('type')} className="input">
                <option value="individual">Particular</option>
                <option value="company">Empresa</option>
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
            <Field label={watch('type') === 'company' ? 'Raó social' : 'Nom complet'} error={errors.name?.message} required>
              <input {...register('name')} placeholder={watch('type') === 'company' ? 'Empresa SL' : 'Joan García López'} className={cn('input', errors.name && 'border-red-400')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Field label={watch('type') === 'company' ? 'CIF' : 'NIF/NIE'} error={errors.taxId?.message}>
              <input {...register('taxId')} placeholder={watch('type') === 'company' ? 'B12345678' : '12345678Z'} className="input" />
            </Field>
            <Field label="Origen" error={errors.source?.message}>
              <input {...register('source')} placeholder="Referit, web, trucada..." className="input" />
            </Field>
          </div>
        </div>

        {/* Contacte */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Contacte</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telèfon" error={errors.phone?.message}>
              <input {...register('phone')} type="tel" placeholder="654 321 XXX" className="input" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="client@email.cat" className="input" />
            </Field>
          </div>
        </div>

        {/* Adreça */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Adreça fiscal</h2>
          <div className="space-y-4">
            <Field label="Carrer" error={errors.addressStreet?.message}>
              <input {...register('addressStreet')} placeholder="C/ Major, 23, 2n 1a" className="input" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Ciutat" error={errors.addressCity?.message}>
                <input {...register('addressCity')} placeholder="Lleida" className="input" />
              </Field>
              <Field label="Província" error={errors.addressProvince?.message}>
                <input {...register('addressProvince')} placeholder="Lleida" className="input" />
              </Field>
              <Field label="CP" error={errors.addressZip?.message}>
                <input {...register('addressZip')} placeholder="25001" className="input" />
              </Field>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes internes</h2>
          <textarea {...register('notes')} rows={3} placeholder="Observacions, preferències, context comercial..." className="input resize-none" />
        </div>

        {/* Botons */}
        <div className="flex gap-3 pb-6">
          <Link href="/clients" className="btn-secondary">Cancel·lar</Link>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Creant...' : 'Crear client'}
          </button>
        </div>
      </form>
    </div>
  )
}
