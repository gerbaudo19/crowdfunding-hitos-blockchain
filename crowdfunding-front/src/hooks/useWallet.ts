import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, JsonRpcSigner } from 'ethers'

declare global {
  interface Window {
    ethereum?: any
  }
}

const SEPOLIA_CHAIN_ID = 11155111

interface UseWalletReturn {
  account: string | null
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  chainId: number | null
  conectar: () => Promise<void>
  error: string | null
}

export function useWallet(): UseWalletReturn {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inicializar = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask no está instalado")
      return
    }
    try {
      const bp = new BrowserProvider(window.ethereum)
      const sign = await bp.getSigner()
      const addr = await sign.getAddress()
      const net = await bp.getNetwork()
      const cid = Number(net.chainId)

      setProvider(bp)
      setSigner(sign)
      setAccount(addr)
      setChainId(cid)

      if (cid !== SEPOLIA_CHAIN_ID) {
        setError("Conectate a la red Sepolia (Chain ID: 11155111)")
      } else {
        setError(null)
      }
    } catch (e: any) {
      setError(e?.message || "Error al conectar con MetaMask")
    }
  }, [])

  const conectar = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask no está instalado")
      return
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      await inicializar()
    } catch (e: any) {
      if (e?.code === 4001) {
        setError("Conectá MetaMask para continuar")
      } else {
        setError(e?.message || "Error al conectar")
      }
    }
  }, [inicializar])

  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null)
        setSigner(null)
        setProvider(null)
        setError("MetaMask desconectado")
      } else {
        inicializar()
      }
    }

    const handleChainChanged = () => {
      inicializar()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [inicializar])

  return { account, provider, signer, chainId, conectar, error }
}
