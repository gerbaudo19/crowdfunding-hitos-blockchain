import { useState, useEffect, useCallback } from 'react'
import { useWallet } from './hooks/useWallet'
import { useContratos } from './hooks/useContratos'
import ConectarWallet from './components/ConectarWallet'
import DeployPanel from './components/DeployPanel'
import EstadoCampana from './components/EstadoCampana'
import ListaHitos from './components/ListaHitos'
import PanelDonante from './components/PanelDonante'
import PanelAuditor from './components/PanelAuditor'
import PanelCreador from './components/PanelCreador'

function App() {
  const { account, provider, signer, chainId, conectar, error } = useWallet()
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null)
  const [crowdfundingAddress, setCrowdfundingAddress] = useState<string | null>(null)
  const [rol, setRol] = useState<'Creador' | 'Auditor' | 'Donante' | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const { verifierContrato, crowdfundingContrato } = useContratos(signer, verifierAddress, crowdfundingAddress)

  useEffect(() => {
    if (!account || !verifierContrato || !crowdfundingContrato) {
      setRol(null)
      return
    }
    const acc = account!
    const vc = verifierContrato!
    const cc = crowdfundingContrato!
    async function detectarRol() {
      try {
        const [creadorAddr, ownerAddr] = await Promise.all([
          cc.creador(),
          vc.owner(),
        ])
        const addr = acc.toLowerCase()
        if (addr === creadorAddr.toLowerCase()) setRol('Creador')
        else if (addr === ownerAddr.toLowerCase()) setRol('Auditor')
        else setRol('Donante')
      } catch {
        setRol(null)
      }
    }
    detectarRol()
  }, [account, verifierContrato, crowdfundingContrato])

  useEffect(() => {
    if (!crowdfundingContrato) return
    const handler = () => refresh()
    crowdfundingContrato.on('Donacion', handler)
    crowdfundingContrato.on('HitoAprobado', handler)
    crowdfundingContrato.on('FondosLiberados', handler)
    crowdfundingContrato.on('Reembolso', handler)
    return () => {
      crowdfundingContrato.removeAllListeners()
    }
  }, [crowdfundingContrato, refresh])

  function handleDeploy(verifierAddr: string, crowdfundingAddr: string) {
    setVerifierAddress(verifierAddr)
    setCrowdfundingAddress(crowdfundingAddr)
    refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Crowdfunding Hitos</h1>
          <ConectarWallet
            account={account}
            chainId={chainId}
            error={error}
            conectar={conectar}
            rol={rol}
          />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {account && chainId && chainId !== 11155111 && (
          <div className="bg-red-400/10 border border-red-400/30 rounded-xl p-4 text-red-400 text-sm">
            Conectate a la red Sepolia (Chain ID: 11155111). Red actual: {chainId}
          </div>
        )}

        {!crowdfundingAddress ? (
          <DeployPanel
            signer={signer}
            verifierAddress={verifierAddress}
            crowdfundingAddress={crowdfundingAddress}
            onDeploy={handleDeploy}
          />
        ) : (
          <>
            <EstadoCampana
              crowdfundingContrato={crowdfundingContrato}
              provider={provider}
              crowdfundingAddress={crowdfundingAddress}
              refreshKey={refreshKey}
            />

            <ListaHitos
              crowdfundingContrato={crowdfundingContrato}
              verifierContrato={verifierContrato}
              refreshKey={refreshKey}
            />

            {rol === 'Donante' && (
              <PanelDonante
                crowdfundingContrato={crowdfundingContrato}
                account={account}
                refresh={refresh}
                refreshKey={refreshKey}
              />
            )}

            {rol === 'Auditor' && (
              <PanelAuditor
                verifierContrato={verifierContrato}
                crowdfundingContrato={crowdfundingContrato}
                refresh={refresh}
                refreshKey={refreshKey}
              />
            )}

            {rol === 'Creador' && (
              <PanelCreador
                crowdfundingContrato={crowdfundingContrato}
                verifierContrato={verifierContrato}
                provider={provider}
                crowdfundingAddress={crowdfundingAddress}
                refresh={refresh}
                refreshKey={refreshKey}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
