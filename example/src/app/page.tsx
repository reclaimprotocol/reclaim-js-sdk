'use client'
import React, { useEffect } from 'react'
import { Reclaim } from '@reclaimprotocol/js-sdk'
import { Proof } from '@reclaimprotocol/js-sdk'
import { useQRCode } from 'next-qrcode'
import Link from 'next/link'

export default function Home() {
  const [verificationReqUrl, setVerificationReqUrl] = React.useState<string>('')
  const [extracted, setExtracted] = React.useState<any>(null)
  const { Canvas } = useQRCode()
  const APP_ID = "<INSERT_SECRET>";
  // prototype mode
  async function startVerificationSession() {
    const reclaimProofRequest = new Reclaim.ProofRequest(APP_ID, { log: true })
    reclaimProofRequest.addContext('0x00000000000', 'hi there')
    await reclaimProofRequest.buildProofRequest("<INSERT_SECRET>", false, 'V2Linking')
    await reclaimProofRequest.setRedirectUrl("https://google.com")

    // reclaimProofRequest.setParams({ test: "aim" })
    // reclaimProofRequest.setRedirectUrl('http://mywebsite.com/home')
    // reclaimProofRequest.setAppCallbackUrl('http://localhost:3000/api/reclaim/callback?appId=ddd&session=ddd')

    reclaimProofRequest.setSignature(
      await reclaimProofRequest
        .generateSignature(
          '<INSERT_SECRET>' // Note: This is for prototype mode only. In production, the application secret should be handled on the backend.
        )
    );

    const { requestUrl, statusUrl } = await reclaimProofRequest.createVerificationRequest()
    await reclaimProofRequest.startSession({
      onSuccessCallback: (proofs: Proof[]) => {
        console.log('success', Reclaim.transformForOnchain(proofs[0]))
        setExtracted(JSON.stringify(proofs[0].claimData.context))
      },
      onFailureCallback: (error: Error) => {
        console.log('error', error)
      }
    })
    setVerificationReqUrl(requestUrl)
  }
  console.log(extracted)
  // production mode
  async function startVerificationSessionProductionMode() {
    const reclaimProofRequest = new Reclaim.ProofRequest(APP_ID, { log: true })

    // reclaimProofRequest.setSignature(
    //   // TODO: fetch signature from your backend
    //   // On the backend, generate signature using:
    //   // await reclaimProofRequest.getSignature(requestedProofs, APP_SECRET)
    // )

    const { requestUrl, statusUrl } = await reclaimProofRequest.createVerificationRequest()

    await reclaimProofRequest.startSession({
      onSuccessCallback: (proofs: Proof[]) => {
        console.log('success', proofs)
        setExtracted(JSON.stringify(proofs[0].extractedParameterValues))
      },
      onFailureCallback: (error: Error) => {
        console.log('error', error)
      }
    })

    setVerificationReqUrl(requestUrl)
  }

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <div className='max-w-5xl gap-2  w-full items-center justify-between font-mono text-sm lg:flex lg:flex-col lg:gap-10'>
        Reclaim DEMO
        {!verificationReqUrl && (
          <button onClick={startVerificationSession}>
            Create Claim QrCode
          </button>
        )}
        <Link href={'https://appclip.apple.com/id?p=org.reclaimprotocol.app.clip&template=%7B"sessionId"%3A"bf644675-1df0-46a6-80a4-7073ff3b5a8f"%2C"providerId"%3A"81dd6dc5-b50d-4276-b4cb-dc67bdcf919f"%2C"applicationId"%3A"0x486dD3B9C8DF7c9b263C75713c79EC1cf8F592F2"%2C"signature"%3A"0x1d9d2881048a009f4893b2c2ddfb5a1324b052d2c355eecd45aa580d28abd80d4df4810a3b5ce6c9729c307c38313ca7606b0acb2077793cbd92d03aa994d5681b"%2C"timestamp"%3A"1721904204818"%2C"callbackUrl"%3A"https%3A%2F%2Fapi.reclaimprotocol.org%2Fapi%2Fsdk%2Fcallback%3FcallbackId%3Dbf644675-1df0-46a6-80a4-7073ff3b5a8f"%2C"context"%3A"%7B%5C"contextAddress%5C"%3A%5C"0x00000000000%5C"%2C%5C"contextMessage%5C"%3A%5C"hi%20there%5C"%7D"%2C"verificationType"%3A"WITNESS"%2C"parameters"%3A%7B%7D%2C"redirectUrl"%3A"https%3A%2F%2Fgoogle.com%2F"%7D'} target='_blank' > <h1 className='text-2xl'>extracted</h1></Link>


        {verificationReqUrl && (
          <Link href={verificationReqUrl} target='_blank'>
            <Canvas
              text={verificationReqUrl}
              options={{
                errorCorrectionLevel: 'L',
                margin: 3,
                scale: 10,
                width: 320,
                color: {
                  dark: '#000',
                  light: '#ddd'
                }
              }}
            />
          </Link>
        )}
        {extracted && (
          <div className='text-center'>
            <h1 className='text-2xl'>{extracted}</h1>
          </div>
        )}
        {!extracted && (
          <div role='status'>
            <svg
              aria-hidden='true'
              className='w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600'
              viewBox='0 0 100 101'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
                fill='currentColor'
              />
              <path
                d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
                fill='currentFill'
              />
            </svg>
            <span className='sr-only'>Loading...</span>
          </div>
        )}
      </div>
    </main >
  )
}
