// apps/web/src/components/dashboard/action-modal.tsx
'use client'
import { useState }     from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Phone, MessageCircle, Mail, Copy, Check, Loader2 } from 'lucide-react'
import { toast }        from 'sonner'
import { oppApi }       from '@/lib/api'
import { cn, SERVICE_ICON } from '@/lib/utils'

type ModalType = 'call' | 'whatsapp' | 'email'

interface Props {
  opp: any
  type: ModalType
  onClose: () => void
}

const OUTCOMES = [
  { value: 'interested',         label: '✅ Interessat/ada, envio comparativa' },
  { value: 'callback_requested', label: '🔄 Trucar més tard'                  },
  { value: 'no_answer',          label: '📵 No contesta'                      },
  { value: 'not_interested',     label: '❌ No interessat/ada'                },
]

function buildWAMessage(opp: any, status: string): string {
  const name    = opp.client?.name?.split(' ')[0] ?? opp.client?.name ?? 'client'
  const saving  = opp.estimatedValue ? `${Math.round(opp.estimatedValue)}€` : 'importants'
  const supplier= opp.supply?.currentSupplier ?? 'la comercialitzadora actual'
  const days    = opp.supply?.contractEndDate
    ? Math.max(0, Math.ceil((new Date(opp.supply.contractEndDate).getTime() - Date.now()) / 86400000))
    : null

  if (status === 'not_contacted') {
    return `Hola ${name}! 👋 Sóc en Juan de l'Assessoria 3.0.\n\nHe revisat el teu contracte de ${supplier} i podries estalviar fins a ${saving} a l'any.\n\nEt puc enviar la comparativa? Triga 2 minuts revisar-la 😊\n\n654 321 XXX`
  }
  if (status === 'contacted') {
    return `Hola ${name}! 😊 Et torno a escriure per la proposta que et vaig enviar${days ? `. El contracte acaba en ${days} dies` : ''}.\n\nL'estalvi potencial és de ${saving}/any. Tens 2 minuts? 654 321 XXX`
  }
  return `Hola ${name}! Segueixo aquí per si tens dubtes. Tot bé? 😊\n\n654 321 XXX`
}

function buildEmailMessage(opp: any): string {
  const name    = opp.client?.name ?? 'client'
  const saving  = opp.estimatedValue ? `${Math.round(opp.estimatedValue)}€` : 'importants'
  const supplier= opp.supply?.currentSupplier ?? 'la comercialitzadora actual'
  return `Proposta d'estalvi — ${supplier}\n\n---\n\nHola ${name},\n\nEm poso en contacte des de l'Assessoria 3.0 per una oportunitat que hem identificat al vostre contracte.\n\nAmb el vostre perfil de consum, existeixen ofertes al mercat que permetrien un estalvi de fins a ${saving} anuals.\n\nT'adjunto la comparativa detallada. El canvi és gratuït i el gestiono jo.\n\nUna salutació,\nJuan Domínguez · Assessoria 3.0\n654 321 XXX`
}

function buildArgument(opp: any): string {
  const name    = opp.client?.name?.split(' ')[0] ?? opp.client?.name
  const saving  = opp.estimatedValue ? `${Math.round(opp.estimatedValue)}€` : 'uns euros'
  const supplier= opp.supply?.currentSupplier ?? 'la seva comercialitzadora'
  const days    = opp.supply?.contractEndDate
    ? Math.max(0, Math.ceil((new Date(opp.supply.contractEndDate).getTime() - Date.now()) / 86400000))
    : null
  if (days && days <= 30)
    return `"${name}, el seu contracte amb ${supplier} acaba en ${days} dies. Tenim una oferta que li estalvia ${saving} a l'any. Dos minuts?"`
  return `"Hola ${name}, he detectat que podria estalviar ${saving}/any. Puc explicar-li en 2 minuts?"`
}

export function ActionModal({ opp, type, onClose }: Props) {
  const qc = useQueryClient()
  const [outcome,    setOutcome]    = useState<string | null>(null)
  const [note,       setNote]       = useState('')
  const [message,    setMessage]    = useState(
    type === 'whatsapp' ? buildWAMessage(opp, opp.contactStatus)
      : type === 'email' ? buildEmailMessage(opp)
      : '',
  )
  const [copied, setCopied] = useState(false)

  const { mutate: saveActivity, isPending } = useMutation({
    mutationFn: (data: any) => oppApi.activity(opp.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Activitat registrada')
      onClose()
    },
    onError: () => toast.error("Error en registrar l'activitat"),
  })

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const phone = opp.client?.phone ?? '—'
  const email = opp.client?.email ?? '—'

  const handleWA = () => {
    const clean = phone.replace(/\s/g, '').replace('+', '')
    const num   = clean.startsWith('34') ? clean : `34${clean}`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank')
    saveActivity({ type: 'whatsapp', outcome: 'comparison_sent', messageText: message })
  }

  const handleEmail = () => {
    const lines   = message.split('\n')
    const subject = encodeURIComponent(lines[0])
    const body    = encodeURIComponent(lines.slice(2).join('\n'))
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
    saveActivity({ type: 'email', outcome: 'comparison_sent', messageText: message })
  }

  const handleSaveCall = () => {
    if (!outcome) { toast.warning('Selecciona un resultat'); return }
    saveActivity({ type: 'call', outcome, note: note || undefined })
  }

  const ICONS = { call: Phone, whatsapp: MessageCircle, email: Mail }
  const Icon  = ICONS[type]
  const TITLES = {
    call:      `Trucada a ${opp.client?.name}`,
    whatsapp:  `WhatsApp a ${opp.client?.name}`,
    email:     `Email a ${opp.client?.name}`,
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">{TITLES[type]}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Contacto */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              {type === 'email' ? 'Email' : 'Telèfon'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 font-mono">{type === 'email' ? email : phone}</span>
              <button onClick={() => copy(type === 'email' ? email : phone)}
                className="text-xs text-blue-600 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition-all">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copiar
              </button>
            </div>
          </div>

          {/* Contexto */}
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
            {opp.supply?.currentSupplier && <div>Comercialitzadora: <strong>{opp.supply.currentSupplier}</strong></div>}
            {opp.estimatedValue   && <div>Estalvi estimat: <strong className="text-green-700">{Math.round(opp.estimatedValue)}€/any</strong></div>}
            {opp.supply?.contractEndDate && (
              <div>Venciment: <strong>
                {Math.max(0, Math.ceil((new Date(opp.supply.contractEndDate).getTime() - Date.now()) / 86400000))} dies
              </strong></div>
            )}
          </div>

          {/* Argument (trucada) */}
          {type === 'call' && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-1.5">✦ Argument suggerit</p>
              <p className="text-xs text-blue-800 italic leading-relaxed">{buildArgument(opp)}</p>
              <button onClick={() => copy(buildArgument(opp))} className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:text-blue-700">
                <Copy className="w-3 h-3" /> Copiar argument
              </button>
            </div>
          )}

          {/* Missatge (WA/email) */}
          {type !== 'call' && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Missatge</p>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={type === 'email' ? 7 : 5}
                className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
              <p className="text-right text-[10px] text-gray-400 mt-1">{message.length} caràcters</p>
            </div>
          )}

          {/* Resultat trucada */}
          {type === 'call' && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Resultat</p>
              <div className="space-y-2">
                {OUTCOMES.map(o => (
                  <button key={o.value} onClick={() => setOutcome(o.value)}
                    className={cn(
                      'w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all',
                      outcome === o.value
                        ? 'border-blue-400 bg-blue-50 text-blue-800 font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Nota opcional (p.ex. 'Trucar dimecres al matí')..."
                rows={2}
                className="mt-3 w-full text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pb-5 pt-3 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel·lar</button>
          {type === 'call' && (
            <button onClick={handleSaveCall} disabled={isPending || !outcome}
              className="btn-primary flex-1 justify-center">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Desar
            </button>
          )}
          {type === 'whatsapp' && (
            <button onClick={handleWA} disabled={isPending} className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Obrir WhatsApp →
            </button>
          )}
          {type === 'email' && (
            <button onClick={handleEmail} disabled={isPending} className="btn-primary flex-1 justify-center">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
