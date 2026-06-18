import { useState, useEffect, useCallback } from 'react'
import { Contract, formatEther } from 'ethers'
import { parsearError } from '../utils/errores'

interface HitoExtendido {
  index: number
  descripcion: string
  montoLiberar: bigint
  plazo: bigint
  aprobado: boolean
  fondosLiberados: boolean
}

interface Resultado {
  registrado: boolean
  cumplido: boolean
  evidencia: string
}

interface PanelCreadorProps {
  crowdfundingContrato: Contract | null
  verifierContrato: Contract | null
  provider: any
  crowdfundingAddress: string | null
  refresh: () => void
  refreshKey: number
}

export default function PanelCreador({ crowdfundingContrato, verifierContrato, provider, crowdfundingAddress, refresh, refreshKey }: PanelCreadorProps) {
  const [hitos, setHitos] = useState<HitoExtendido[]>([])
  const [resultados, setResultados] = useState<Record<number, Resultado>>({})
  const [balance, setBalance] = useState(0n)
  const [statusAprobar, setStatusAprobar] = useState<Record<number, 'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>>({})
  const [statusLiberar, setStatusLiberar] = useState<Record<number, 'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>>({})
  const [statusLiberarTodo, setStatusLiberarTodo] = useState<'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>('idle')
  const [msgAprobar, setMsgAprobar] = useState<Record<number, string>>({})
  const [msgLiberar, setMsgLiberar] = useState<Record<number, string>>({})
  const [msgLiberarTodo, setMsgLiberarTodo] = useState('')

  useEffect(() => {
    if (!crowdfundingContrato || !provider || !crowdfundingAddress) return
    const cc = crowdfundingContrato!
    const prov = provider!
    const addr = crowdfundingAddress!
    const vc = verifierContrato
    async function load() {
      try {
        const cantidad = Number(await cc.cantidadHitos())
        const bal = await prov.getBalance(addr)
        setBalance(bal)

        const hitoList: HitoExtendido[] = []
        const resMap: Record<number, Resultado> = {}
        for (let i = 0; i < cantidad; i++) {
          const h = await cc.getHito(i)
          hitoList.push({ index: i, descripcion: h[0], montoLiberar: h[1], plazo: h[2], aprobado: h[3], fondosLiberados: h[4] })
          if (vc) {
            try {
              const r = await vc.getResultado(i)
              resMap[i] = { registrado: r[0], cumplido: r[1], evidencia: r[2] }
            } catch {
              resMap[i] = { registrado: false, cumplido: false, evidencia: '' }
            }
          }
        }
        setHitos(hitoList)
        setResultados(resMap)
      } catch { }
    }
    load()
  }, [crowdfundingContrato, verifierContrato, provider, crowdfundingAddress, refreshKey])

  const aprobar = useCallback(async (idx: number) => {
    if (!crowdfundingContrato) return
    setStatusAprobar(prev => ({ ...prev, [idx]: 'pendiente' }))
    setMsgAprobar(prev => ({ ...prev, [idx]: '' }))
    try {
      const tx = await crowdfundingContrato.aprobarHito(idx)
      setStatusAprobar(prev => ({ ...prev, [idx]: 'minando' }))
      await tx.wait()
      setStatusAprobar(prev => ({ ...prev, [idx]: 'ok' }))
      setMsgAprobar(prev => ({ ...prev, [idx]: `Hito #${idx} aprobado` }))
      refresh()
    } catch (e: any) {
      setStatusAprobar(prev => ({ ...prev, [idx]: 'error' }))
      setMsgAprobar(prev => ({ ...prev, [idx]: parsearError(e) }))
    }
  }, [crowdfundingContrato, refresh])

  const liberar = useCallback(async (idx: number) => {
    if (!crowdfundingContrato) return
    setStatusLiberar(prev => ({ ...prev, [idx]: 'pendiente' }))
    setMsgLiberar(prev => ({ ...prev, [idx]: '' }))
    try {
      const tx = await crowdfundingContrato.liberarFondosHito(idx)
      setStatusLiberar(prev => ({ ...prev, [idx]: 'minando' }))
      await tx.wait()
      setStatusLiberar(prev => ({ ...prev, [idx]: 'ok' }))
      setMsgLiberar(prev => ({ ...prev, [idx]: `Fondos del Hito #${idx} liberados` }))
      refresh()
    } catch (e: any) {
      setStatusLiberar(prev => ({ ...prev, [idx]: 'error' }))
      setMsgLiberar(prev => ({ ...prev, [idx]: parsearError(e) }))
    }
  }, [crowdfundingContrato, refresh])

  const liberarTodoAction = useCallback(async () => {
    if (!crowdfundingContrato) return
    setStatusLiberarTodo('pendiente')
    setMsgLiberarTodo('')
    try {
      const tx = await crowdfundingContrato.liberarTodo()
      setStatusLiberarTodo('minando')
      await tx.wait()
      setStatusLiberarTodo('ok')
      setMsgLiberarTodo('Todos los fondos liberados exitosamente')
      refresh()
    } catch (e: any) {
      setStatusLiberarTodo('error')
      setMsgLiberarTodo(parsearError(e))
    }
  }, [crowdfundingContrato, refresh])

  const todosAprobados = hitos.length > 0 && hitos.every(h => h.aprobado)
  const algunSinLiberar = hitos.some(h => h.aprobado && !h.fondosLiberados)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Panel Creador</h2>
        <span className="text-sm text-gray-400">
          Balance: <span className="text-white font-medium">{Number(formatEther(balance)).toFixed(4)} ETH</span>
        </span>
      </div>

      {hitos.map(h => {
        const res = resultados[h.index]
        const auditorAprobo = res?.registrado && res?.cumplido
        const puedeAprobar = auditorAprobo && !h.aprobado
        const anteriorLiberado = h.index === 0 || hitos[h.index - 1]?.fondosLiberados
        const puedeLiberar = h.aprobado && !h.fondosLiberados && anteriorLiberado

        return (
          <div key={h.index} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">Hito #{h.index}: {h.descripcion}</h3>
              <span className="text-sm text-gray-400">{Number(formatEther(h.montoLiberar)).toFixed(4)} ETH</span>
            </div>

            <div className="flex gap-2 mb-2">
              {h.aprobado && <span className="text-green-400 text-xs bg-green-400/10 rounded-full px-2 py-0.5">Aprobado</span>}
              {h.fondosLiberados && <span className="text-gray-400 text-xs bg-gray-400/10 rounded-full px-2 py-0.5">Fondos Liberados</span>}
              {auditorAprobo && <span className="text-green-400/70 text-xs">✅ Auditor: Aprobado</span>}
              {res?.registrado && !res?.cumplido && <span className="text-red-400/70 text-xs">❌ Auditor: Rechazado</span>}
            </div>

            {puedeAprobar && (
              <div>
                <button
                  onClick={() => aprobar(h.index)}
                  disabled={statusAprobar[h.index] === 'pendiente' || statusAprobar[h.index] === 'minando'}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Aprobar Hito #{h.index}
                </button>
                {statusAprobar[h.index] === 'ok' && <span className="text-green-400 text-sm ml-2">{msgAprobar[h.index]}</span>}
                {statusAprobar[h.index] === 'error' && <span className="text-red-400 text-sm ml-2">{msgAprobar[h.index]}</span>}
              </div>
            )}

            {puedeLiberar && (
              <div className="mt-2">
                <button
                  onClick={() => liberar(h.index)}
                  disabled={statusLiberar[h.index] === 'pendiente' || statusLiberar[h.index] === 'minando'}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Liberar Fondos Hito #{h.index}
                </button>
                {statusLiberar[h.index] === 'ok' && <span className="text-green-400 text-sm ml-2">{msgLiberar[h.index]}</span>}
                {statusLiberar[h.index] === 'error' && <span className="text-red-400 text-sm ml-2">{msgLiberar[h.index]}</span>}
              </div>
            )}

            {!puedeAprobar && !puedeLiberar && h.aprobado && h.fondosLiberados && (
              <p className="text-gray-500 text-sm">✓ Fondos liberados</p>
            )}
          </div>
        )
      })}

      {todosAprobados && algunSinLiberar && (
        <div>
          <button
            onClick={liberarTodoAction}
            disabled={statusLiberarTodo === 'pendiente' || statusLiberarTodo === 'minando'}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Liberar Todo
          </button>
          {statusLiberarTodo === 'ok' && <p className="text-green-400 text-sm mt-2">{msgLiberarTodo}</p>}
          {statusLiberarTodo === 'error' && <p className="text-red-400 text-sm mt-2">{msgLiberarTodo}</p>}
          {statusLiberarTodo === 'pendiente' && <p className="text-yellow-400 text-sm mt-2">Esperando confirmación...</p>}
          {statusLiberarTodo === 'minando' && <p className="text-indigo-400 text-sm mt-2">Transacción enviada, minando...</p>}
        </div>
      )}
    </div>
  )
}
