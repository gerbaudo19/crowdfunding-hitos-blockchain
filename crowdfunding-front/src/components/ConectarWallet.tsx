interface ConectarWalletProps {
  account: string | null
  chainId: number | null
  error: string | null
  conectar: () => Promise<void>
  rol: string | null
}

function abreviatura(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ConectarWallet({ account, chainId, error, conectar, rol }: ConectarWalletProps) {
  const redCorrecta = chainId === 11155111

  return (
    <div className="flex items-center gap-3">
      {error && !account && (
        <span className="text-red-400 text-sm">{error}</span>
      )}

      {!account ? (
        <button
          onClick={conectar}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium transition-colors"
        >
          Conectar MetaMask
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-gray-300 font-mono text-sm">{abreviatura(account)}</span>

          <span className={`text-xs px-2 py-1 rounded-full font-medium ${redCorrecta ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
            {redCorrecta ? 'Sepolia' : '⚠️ Red incorrecta'}
          </span>

          {rol && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              rol === 'Creador' ? 'bg-purple-400/10 text-purple-400' :
              rol === 'Auditor' ? 'bg-indigo-400/10 text-indigo-400' :
              'bg-blue-400/10 text-blue-400'
            }`}>
              {rol}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
