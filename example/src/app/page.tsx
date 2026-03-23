'use client'
import React, { useEffect, useState } from 'react'
import { ReclaimProofRequest, verifyProof } from '@reclaimprotocol/js-sdk'
import { Proof } from '@reclaimprotocol/js-sdk'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [proofData, setProofData] = useState<Proof[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reclaimProofRequest, setReclaimProofRequest] = useState<ReclaimProofRequest | null>(null)
  const [requestUrl, setRequestUrl] = useState<string | null>(null)
  const [showIframe, setShowIframe] = useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const [proofJsonInput, setProofJsonInput] = useState('')
  const [verifyResult, setVerifyResult] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

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
      // 043045089

      const proofRequest = await ReclaimProofRequest.init(
        '0x36E4ee51eb6F0919330D894a23138345ce89085B',
        '0x5e6212e6692fe2b8592fb32631c4b463abb095db621d2a3b606bec3517947234',
        "example",
        {
          // to prevent appClip to be triggered on ios
          //useAppClip: false,
          canAutoSubmit: true,
          // websdk url 
         customSharePageUrl: 'https://portal.reclaimprotocol.org',
          log: false
        }
      )

      // 



      //await proofRequest.setContext('0x48796C654F7574707574', 'test')

      //await proofRequest.setAppCallbackUrl('https://api.reclaimprotocol.org/callback',true)

     
      setReclaimProofRequest(proofRequest)



      // // // Add context to the proof request (optional)
      // proofRequest.addContext("0x48796C654F7574707574", "test")

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
    setError('Reclaim not initialized. Please refresh the page.');
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    // Fetch the request URL
    const requestUrlLink = await reclaimProofRequest.getRequestUrl();
    setRequestUrl(requestUrlLink);
    console.log('Request URL:', requestUrlLink);
    // copy to clipboard
    navigator.clipboard.writeText(requestUrlLink);
    //await window.open(requestUrlLink, '_blank');
    //setShowIframe(true);

    // Start the Reclaim session
    await reclaimProofRequest.startSession({
      onSuccess: (proof) => {
        setIsLoading(false);
        setShowIframe(false);
        if (proof && typeof proof !== 'string') {
          setProofData(Array.isArray(proof) ? proof : [proof]);
        } else {
          setError('Received string response instead of proof object.');
        }
      },
      onError: (error: Error) => {
        setIsLoading(false);
        setShowIframe(false);
        setError(`Error: ${error.message}`);
      },
    });
  } catch (error) {
    setIsLoading(false);
    console.log('Error starting claim process:', error);
    setShowIframe(false);
    setError('Failed to start verification. Please try again.');
  }
}

function refreshIframe() {
  if (iframeRef.current) {
    iframeRef.current.src = iframeRef.current.src;
  }
}

  async function handleVerifyProofJson() {
    setVerifyResult(null)
    setIsVerifying(true)
    try {
      const parsed = JSON.parse(proofJsonInput)
      const proofs = Array.isArray(parsed) ? parsed : [parsed]
      const data = await verifyProof(proofs)
      console.log(data)
      setVerifyResult(data.isVerified ? 'Proof verified successfully' : 'Proof verification failed')
    } catch (e: any) {
      setVerifyResult(`Error: ${e.message}`)
    } finally {
      setIsVerifying(false)
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

        {showIframe && requestUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-semibold">Complete Verification</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshIframe}
                    className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                    title="Refresh"
                  >
                    &#x21bb;
                  </button>
                  <button
                    onClick={() => setShowIframe(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    title="Close"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <iframe
                ref={iframeRef}
                src={requestUrl}
                className="flex-1 w-full"
                title="Reclaim Verification"
                allow="camera; microphone; clipboard-read; clipboard-write"
              />
            </div>
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
        
        
        {/* Verify Proof JSON */}
        <div className="mt-12 bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Verify Proof JSON</h2>
          <p className="text-gray-600 mb-4 text-sm">Paste a proof JSON (single object or array) to verify its signatures.</p>
          <textarea
            value={proofJsonInput}
            onChange={(e) => setProofJsonInput(e.target.value)}
            placeholder='Paste proof JSON here...'
            className="w-full h-48 p-3 border border-gray-300 rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleVerifyProofJson}
            disabled={isVerifying || !proofJsonInput.trim()}
            className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-5 rounded-lg transition-colors shadow-md"
          >
            {isVerifying ? 'Verifying...' : 'Verify Proof'}
          </button>
          {verifyResult && (
            <div className={`mt-4 p-3 rounded-md text-sm font-medium ${
              verifyResult.startsWith('Proof verified successfully')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {verifyResult}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
