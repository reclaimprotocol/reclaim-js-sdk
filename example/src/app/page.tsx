'use client'
import React, { useEffect, useState } from 'react'
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'
import { Proof } from '@reclaimprotocol/js-sdk'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [proofData, setProofData] = useState<Proof[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reclaimProofRequest, setReclaimProofRequest] = useState<ReclaimProofRequest | null>(null)

  useEffect(() => {
    // Initialize the ReclaimProofRequest when the component mounts
    initializeReclaimProofRequest()
    // verifyProofData()
  }, [])

  async function initializeReclaimProofRequest() {
    try {
      // ReclaimProofRequest Fields:
      // - applicationId: Unique identifier for your application
      // - providerId: Identifier for the specific provider you're using
      // - sessionId: Unique identifier for the current proof request session
      // - context: Additional context information for the proof request
      // - requestedProof: Details of the proof being requested
      // - signature: Cryptographic signature for request authentication
      // - redirectUrl: URL to redirect after proof generation (optional)
      // - appCallbackUrl: URL for receiving proof generation updates (optional)
      // - timeStamp: Timestamp of the proof request
      // - options: Additional configuration options


      const proofRequest = await ReclaimProofRequest.init(
        process.env.NEXT_PUBLIC_RECLAIM_APP_ID!,
        process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET!,
        process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ID!,
        // Uncomment the following line to enable logging and AI providers
        {
          log: true,
        }
      )
      setReclaimProofRequest(proofRequest)

      // // // Add context to the proof request (optional)
      // proofRequest.setContext("0x48796C654F7574707574", "test")

      // deprecated method: use setContext instead
      // proofRequest.addContext("0x48796C654F7574707574", "test1")

      // Set parameters for the proof request (if needed)
      // proofRequest.setParams({ email: "test@example.com", userName: "testUser" })

      // Set a redirect URL (if needed)
      // proofRequest.setRedirectUrl('https://example.com/redirect')

      // Set a custom app callback URL (if needed)
      // proofRequest.setAppCallbackUrl('https://webhook.site/fd6cf442-0ea7-4427-8cb8-cb4dbe8884d2')

      // Uncomment the following line to log the proof request and to get the Json String
      // console.log('Proof request initialized:', proofRequest.toJsonString())
    } catch (error) {
      console.error('Error initializing ReclaimProofRequest:', error)
      setError('Failed to initialize Reclaim. Please try again.')
    }
  }

  async function startClaimProcess() {
    if (!reclaimProofRequest) {
      setError('Reclaim not initialized. Please refresh the page.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Start the verification session
      await reclaimProofRequest.triggerReclaimFlow()

      await reclaimProofRequest.startSession({
        onSuccess: async (proof: Proof | Proof[] | string | undefined) => {
          setIsLoading(false)

          if (proof && typeof proof === 'string') {
            console.log('SDK Message:', proof)
            setError('Received string response instead of proof object.')
          } else if (proof && typeof proof !== 'string') {
            console.log('Proof received:', proof)
            if (Array.isArray(proof)) {
              setProofData(proof)
            } else {
              setProofData([proof])
            }
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

  // Function to extract provider URL from parameters
  const getProviderUrl = (proof: Proof) => {
    try {
      const parameters = JSON.parse(proof.claimData.parameters);
      return parameters.url || "Unknown Provider";
    } catch (e) {
      return proof.claimData.provider || "Unknown Provider";
    }
  }

  // Function to beautify and display extracted parameters
  const renderExtractedParameters = (proof: Proof) => {
    try {
      const context = JSON.parse(proof.claimData.context)
      const extractedParams = context.extractedParameters || {}

      return (
        <>
          <p className="text-sm font-medium text-gray-500 mb-2">Extracted Parameters</p>
          {Object.entries(extractedParams).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(extractedParams).map(([key, value]) => (
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
        </>
      )
    } catch (e) {
      return <p className="text-red-500 bg-gray-50 p-2 rounded">Failed to parse parameters</p>
    }
  }

  return (
    <main className='flex min-h-screen flex-col items-center p-8 bg-gray-50'>
      <div className='max-w-4xl w-full mx-auto'>
        <h1 className='text-3xl font-bold mb-8 text-center'>Reclaim SDK</h1>

        {!proofData && !isLoading && (
          <div className="text-center">
            <p className="mb-6 text-gray-700">
              Click the button below to start the claim process.
            </p>
            <button
              onClick={startClaimProcess}
              className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md'
              disabled={!reclaimProofRequest}
            >
              Start Claim Process
            </button>
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
            <h2 className="text-2xl font-semibold mb-6 text-center">Verification Successful</h2>

            {proofData.map((proof, index) => (
              <div key={index} className="mb-8 bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-medium">Proof #{index + 1}</h3>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Verified</span>
                </div>

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

                {/* Extracted parameters section */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  {renderExtractedParameters(proof)}
                </div>

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

                {/* Signatures section */}
                {proof.signatures && proof.signatures.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">Signatures</p>
                    <div className="space-y-2">
                      {proof.signatures.map((signature, sidx) => (
                        <div key={sidx} className="bg-gray-50 p-2 rounded">
                          <p className="text-sm font-mono break-all">{signature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Identifier (full) */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-2">Proof Identifier</p>
                  <p className="text-sm text-gray-600 font-mono break-all bg-gray-50 p-2 rounded">
                    {proof.identifier}
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={() => setProofData(null)}
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
