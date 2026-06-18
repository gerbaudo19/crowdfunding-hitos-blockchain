import { useState, useEffect, useCallback } from 'react'
import { Contract } from 'ethers'
import { parsearError } from '../utils/errores'
import TxStatus from './TxStatus'

interface HitoInfo {
  index: number
  descripcion: string
}

interface Resultado {
  registrado: boolean
  cumplido: boolean
  evidencia: string
}

interface PanelAuditorProps {
  verifierContrato: Contract | null
  crowdfundingContrato: Contract | null
  refresh: () => void
  refreshKey: number
}

export default function PanelAuditor({ verifierContrato, crowdfundingContrato, refresh, refreshKey }: PanelAuditorProps) {
  const [hitos, setHitos] = useState<HitoInfo[]>([])
  const [resultados, setResultados] = useState<Record<number, Resultado>>({})
  const [cumplido, setCumplido] = useState<Record<number, boolean>>({})
  const [evidencia, setEvidencia] = useState<Record<number, string>>({})
  const [status, setStatus] = useState<'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>('idle')
  const [mensaje, setMensaje] = useState('')
  const [nuevoOwner, setNuevoOwner] = useState('')
  const [statusTransfer, setStatusTransfer] = useState<'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>('idle')
  const [msgTransfer, setMsgTransfer] = useState('')

  useEffect(() => {
    if (!crowdfundingContrato || !verifierContrato) return
    const cc = crowdfundingContrato!
    const vc = verifierContrato!
    async function load() {
      try {
        const cantidad = Number(await cc.cantidadHitos())
        const info: HitoInfo[] = []
        const resMap: Record<number, Resultado> = {}
        for (let i = 0; i < cantidad; i++) {
          const h = await cc.getHito(i)
          info.push({ index: i, descripcion: h[0] })
          try {
            const r = await vc.getResultado(i)
            resMap[i] = { registrado: r[0], cumplido: r[1], evidencia: r[2] }
          } catch {
            resMap[i] = { registrado: false, cumplido: false, evidencia: '' }
          }
        }
        setHitos(info)
        setResultados(resMap)
      } catch { }
    }
    load()
  }, [crowdfundingContrato, verifierContrato, refreshKey])

  const registrar = useCallback(async (hitoIndex: number) => {
    if (!verifierContrato) return
    setStatus('pendiente')
    setMensaje('')
    try {
      const tx = await verifierContrato.registrarResultado(hitoIndex, cumplido[hitoIndex] ?? false, evidencia[hitoIndex] || '')
      setStatus('minando')
      await tx.wait()
      setStatus('ok')
      setMensaje(`Resultado registrado para Hito #${hitoIndex}`)
      refresh()
    } catch (e: any) {
      setStatus('error')
      setMensaje(parsearError(e))
    }
  }, [verifierContrato, cumplido, evidencia, refresh])

  const transferir = useCallback(async () => {
    if (!verifierContrato || !nuevoOwner) return
    setStatusTransfer('pendiente')
    setMsgTransfer('')
    try {
      const tx = await verifierContrato.transferirOwner(nuevoOwner)
      setStatusTransfer('minando')
      await tx.wait()
      setStatusTransfer('ok')
      setMsgTransfer(`Ownership transferido a ${nuevoOwner}`)
      setNuevoOwner('')
      refresh()
    } catch (e: any) {
      setStatusTransfer('error')
      setMsgTransfer(parsearError(e))
    }
  }, [verifierContrato, nuevoOwner, refresh])

  const sinRegistrar = hitos.filter(h => !resultados[h.index]?.registrado)
  const registrados = hitos.filter(h => resultados[h.index]?.registrado)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Panel Auditor</h2>

      {sinRegistrar.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-300">Registrar resultados</h3>
          {sinRegistrar.map(h => (
            <div key={h.index} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Hito #{h.index}: {h.descripcion}</p>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="radio"
                    name={`cumplido-${h.index}`}
                    checked={cumplido[h.index] === true}
                    onChange={() => setCumplido(prev => ({ ...prev, [h.index]: true }))}
                    className="accent-green-500"
                  />
                  Aprobado
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="radio"
                    name={`cumplido-${h.index}`}
                    checked={cumplido[h.index] === false}
                    onChange={() => setCumplido(prev => ({ ...prev, [h.index]: false }))}
                    className="accent-red-500"
                  />
                  Rechazado
                </label>
              </div>
              <input
                type="text"
                value={evidencia[h.index] || ''}
                onChange={e => setEvidencia(prev => ({ ...prev, [h.index]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-indigo-500"
                placeholder="Evidencia (URL o descripción)"
              />
              <button
                onClick={() => registrar(h.index)}
                disabled={status === 'pendiente' || status === 'minando'}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Registrar resultado
              </button>
            </div>
          ))}
        </div>
      )}

      {registrados.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-300">Resultados registrados</h3>
          {registrados.map(h => {
            const r = resultados[h.index]
            return (
              <div key={h.index} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                <p className="text-white text-sm">
                  Hito #{h.index}: {h.descripcion}
                  <span className={`ml-2 ${r.cumplido ? 'text-green-400' : 'text-red-400'}`}>
                    {r.cumplido ? '✅ Aprobado' : '❌ Rechazado'}
                  </span>
                </p>
                {r.evidencia && <p className="text-gray-500 text-xs truncate mt-1">{r.evidencia}</p>}
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-gray-800 pt-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-3">Transferir ownership</h3>
        <p className="text-gray-400 text-sm mb-3">Transferí el rol de auditor a otra wallet</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoOwner}
            onChange={e => setNuevoOwner(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
            placeholder="0x..."
          />
          <button
            onClick={transferir}
            disabled={!nuevoOwner || statusTransfer === 'pendiente' || statusTransfer === 'minando'}
            className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Transferir
          </button>
        </div>
        {statusTransfer === 'ok' && <p className="text-green-400 text-xs mt-2">{msgTransfer}</p>}
        {statusTransfer === 'error' && <p className="text-red-400 text-xs mt-2">{msgTransfer}</p>}
        {statusTransfer === 'pendiente' && <p className="text-yellow-400 text-xs mt-2">Esperando confirmación...</p>}
        {statusTransfer === 'minando' && <p className="text-indigo-400 text-xs mt-2">Transacción enviada...</p>}
      </div>

      <TxStatus status={status} mensaje={mensaje} />
    </div>
  )
}
