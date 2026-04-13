'use client'
import React, { useState } from 'react'
import { ReclaimProofRequest, verifyProof } from '@reclaimprotocol/js-sdk'
import type { Proof, VerifyProofResult } from '@reclaimprotocol/js-sdk'

type TeeCheckResult = {
  index: number
  isTeeVerified: boolean
  error?: string
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [proofData, setProofData] = useState<Proof[] | null>(null)
  const [verifyResult, setVerifyResult] = useState<VerifyProofResult | null>(null)
  const [teeResults, setTeeResults] = useState<TeeCheckResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reclaimProofRequest, setReclaimProofRequest] = useState<ReclaimProofRequest | null>(null)
  const [requestUrl, setRequestUrl] = useState<string | null>(null)
  const [proofJsonInput, setProofJsonInput] = useState('')
  const [applicationSecretInput, setApplicationSecretInput] = useState(process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET ?? '')

  async function verifyTeeOnServer(proofs: Proof[]): Promise<TeeCheckResult[]> {
    const response = await fetch('/api/verify-tee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proofs,
        expectedApplicationId: process.env.NEXT_PUBLIC_RECLAIM_APP_ID,
        applicationSecret: applicationSecretInput.trim() || undefined,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to verify TEE attestations on the server')
    }

    return payload.results as TeeCheckResult[]
  }

  async function runVerification(proofs: Proof[], options?: { strictProofConfig?: Parameters<typeof verifyProof>[1] }) {
    const proofVerification = await verifyProof(
      proofs,
      options?.strictProofConfig ?? { dangerouslyDisableContentValidation: true }
    )

    const teeVerification = await verifyTeeOnServer(proofs)

    setVerifyResult(proofVerification)
    setTeeResults(teeVerification)
  }

  function parseProofInput(input: string): Proof[] {
    const parsed = JSON.parse(input)
    if (Array.isArray(parsed)) {
      return parsed as Proof[]
    }
    return [parsed as Proof]
  }

  async function initializeReclaimProofRequest() {
    try {
      const proofRequest = await ReclaimProofRequest.init(
        process.env.NEXT_PUBLIC_RECLAIM_APP_ID!,
        process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET!,
        process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ID!,
        {
          log: true,
          // acceptTeeAttestation: true,
          // portalUrl: 'https://portal.reclaimprotocol.org', // default
          // launchOptions: { verificationMode: 'app' }, // for native app flow
          // useAppClip: true, // for App Clip on iOS with verificationMode: 'app'
          // portalUrl: 'https://portal.reclaimprotocol.org', 
        }
      )
      proofRequest.setAppCallbackUrl('<YOUR_APP_CALLBACK_URL>', true)
      

      setReclaimProofRequest(proofRequest)
      return proofRequest
    } catch (error) {
      console.error('Error initializing ReclaimProofRequest:', error)
      setError('Failed to initialize Reclaim. Please try again.')
      return null
    }
  }

  async function startClaimProcess() {
    setIsLoading(true)
    setError(null)

    let proofRequest = reclaimProofRequest;
    if (!proofRequest) {
      proofRequest = await initializeReclaimProofRequest();
      if (!proofRequest) {
        setIsLoading(false);
        return;
      }
    }

    try {
      const url = await proofRequest.getRequestUrl()
      setRequestUrl(url)

      await proofRequest.startSession({
        onSuccess: async (proof: Proof | Proof[] | undefined) => {
          setIsLoading(false)

          if (proof && typeof proof !== 'string') {
            const proofs = Array.isArray(proof) ? proof : [proof]
            setProofData(proofs)
            setProofJsonInput(JSON.stringify(proofs, null, 2))

            const providerVersion = proofRequest.getProviderVersion()
            await runVerification(proofs, { strictProofConfig: providerVersion })
          }
        },
        onError: (error: Error) => {
          console.error('Error in proof generation:', error)
          setIsLoading(false)
          setError(`Error: ${error.message}`)
        }
      })
    } catch (error) {
      console.error('Error starting verification session:', error)
      setIsLoading(false)
      setError('Failed to start verification. Please try again.')
    }
  }

  async function verifyPastedProof() {
    try {
      setError(null)
      setIsLoading(true)

      const proofs = parseProofInput(proofJsonInput)
      setProofData(proofs)
      setRequestUrl(null)
      await runVerification(proofs)
    } catch (error) {
      console.error('Error verifying pasted proof:', error)
      setVerifyResult(null)
      setTeeResults(null)
      setProofData(null)
      setError(error instanceof Error ? error.message : 'Failed to verify pasted proof')
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderUrl = (proof: Proof) => {
    try {
      const parameters = JSON.parse(proof.claimData.parameters)
      return parameters.url || 'Unknown Provider'
    } catch {
      return proof.claimData.provider || 'Unknown Provider'
    }
  }

  const teeVerifiedCount = teeResults?.filter(result => result.isTeeVerified).length ?? 0

  return (
    <main className='flex min-h-screen flex-col items-center p-8 bg-gray-50'>
      <div className='max-w-4xl w-full mx-auto'>
        <h1 className='text-3xl font-bold mb-8 text-center'>Reclaim SDK</h1>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Verify Pasted Proof</h2>
          <p className="mt-2 text-sm text-gray-600">
            Paste a proof JSON object or array below to verify the witness proof and the TEE attestation from the UI.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Proof JSON
              </label>
              <textarea
                value={proofJsonInput}
                onChange={(event) => setProofJsonInput(event.target.value)}
                placeholder='Paste proof JSON here'
                className="min-h-[240px] w-full rounded-lg border border-gray-300 p-3 font-mono text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Application Secret
              </label>
              <input
                type="text"
                value={applicationSecretInput}
                onChange={(event) => setApplicationSecretInput(event.target.value)}
                placeholder="Required for hash-based attestation nonces"
                className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-2 text-xs text-gray-500">
                This should be your Reclaim application secret so the TEE nonce can be recomputed locally.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={verifyPastedProof}
                disabled={isLoading || !proofJsonInput.trim()}
                className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                Verify Pasted Proof + TEE
              </button>
              <button
                onClick={() => {
                  setProofJsonInput('')
                  setProofData(null)
                  setVerifyResult(null)
                  setTeeResults(null)
                  setError(null)
                  setRequestUrl(null)
                }}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {!proofData && !isLoading && !requestUrl && (
          <div className="text-center">
            <p className="mb-6 text-gray-700">
              Click the button below to start the claim process.
            </p>
            <button
              onClick={startClaimProcess}
              className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md'
            >
              Start Claim Process
            </button>
          </div>
        )}

        {requestUrl && !proofData && (
          <div className="text-center mt-6">
            <p className="mb-4">Please complete the verification using this link:</p>
            <a
              href={requestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline font-medium break-all"
            >
              {requestUrl}
            </a>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-gray-700">Processing your claim...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        {proofData && proofData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              {verifyResult?.isVerified ? 'Verification Successful' : 'Proofs Received'}
            </h2>

            {verifyResult && (
              <div className={`mb-6 p-4 rounded-md text-sm font-medium ${verifyResult.isVerified
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                {verifyResult.isVerified ? 'All proofs verified successfully' : 'Proof verification failed'}
              </div>
            )}

            {teeResults && (
              <div className={`mb-6 rounded-md border p-4 text-sm font-medium ${teeVerifiedCount === teeResults.length
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                {teeVerifiedCount === teeResults.length
                  ? `TEE verification passed for all ${teeResults.length} proof(s)`
                  : `TEE verification passed for ${teeVerifiedCount}/${teeResults.length} proof(s)`}
              </div>
            )}

            {proofData.map((proof, index) => (
              <div key={index} className="mb-8 bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-medium">Proof #{index + 1}</h3>
                    {teeResults && (
                      <p className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${teeResults[index]?.isTeeVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                        }`}>
                        {teeResults[index]?.isTeeVerified ? 'TEE Verified' : 'TEE Not Verified'}
                      </p>
                    )}
                  </div>
                  {verifyResult?.isVerified && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Proof Verified</span>
                  )}
                </div>

                {teeResults && !teeResults[index]?.isTeeVerified && teeResults[index]?.error && (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium">TEE verification reason</p>
                    <p className="mt-1 break-all font-mono text-xs">{teeResults[index]?.error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Provider</p>
                    <p className="font-medium break-all">{getProviderUrl(proof)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Timestamp</p>
                    <p>{new Date(proof.claimData.timestampS * 1000).toLocaleString()}</p>
                  </div>
                </div>

                {proof.teeAttestation && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">TEE Attestation Summary</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">TEE Provider</p>
                        <p className="mt-1 font-medium">{proof.teeAttestation.tee_provider}</p>
                      </div>
                      <div className="rounded bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">TEE Technology</p>
                        <p className="mt-1 font-medium">{proof.teeAttestation.tee_technology}</p>
                      </div>
                      <div className="rounded bg-gray-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">TEE Nonce</p>
                        <p className="mt-1 break-all font-mono text-sm">{proof.teeAttestation.nonce}</p>
                      </div>
                      <div className="rounded bg-gray-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Workload Image</p>
                        <p className="mt-1 break-all font-mono text-sm">{proof.teeAttestation.workload.image_digest}</p>
                      </div>
                      <div className="rounded bg-gray-50 p-3 md:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Verifier Image</p>
                        <p className="mt-1 break-all font-mono text-sm">{proof.teeAttestation.verifier.image_digest}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extracted parameters from verifyProof result */}
                {verifyResult?.isVerified && verifyResult.data[index] && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">Extracted Parameters</p>
                    {Object.entries(verifyResult.data[index].extractedParameters).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(verifyResult.data[index].extractedParameters).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 p-2 rounded">
                            <div className="flex flex-col">
                              <span className="font-medium">{key}:</span>
                              <span className="font-mono break-all">{String(value)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 bg-gray-50 p-2 rounded">No parameters extracted</p>
                    )}
                  </div>
                )}

                {/* Context from verifyProof result */}
                {verifyResult?.isVerified && verifyResult.data[index] && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">Context</p>
                    <pre className="text-sm text-gray-600 font-mono break-all bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(verifyResult.data[index].context, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Witnesses section */}
                {proof.witnesses && proof.witnesses.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">Attested by</p>
                    <div className="space-y-2">
                      {proof.witnesses.map((witness, widx) => (
                        <div key={widx} className="bg-gray-50 p-2 rounded">
                          <p className="text-sm font-mono break-all">{witness.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Identifier */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-2">Proof Identifier</p>
                  <p className="text-sm text-gray-600 font-mono break-all bg-gray-50 p-2 rounded">
                    {proof.identifier}
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                setProofData(null)
                setVerifyResult(null)
                setTeeResults(null)
              }}
              className="mt-4 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium shadow-sm w-full md:w-auto"
            >
              Start New Claim
            </button>
          </div>
        )}
        {/* Optional: Add debug link for device detection testing */}
        {/* <div className="text-center mt-8">
          <a href="/debug" className="text-sm text-blue-600 hover:underline">
            Device Detection Debug →
          </a>
        </div> */}
      </div>
    </main>
  )
}
