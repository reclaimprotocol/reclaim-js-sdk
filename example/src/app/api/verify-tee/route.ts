import { NextResponse } from 'next/server'
import { verifyTeeAttestationDetailed } from '@reclaimprotocol/js-sdk'
import type { Proof } from '@reclaimprotocol/js-sdk'

type VerifyTeeRequestBody = {
  proofs?: Proof[]
  expectedApplicationId?: string
  applicationSecret?: string
  teeVerificationSecret?: string
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

    const expectedApplicationId =
      body.expectedApplicationId ||
      process.env.RECLAIM_APP_ID ||
      process.env.NEXT_PUBLIC_RECLAIM_APP_ID

    const applicationSecret =
      body.applicationSecret ||
      body.teeVerificationSecret ||
      process.env.RECLAIM_APP_SECRET ||
      process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET

    const teeVerificationSecret =
      body.teeVerificationSecret ||
      applicationSecret

    const results = await Promise.all(
      proofs.map(async (proof, index) => {
        const result = await verifyTeeAttestationDetailed(
          proof,
          expectedApplicationId,
          teeVerificationSecret
        )

        return {
          index,
          isTeeVerified: result.isVerified,
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
