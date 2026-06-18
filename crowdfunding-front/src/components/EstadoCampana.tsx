import { useState, useEffect } from 'react'
import { Contract, BrowserProvider, formatEther } from 'ethers'

interface EstadoCampanaProps {
  crowdfundingContrato: Contract | null
  provider: BrowserProvider | null
  crowdfundingAddress: string | null
  refreshKey: number
}

export default function EstadoCampana({ crowdfundingContrato, provider, crowdfundingAddress, refreshKey }: EstadoCampanaProps) {
  const [nombre, setNombre] = useState('')
  const [metaTotal, setMetaTotal] = useState(0n)
  const [totalRecaudado, setTotalRecaudado] = useState(0n)
  const [plazo, setPlazo] = useState(0n)
  const [activa, setActiva] = useState(false)
  const [metaAlcanzada, setMetaAlcanzada] = useState(false)
  const [balance, setBalance] = useState(0n)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!crowdfundingContrato || !provider || !crowdfundingAddress) return
    const cc = crowdfundingContrato!
    const prov = provider!
    const addr = crowdfundingAddress!

    async function load() {
      try {
        const [nom, meta, recaudado, pl, act, metaAlc, bal] = await Promise.all([
          cc.nombreProyecto(),
          cc.metaTotal(),
          cc.totalRecaudado(),
          cc.plazoRecaudacion(),
          cc.campanaActiva(),
          cc.metaAlcanzada(),
          prov.getBalance(addr),
        ])
        setNombre(nom)
        setMetaTotal(meta)
        setTotalRecaudado(recaudado)
        setPlazo(pl)
        setActiva(act)
        setMetaAlcanzada(metaAlc)
        setBalance(bal)
      } catch { }
    }
    load()
  }, [crowdfundingContrato, provider, crowdfundingAddress, refreshKey])

  useEffect(() => {
    if (!plazo) return
    const fin = Number(plazo) * 1000

    function actualizar() {
      const ahora = Date.now()
      const diff = fin - ahora
      if (diff <= 0) {
        setCountdown('Vencido')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${d}d ${h}h ${m}m ${s}s`)
    }

    actualizar()
    const id = setInterval(actualizar, 1000)
    return () => clearInterval(id)
  }, [plazo])

  if (!nombre) return null

  const metaNum = Number(formatEther(metaTotal))
  const recaudadoNum = Number(formatEther(totalRecaudado))
  const pct = metaNum > 0 ? Math.min((recaudadoNum / metaNum) * 100, 100) : 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
      <h1 className="text-2xl font-bold text-white mb-4">{nombre}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-400">Meta</span>
          <p className="text-white font-semibold">{metaNum.toFixed(4)} ETH</p>
        </div>
        <div>
          <span className="text-gray-400">Recaudado</span>
          <p className="text-white font-semibold">{recaudadoNum.toFixed(4)} ETH</p>
        </div>
        <div>
          <span className="text-gray-400">Balance contrato</span>
          <p className="text-white font-semibold">{Number(formatEther(balance)).toFixed(4)} ETH</p>
        </div>
        <div>
          <span className="text-gray-400">Plazo</span>
          <p className="text-white font-semibold">{new Date(Number(plazo) * 1000).toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
        <div
          className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>{pct.toFixed(1)}%</span>
        <span>{countdown}</span>
      </div>

      <div className="flex gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${activa ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
          {activa ? 'Campaña Activa' : 'Campaña Cerrada'}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${metaAlcanzada ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
          {metaAlcanzada ? 'Meta Alcanzada' : 'En Recaudación'}
        </span>
      </div>
    </div>
  )
}
