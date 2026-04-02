'use client'
import { useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

export default function ProtocolUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setResult(null)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/protocols/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      })
      setResult(res.data.extracted)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Error processant el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Parsejar Protocol de Comissions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Puja un PDF de protocol de comissions i el sistema extraurà automàticament les dades amb IA.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null) }}
          />
          {file ? (
            <div className="flex items-center gap-3 text-gray-700">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="w-8 h-8" />
              <p className="text-sm">Clica per seleccionar un PDF</p>
            </div>
          )}
        </label>

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processant amb IA...</>
          ) : (
            <><Upload className="w-4 h-4" /> Analitzar Protocol</>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-green-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-sm text-gray-900">Resultat de l&apos;anàlisi</h2>
          </div>

          <div className="p-6 space-y-4">
            {result.proveedor && (
              <Field label="Proveïdor" value={result.proveedor} />
            )}
            {result.vigencia && (
              <Field label="Vigència" value={`${result.vigencia.inicio ?? '?'} → ${result.vigencia.fin ?? '?'}`} />
            )}

            {result.productos_baf?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Productes BAF</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Producte</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Comissió</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.productos_baf.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-gray-900">{p.nombre}</td>
                          <td className="px-4 py-2 text-gray-600">{p.comision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.extra_lotes && <Field label="Extra Lotes" value={result.extra_lotes} />}
            {result.fidelizacion_trimestral && <Field label="Fidelització Trimestral" value={result.fidelizacion_trimestral} />}
            {result.incentivo_conectividad && <Field label="Incentiu Connectivitat" value={result.incentivo_conectividad} />}
            {result.movil && <Field label="Mòbil" value={result.movil} />}
            {result.terminales && <Field label="Terminals" value={result.terminales} />}
            {result.tv_max && <Field label="TV / Max" value={result.tv_max} />}

            <details className="mt-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">JSON complet</summary>
              <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  )
}
