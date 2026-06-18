interface TxStatusProps {
  status: 'idle' | 'pendiente' | 'minando' | 'ok' | 'error'
  mensaje: string
}

export default function TxStatus({ status, mensaje }: TxStatusProps) {
  if (status === 'idle') return null

  return (
    <div className="mt-4 p-4 rounded-xl border">
      {status === 'pendiente' && (
        <div className="flex items-center gap-3 text-yellow-400 border-yellow-400/30 bg-yellow-400/5 p-3 rounded-lg">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Esperando confirmación en MetaMask...</span>
        </div>
      )}

      {status === 'minando' && (
        <div className="flex items-center gap-3 text-indigo-400 border-indigo-400/30 bg-indigo-400/5 p-3 rounded-lg">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Transacción enviada, minando...</span>
        </div>
      )}

      {status === 'ok' && (
        <div className="flex items-center gap-3 text-green-400 border-green-400/30 bg-green-400/5 p-3 rounded-lg">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{mensaje}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-3 text-red-400 border-red-400/30 bg-red-400/5 p-3 rounded-lg">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{mensaje}</span>
        </div>
      )}
    </div>
  )
}
