import { useState, useEffect } from 'react'
import { ContractFactory, JsonRpcSigner, parseEther } from 'ethers'
import { VERIFIER_BYTECODE, CROWDFUNDING_BYTECODE } from '../bytecodes'
import VerifierABI from '../abi/HitosVerifier.json'
import CrowdfundingABI from '../abi/CrowdfundingHitos.json'
import { parsearError } from '../utils/errores'
import TxStatus from './TxStatus'

interface HitoInput {
  descripcion: string
  monto: string
  plazo: string
}

interface DeployPanelProps {
  signer: JsonRpcSigner | null
  verifierAddress: string | null
  crowdfundingAddress: string | null
  onDeploy: (verifierAddr: string, crowdfundingAddr: string) => void
}

export default function DeployPanel({ signer, verifierAddress, crowdfundingAddress, onDeploy }: DeployPanelProps) {
  const [localVerifierAddr, setLocalVerifierAddr] = useState<string>(verifierAddress || '')
  const [statusVerifier, setStatusVerifier] = useState<'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>('idle')
  const [msgVerifier, setMsgVerifier] = useState('')
  const [statusCrowdfunding, setStatusCrowdfunding] = useState<'idle' | 'pendiente' | 'minando' | 'ok' | 'error'>('idle')
  const [msgCrowdfunding, setMsgCrowdfunding] = useState('')

  const [nombre, setNombre] = useState('')
  const [metaTotal, setMetaTotal] = useState('')
  const [plazoRec, setPlazoRec] = useState('')
  const [hitos, setHitos] = useState<HitoInput[]>([])
  const [ejemploJson, setEjemploJson] = useState('')
  const [mostrarEjemplo, setMostrarEjemplo] = useState(false)
  const [errorJson, setErrorJson] = useState('')

  useEffect(() => {
    if (verifierAddress) setLocalVerifierAddr(verifierAddress)
  }, [verifierAddress])

  const sumaMontos = hitos.reduce((acc, h) => acc + (parseFloat(h.monto) || 0), 0)

  async function deployVerifier() {
    if (!signer) return
    setStatusVerifier('pendiente')
    setMsgVerifier('')
    try {
      const factory = new ContractFactory(VerifierABI, VERIFIER_BYTECODE, signer)
      const contrato = await factory.deploy()
      setStatusVerifier('minando')
      await contrato.waitForDeployment()
      const addr = await contrato.getAddress()
      setLocalVerifierAddr(addr)
      setStatusVerifier('ok')
      setMsgVerifier(`Verifier deployado en: ${addr}`)
    } catch (e: any) {
      setStatusVerifier('error')
      setMsgVerifier(parsearError(e))
    }
  }

  async function deployCrowdfunding() {
    if (!signer || !localVerifierAddr) return
    if (hitos.length === 0) {
      setStatusCrowdfunding('error')
      setMsgCrowdfunding('Agregá al menos un hito')
      return
    }
    if (Math.abs(sumaMontos - parseFloat(metaTotal)) > 0.001) {
      setStatusCrowdfunding('error')
      setMsgCrowdfunding(`La suma de los montos de los hitos (${sumaMontos.toFixed(4)} ETH) debe ser igual a la meta total (${metaTotal} ETH)`)
      return
    }

    setStatusCrowdfunding('pendiente')
    setMsgCrowdfunding('')
    try {
      const metaWei = parseEther(metaTotal)
      const plazoSeg = BigInt(plazoRec)
      const descripciones = hitos.map(h => h.descripcion)
      const montos = hitos.map(h => parseEther(h.monto))
      const plazos = hitos.map(h => BigInt(h.plazo))

      const factory = new ContractFactory(CrowdfundingABI, CROWDFUNDING_BYTECODE, signer)
      const contrato = await factory.deploy(nombre, metaWei, plazoSeg, localVerifierAddr, descripciones, montos, plazos)
      setStatusCrowdfunding('minando')
      await contrato.waitForDeployment()
      const addr = await contrato.getAddress()
      setStatusCrowdfunding('ok')
      setMsgCrowdfunding(`Crowdfunding deployado en: ${addr}`)
      onDeploy(localVerifierAddr, addr)
    } catch (e: any) {
      setStatusCrowdfunding('error')
      setMsgCrowdfunding(parsearError(e))
    }
  }

  function cargarEjemplo() {
    setNombre('Mi Campaña Ejemplo')
    setMetaTotal('0.01')
    setPlazoRec('604800')
    setHitos([
      { descripcion: 'Diseño del producto', monto: '0.005', plazo: '259200' },
      { descripcion: 'Desarrollo MVP', monto: '0.003', plazo: '518400' },
      { descripcion: 'Lanzamiento oficial', monto: '0.002', plazo: '777600' },
    ])
  }

  function cargarJson() {
    setErrorJson('')
    try {
      const data = JSON.parse(ejemploJson)
      if (!data.nombre || !data.metaTotal || !data.plazoRecaudacion || !data.hitos) {
        setErrorJson('Faltan campos requeridos: nombre, metaTotal, plazoRecaudacion, hitos')
        return
      }
      setNombre(data.nombre)
      setMetaTotal(String(data.metaTotal))
      setPlazoRec(String(data.plazoRecaudacion))
      if (data.verifierAddress) setLocalVerifierAddr(data.verifierAddress)
      setHitos(data.hitos.map((h: any) => ({
        descripcion: h.descripcion,
        monto: String(h.monto),
        plazo: String(h.plazo),
      })))
      setMostrarEjemplo(false)
    } catch {
      setErrorJson('JSON inválido')
    }
  }

  function agregarHito() {
    setHitos([...hitos, { descripcion: '', monto: '', plazo: '' }])
  }

  function eliminarHito(idx: number) {
    setHitos(hitos.filter((_, i) => i !== idx))
  }

  function actualizarHito(idx: number, campo: keyof HitoInput, valor: string) {
    const nuevos = [...hitos]
    nuevos[idx] = { ...nuevos[idx], [campo]: valor }
    setHitos(nuevos)
  }

  if (crowdfundingAddress) return null

  return (
    <div className="space-y-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Paso 1: Deployar Verifier</h2>
        <p className="text-gray-400 text-sm mb-4">El auditor deploya el contrato HitosVerifier</p>
        <button
          onClick={deployVerifier}
          disabled={!signer || statusVerifier === 'pendiente' || statusVerifier === 'minando'}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Deployar Verifier (como Auditor)
        </button>
        {localVerifierAddr && statusVerifier === 'ok' && (
          <div className="mt-3 text-green-400 text-sm break-all">
            Verifier: <span className="font-mono">{localVerifierAddr}</span>
          </div>
        )}
        <TxStatus status={statusVerifier} mensaje={msgVerifier} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Paso 2: Deployar Crowdfunding</h2>
        <p className="text-gray-400 text-sm mb-4">El creador configura y deploya el contrato CrowdfundingHitos</p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Nombre del proyecto</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Mi proyecto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Meta total (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={metaTotal}
                onChange={e => setMetaTotal(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Plazo recaudación (segundos)</label>
              <input
                type="number"
                value={plazoRec}
                onChange={e => setPlazoRec(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="604800"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Dirección del Verifier</label>
            <input
              type="text"
              value={localVerifierAddr}
              onChange={e => setLocalVerifierAddr(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              placeholder="0x..."
            />
          </div>

          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Hitos</h3>
              <span className="text-sm text-gray-400">
                Suma montos: <span className={Math.abs(sumaMontos - parseFloat(metaTotal || '0')) < 0.001 ? 'text-green-400' : 'text-yellow-400'}>{sumaMontos.toFixed(4)} ETH</span>
                {metaTotal && ` / ${metaTotal} ETH`}
              </span>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                onClick={cargarEjemplo}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium border border-indigo-400/30 rounded-lg px-3 py-1.5"
              >
                Cargar ejemplo rápido
              </button>
              <button
                onClick={() => setMostrarEjemplo(!mostrarEjemplo)}
                className="text-gray-400 hover:text-gray-300 text-sm font-medium border border-gray-700 rounded-lg px-3 py-1.5"
              >
                {mostrarEjemplo ? 'Ocultar' : 'Pegar JSON'}
              </button>
            </div>

            {mostrarEjemplo && (
              <div className="mb-4 bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Pegá un JSON de ejemplo
                </label>
                <textarea
                  value={ejemploJson}
                  onChange={e => { setEjemploJson(e.target.value); setErrorJson('') }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono h-32 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder='{
  "nombre": "Mi Proyecto",
  "metaTotal": "10",
  "plazoRecaudacion": "604800",
  "verifierAddress": "0x...",
  "hitos": [
    { "descripcion": "Diseño", "monto": "3", "plazo": "259200" }
  ]
}'
                />
                {errorJson && <p className="text-red-400 text-xs mt-1">{errorJson}</p>}
                <button
                  onClick={cargarJson}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Cargar JSON
                </button>
              </div>
            )}

            {hitos.map((hito, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">Hito #{i + 1}</span>
                  <button
                    onClick={() => eliminarHito(i)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={hito.descripcion}
                      onChange={e => actualizarHito(i, 'descripcion', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Descripción del hito"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={hito.monto}
                      onChange={e => actualizarHito(i, 'monto', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Monto ETH"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={hito.plazo}
                      onChange={e => actualizarHito(i, 'plazo', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="Plazo (seg)"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={agregarHito}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              + Agregar hito
            </button>
          </div>

          <button
            onClick={deployCrowdfunding}
            disabled={!signer || !localVerifierAddr || hitos.length === 0 || statusCrowdfunding === 'pendiente' || statusCrowdfunding === 'minando'}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors mt-4"
          >
            Deployar Crowdfunding
          </button>
        </div>

        <TxStatus status={statusCrowdfunding} mensaje={msgCrowdfunding} />
      </div>
    </div>
  )
}
