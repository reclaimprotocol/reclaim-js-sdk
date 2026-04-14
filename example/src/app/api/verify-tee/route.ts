import { NextResponse } from 'next/server'
import { verifyTeeAttestation } from '@reclaimprotocol/js-sdk'
import type { Proof } from '@reclaimprotocol/js-sdk'

type VerifyTeeRequestBody = {
  proofs?: Proof[]
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as VerifyTeeRequestBody
    const proofs = Array.isArray(body.proofs) ? body.proofs : []

    if (proofs.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty `proofs` array' },
        { status: 400 }
      )
    }

    const appSecret = process.env.RECLAIM_APP_SECRET || process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET

    const results = await Promise.all(
      proofs.map(async (proof, index) => {
        const result = await verifyTeeAttestation(proof, appSecret!)

        return {
          index,
          isTeeAttestationVerified: result.isVerified,
          error: result.error,
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify TEE attestations',
      },
      { status: 500 }
    )
  }
}
