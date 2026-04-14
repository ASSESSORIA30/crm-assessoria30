'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nom:      z.string().min(2, 'Nom massa curt'),
  adreca:   z.string().min(3, "L'adreça és obligatòria"),
  poblacio: z.string().min(2, 'Població obligatòria'),
  provincia: z.string().min(2, 'Província obligatòria'),
  email:    z.string().email('Correu electrònic no vàlid'),
  telefon:  z.string().regex(/^[6789]\d{8}$/, 'Telèfon no vàlid (9 dígits)'),
  consentimentComunicacions: z.boolean(),
  consentimentTrucades:      z.boolean(),
})
type FormData = z.infer<typeof schema>

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEPS = ['Dades personals', 'Consentiment', 'Signatura']
const INSTAGRAM = 'https://www.instagram.com/assessoria_3.0/'
const GREEN = '#2a7d4f'

// ─── Signature canvas ──────────────────────────────────────────────────────────

function SignaturePad({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const empty     = useRef(true)

  // White background + reset on mount
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    empty.current   = true
    onChange('')
  }, [onChange])

  useEffect(() => { initCanvas() }, [initCanvas])

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  const onStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawing.current = true
    empty.current   = false
  }

  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const onEnd = () => {
    drawing.current = false
    if (!empty.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'))
    }
  }

  const clear = () => { initCanvas() }

  const isEmpty = !value

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed"
        style={{ borderColor: isEmpty ? '#d1d5db' : GREEN }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full touch-none cursor-crosshair block"
          style={{ height: 160 }}
          onMouseDown={onStart}
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm select-none">Signeu aquí ✍️</p>
          </div>
        )}
      </div>
      {!isEmpty && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-red-500 hover:text-red-700 underline transition-colors"
        >
          Esborrar i tornar a signar
        </button>
      )}
    </div>
  )
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      {STEPS.map((label, i) => {
        const active   = i === step
        const complete = i < step
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: complete ? GREEN : active ? GREEN : '#e5e7eb',
                  color:      complete || active ? '#fff' : '#9ca3af',
                  boxShadow:  active ? `0 0 0 4px ${GREEN}30` : 'none',
                }}
              >
                {complete ? '✓' : i + 1}
              </div>
              <span
                className="mt-1.5 text-xs font-medium text-center leading-tight"
                style={{ color: complete || active ? GREEN : '#9ca3af' }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-5 transition-all duration-300"
                style={{ background: complete ? GREEN : '#e5e7eb' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  required = true,
}: {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span style={{ color: GREEN }}>*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = (err?: string) =>
  `w-full px-4 py-3 text-sm border rounded-xl bg-white placeholder-gray-400
   focus:outline-none focus:ring-2 transition-all ${
     err
       ? 'border-red-400 focus:ring-red-200'
       : 'border-gray-200 focus:ring-[#2a7d4f40] focus:border-[#2a7d4f]'
   }`

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RgpdPage() {
  const [step, setStep]           = useState(0)
  const [signatura, setSignatura] = useState('')
  const [sigError, setSigError]   = useState('')
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [apiError, setApiError]   = useState('')
  const [countdown, setCountdown] = useState(5)

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      consentimentComunicacions: true,
      consentimentTrucades:      true,
    },
  })

  // Countdown after success
  useEffect(() => {
    if (!sent) return
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t)
          window.location.href = INSTAGRAM
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [sent])

  // ── Step navigation ──────────────────────────────────────────────────────
  const nextStep = async () => {
    if (step === 0) {
      const ok = await trigger(['nom', 'adreca', 'poblacio', 'provincia', 'email', 'telefon'])
      if (!ok) return
    }
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setSigError('')
    if (!signatura) {
      setSigError('La signatura és obligatòria')
      return
    }

    setSending(true)
    setApiError('')
    try {
      const res = await fetch('/api/v1/rgpd/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, signatura }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? "Error desconegut")
      }
      setSent(true)
    } catch (err: any) {
      setApiError(err.message ?? "No s'ha pogut enviar. Torneu-ho a intentar.")
    } finally {
      setSending(false)
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f0faf5' }}>
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
            style={{ background: '#e8f5ee' }}
          >
            ✅
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: GREEN }}>
            Formulari enviat!
          </h2>
          <p className="text-gray-600 mb-1">
            Us hem enviat una còpia a{' '}
            <span className="font-semibold text-gray-800">{getValues('email')}</span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Conserveu-la per als vostres registres.
          </p>
          <div
            className="rounded-2xl px-5 py-3 text-sm font-medium"
            style={{ background: '#e8f5ee', color: GREEN }}
          >
            Redirigint a Instagram en{' '}
            <span className="font-bold text-lg">{countdown}</span>s…
          </div>
          <button
            onClick={() => (window.location.href = INSTAGRAM)}
            className="mt-4 w-full py-3 rounded-2xl text-white text-sm font-semibold transition-colors"
            style={{ background: GREEN }}
          >
            Anar a Instagram ara
          </button>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f0faf5' }}>
      {/* Header */}
      <div className="py-6 px-4 text-center" style={{ background: GREEN }}>
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <span className="text-3xl">⚡</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Assessoria 3.0</h1>
        <p className="text-green-200 text-sm mt-1">Formulari de consentiment RGPD</p>
      </div>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8">
          <ProgressBar step={step} />

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ── STEP 0: Dades personals ── */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Dades personals</h2>

                <Field label="Nom i cognoms" error={errors.nom?.message}>
                  <input
                    {...register('nom')}
                    className={inputCls(errors.nom?.message)}
                    placeholder="Maria Garcia López"
                    autoComplete="name"
                  />
                </Field>

                <Field label="Adreça" error={errors.adreca?.message}>
                  <input
                    {...register('adreca')}
                    className={inputCls(errors.adreca?.message)}
                    placeholder="Carrer de la Pau, 12, 3r 2a"
                    autoComplete="street-address"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Població" error={errors.poblacio?.message}>
                    <input
                      {...register('poblacio')}
                      className={inputCls(errors.poblacio?.message)}
                      placeholder="Barcelona"
                      autoComplete="address-level2"
                    />
                  </Field>
                  <Field label="Província" error={errors.provincia?.message}>
                    <input
                      {...register('provincia')}
                      className={inputCls(errors.provincia?.message)}
                      placeholder="Barcelona"
                    />
                  </Field>
                </div>

                <Field label="Correu electrònic" error={errors.email?.message}>
                  <input
                    {...register('email')}
                    type="email"
                    className={inputCls(errors.email?.message)}
                    placeholder="maria@exemple.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </Field>

                <Field label="Telèfon" error={errors.telefon?.message}>
                  <input
                    {...register('telefon')}
                    type="tel"
                    className={inputCls(errors.telefon?.message)}
                    placeholder="612 345 678"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </Field>
              </div>
            )}

            {/* ── STEP 1: Consentiment ── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-800">Consentiment i informació RGPD</h2>

                {/* Legal info box */}
                <div
                  className="rounded-2xl p-4 text-xs text-gray-600 space-y-2 leading-relaxed"
                  style={{ background: '#f0faf5', border: `1px solid ${GREEN}30` }}
                >
                  <p>
                    <strong style={{ color: GREEN }}>Responsable:</strong>{' '}
                    ASSESSORIA 3.0 — lopd@assessoria30.com
                  </p>
                  <p>
                    <strong style={{ color: GREEN }}>Finalitat:</strong>{' '}
                    Gestió de la relació comercial i enviament de comunicacions sobre serveis
                    energètics i d'assessoria.
                  </p>
                  <p>
                    <strong style={{ color: GREEN }}>Legitimació:</strong>{' '}
                    Consentiment exprès de l'interessat/da (art. 6.1.a RGPD), revocable en
                    qualsevol moment.
                  </p>
                  <p>
                    <strong style={{ color: GREEN }}>Conservació:</strong>{' '}
                    Mentre duri la relació comercial i durant els terminis legals posteriors.
                  </p>
                  <p>
                    <strong style={{ color: GREEN }}>Drets:</strong>{' '}
                    Podeu exercir els drets d'accés, rectificació, supressió, portabilitat,
                    limitació i oposició escrivint a{' '}
                    <span style={{ color: GREEN }}>lopd@assessoria30.com</span> adjuntant còpia
                    del DNI.
                  </p>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <input
                      type="checkbox"
                      {...register('consentimentComunicacions')}
                      className="mt-0.5 w-5 h-5 rounded accent-[#2a7d4f] flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Accepto</strong> rebre comunicacions comercials sobre serveis
                      energètics i ofertes per correu electrònic, SMS i altres mitjans digitals.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <input
                      type="checkbox"
                      {...register('consentimentTrucades')}
                      className="mt-0.5 w-5 h-5 rounded accent-[#2a7d4f] flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Accepto</strong> ser contactat/da telefònicament per a fins
                      comercials, assessorament energètic i presentació de serveis.
                    </span>
                  </label>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Podeu revocar el vostre consentiment en qualsevol moment contactant amb nosaltres
                  a{' '}
                  <a href="mailto:lopd@assessoria30.com" style={{ color: GREEN }}>
                    lopd@assessoria30.com
                  </a>
                  . La revocació no afectarà la licitud del tractament realitzat prèviament.
                </p>
              </div>
            )}

            {/* ── STEP 2: Signatura ── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-800">Signatura digital</h2>
                <p className="text-sm text-gray-500">
                  Signeu al requadre per confirmar el vostre consentiment.
                </p>

                {/* Resum dades */}
                <div
                  className="rounded-2xl p-4 text-sm text-gray-700 space-y-1"
                  style={{ background: '#f9fafb' }}
                >
                  <p>
                    <span className="text-gray-400">Nom:</span>{' '}
                    <strong>{getValues('nom')}</strong>
                  </p>
                  <p>
                    <span className="text-gray-400">Data:</span>{' '}
                    <strong>
                      {new Date().toLocaleDateString('ca-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </strong>
                  </p>
                </div>

                <SignaturePad value={signatura} onChange={setSignatura} />
                {sigError && <p className="text-xs text-red-500">{sigError}</p>}

                {apiError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {apiError}
                  </div>
                )}
              </div>
            )}

            {/* ── Buttons ── */}
            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={sending}
                  className="flex-1 py-3.5 rounded-2xl border-2 text-sm font-semibold text-gray-600
                             border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  ← Enrere
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold
                             transition-all hover:opacity-90 active:scale-[.98]"
                  style={{ background: GREEN }}
                >
                  Continuar →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold
                             transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-60"
                  style={{ background: GREEN }}
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Enviant…
                    </span>
                  ) : (
                    '✓ Confirmar i enviar'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 pb-8">
          Assessoria 3.0 · Formulari RGPD conforme (UE) 2016/679 i LOPDGDD 3/2018
        </p>
      </div>
    </div>
  )
}
