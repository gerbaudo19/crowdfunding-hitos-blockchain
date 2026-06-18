import { useState, useEffect, useCallback } from 'react'
import { Contract, parseEther, formatEther } from 'ethers'
import { parsearError } from '../utils/errores'
import TxStatus from './TxStatus'

interface PanelDonanteProps {
  crowdfundingContrato: Contract | null
  account: string | null
  refresh: () => void
  refreshKey: number
}

export default function PanelDonante({ crowdfundingContrato, account, refresh, refreshKey }: PanelDonanteProps) {
  const [montoDonar, setMontoDonar] = useState('')
  const [miDonacion, setMiDonacion] = useState(0n)
  const [reembolsado, setReembolsado] = useState(false)
  const [hitos, setHitos] = useState<{ index: number; plazo: bigint; aprobado: boolean }[]>([])
  const [status, setStatus] = useState<'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>('idle')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!crowdfundingContrato || !account) return
    const cc = crowdfundingContrato!
    const acc = account!
    async function load() {
      try {
        const donacion = await cc.miDonacion()
        setMiDonacion(donacion)
        const reem = await cc.reembolsado(acc)
        setReembolsado(reem)

        const cantidad = Number(await cc.cantidadHitos())
        const hitoData = []
        for (let i = 0; i < cantidad; i++) {
          const h = await cc.getHito(i)
          hitoData.push({ index: i, plazo: h[2], aprobado: h[3] })
        }
        setHitos(hitoData)
      } catch { }
    }
    load()
  }, [crowdfundingContrato, account, refreshKey])

  const donar = useCallback(async () => {
    if (!crowdfundingContrato || !montoDonar || parseFloat(montoDonar) <= 0) return
    setStatus('pendiente')
    setMensaje('')
    try {
      const tx = await crowdfundingContrato.donar({ value: parseEther(montoDonar), gasLimit: 150000n })
      setStatus('minando')
      await tx.wait()
      setStatus('ok')
      setMensaje(`Donación de ${montoDonar} ETH exitosa`)
      setMontoDonar('')
      refresh()
    } catch (e: any) {
      setStatus('error')
      setMensaje(parsearError(e))
    }
  }, [crowdfundingContrato, montoDonar, refresh])

  const reclamarReembolso = useCallback(async (hitoIndex: number) => {
    if (!crowdfundingContrato) return
    setStatus('pendiente')
    setMensaje('')
    try {
      const tx = await crowdfundingContrato.reclamarReembolso(hitoIndex)
      setStatus('minando')
      await tx.wait()
      setStatus('ok')
      setMensaje('Reembolso reclamado exitosamente')
      refresh()
    } catch (e: any) {
      setStatus('error')
      setMensaje(parsearError(e))
    }
  }, [crowdfundingContrato, refresh])

  const hitoVencidoSinAprobar = hitos.find(h => {
    const plazoMs = Number(h.plazo) * 1000
    return Date.now() > plazoMs && !h.aprobado
  })

  const puedeReembolsar = miDonacion > 0n && !reembolsado && hitoVencidoSinAprobar

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Panel Donante</h2>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-1">Monto a donar (ETH)</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={montoDonar}
            onChange={e => setMontoDonar(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            placeholder="0.1"
          />
          <button
            onClick={donar}
            disabled={!montoDonar || parseFloat(montoDonar) <= 0 || status === 'pendiente' || status === 'minando'}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Donar
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <span className="text-gray-400 text-sm">Mi donación</span>
        <p className="text-white font-semibold text-lg">{Number(formatEther(miDonacion)).toFixed(4)} ETH</p>
        {reembolsado && (
          <p className="text-green-400 text-sm mt-1">Ya recibiste tu reembolso</p>
        )}
      </div>

      {puedeReembolsar && (
        <div>
          <p className="text-yellow-400 text-sm mb-2">
            El Hito #{hitoVencidoSinAprobar.index} venció sin aprobarse. Podés reclamar tu reembolso.
          </p>
          <button
            onClick={() => reclamarReembolso(hitoVencidoSinAprobar.index)}
            disabled={status === 'pendiente' || status === 'minando'}
            className="bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Reclamar reembolso
          </button>
        </div>
      )}

      <TxStatus status={status} mensaje={mensaje} />
    </div>
  )
}
