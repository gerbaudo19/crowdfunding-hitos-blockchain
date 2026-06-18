import { useState, useEffect } from 'react'
import { Contract, formatEther } from 'ethers'

interface HitoData {
  descripcion: string
  montoLiberar: bigint
  plazo: bigint
  aprobado: boolean
  fondosLiberados: boolean
}

interface ResultadoVerifier {
  registrado: boolean
  cumplido: boolean
  evidencia: string
}

interface ListaHitosProps {
  crowdfundingContrato: Contract | null
  verifierContrato: Contract | null
  refreshKey: number
}

export default function ListaHitos({ crowdfundingContrato, verifierContrato, refreshKey }: ListaHitosProps) {
  const [hitos, setHitos] = useState<HitoData[]>([])
  const [resultados, setResultados] = useState<ResultadoVerifier[]>([])

  useEffect(() => {
    if (!crowdfundingContrato) return
    const cc = crowdfundingContrato!
    const vc = verifierContrato

    async function load() {
      try {
        const cantidad = Number(await cc.cantidadHitos())
        const hitoPromises = []
        for (let i = 0; i < cantidad; i++) {
          hitoPromises.push(cc.getHito(i))
        }
        const hitoData = await Promise.all(hitoPromises)
        setHitos(hitoData.map((h: any) => ({
          descripcion: h[0],
          montoLiberar: h[1],
          plazo: h[2],
          aprobado: h[3],
          fondosLiberados: h[4],
        })))

        if (vc) {
          const resPromises = []
          for (let i = 0; i < cantidad; i++) {
            resPromises.push(vc.getResultado(i))
          }
          const resData = await Promise.all(resPromises)
          setResultados(resData.map((r: any) => ({
            registrado: r[0],
            cumplido: r[1],
            evidencia: r[2],
          })))
        }
      } catch { }
    }
    load()
  }, [crowdfundingContrato, verifierContrato, refreshKey])

  if (hitos.length === 0) return null

  function badgeHito(h: HitoData) {
    if (h.fondosLiberados) return { text: '🔒 Fondos Liberados', color: 'bg-gray-500/10 text-gray-400' }
    if (h.aprobado) return { text: '✅ Aprobado', color: 'bg-green-400/10 text-green-400' }
    if (Number(h.plazo) * 1000 < Date.now()) return { text: '❌ Vencido', color: 'bg-red-400/10 text-red-400' }
    return { text: '⏳ Pendiente', color: 'bg-yellow-400/10 text-yellow-400' }
  }

  function badgeVerificador(r: ResultadoVerifier | undefined) {
    if (!r || !r.registrado) return { text: '⬜ Sin resultado', color: 'bg-gray-500/10 text-gray-400' }
    if (r.cumplido) return { text: '✅ Aprobado por Auditor', color: 'bg-green-400/10 text-green-400' }
    return { text: '❌ Rechazado por Auditor', color: 'bg-red-400/10 text-red-400' }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-white">Hitos</h2>
      {hitos.map((h, i) => {
        const bh = badgeHito(h)
        const bv = badgeVerificador(resultados[i])
        return (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-white font-semibold">Hito #{i + 1}</h3>
              <div className="flex gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${bh.color}`}>{bh.text}</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-3">{h.descripcion}</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
              <span>Monto: <span className="text-white font-medium">{Number(formatEther(h.montoLiberar)).toFixed(4)} ETH</span></span>
              <span>Plazo: <span className="text-white font-medium">{new Date(Number(h.plazo) * 1000).toLocaleDateString('es-AR')}</span></span>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-medium inline-block ${bv.color}`}>{bv.text}</div>
            {resultados[i]?.registrado && resultados[i]?.evidencia && (
              <p className="text-gray-500 text-xs mt-2 truncate">Evidencia: {resultados[i].evidencia}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
