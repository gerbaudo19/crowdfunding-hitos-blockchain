import { useMemo } from 'react'
import { Contract, JsonRpcSigner } from 'ethers'
import HitosVerifierABI from '../abi/HitosVerifier.json'
import CrowdfundingHitosABI from '../abi/CrowdfundingHitos.json'

interface UseContratosReturn {
  verifierContrato: Contract | null
  crowdfundingContrato: Contract | null
}

export function useContratos(
  signer: JsonRpcSigner | null,
  verifierAddress: string | null,
  crowdfundingAddress: string | null
): UseContratosReturn {
  const verifierContrato = useMemo(() => {
    if (!signer || !verifierAddress) return null
    return new Contract(verifierAddress, HitosVerifierABI, signer)
  }, [signer, verifierAddress])

  const crowdfundingContrato = useMemo(() => {
    if (!signer || !crowdfundingAddress) return null
    return new Contract(crowdfundingAddress, CrowdfundingHitosABI, signer)
  }, [signer, crowdfundingAddress])

  return { verifierContrato, crowdfundingContrato }
}
