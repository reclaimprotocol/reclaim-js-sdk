import { ethers } from 'ethers';
import type { WitnessData } from './utils/interfaces';
import type { ClaimID, ClaimInfo, CompleteClaimData } from './utils/types';
import canonicalStringify from 'canonicalize';

type BeaconState = {
  witnesses: WitnessData[];
  epoch: number;
  witnessesRequiredForClaim: number;
  nextEpochTimestampS: number;
};

export function fetchWitnessListForClaim(
  { witnesses, witnessesRequiredForClaim, epoch }: BeaconState,
  params: string | ClaimInfo,
  timestampS: number
): WitnessData[] {
  const identifier: ClaimID =
    typeof params === 'string' ? params : getIdentifierFromClaimInfo(params);
  const completeInput: string = [
    identifier,
    epoch.toString(),
    witnessesRequiredForClaim.toString(),
    timestampS.toString(),
  ].join('\n');
  const completeHashStr: string = ethers.keccak256(strToUint8Array(completeInput));
  const completeHash: Uint8Array = ethers.getBytes(completeHashStr);
  const completeHashView: DataView = uint8ArrayToDataView(completeHash);
  const witnessesLeft: WitnessData[] = [...witnesses];
  const selectedWitnesses: WitnessData[] = [];
  let byteOffset: number = 0;
  for (let i = 0; i < witnessesRequiredForClaim; i++) {
    const randomSeed: number = completeHashView.getUint32(byteOffset);
    const witnessIndex: number = randomSeed % witnessesLeft.length;
    const witness: WitnessData = witnessesLeft[witnessIndex];
    selectedWitnesses.push(witness);

    witnessesLeft[witnessIndex] = witnessesLeft[witnessesLeft.length - 1];
    witnessesLeft.pop();
    byteOffset = (byteOffset + 4) % completeHash.length;
  }

  return selectedWitnesses;
}


export function getIdentifierFromClaimInfo(info: ClaimInfo): ClaimID {
	//re-canonicalize context if it's not empty
	if(info.context?.length > 0) {
		try {
			const ctx = JSON.parse(info.context)
			info.context = canonicalStringify(ctx)!
		} catch(e) {
			throw new Error('unable to parse non-empty context. Must be JSON')
		}
	}

	const str = `${info.provider}\n${info.parameters}\n${info.context || ''}`
	return ethers.keccak256(strToUint8Array(str)).toLowerCase()
}

export function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function uint8ArrayToDataView(arr: Uint8Array): DataView {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}

export function createSignDataForClaim(data: CompleteClaimData): string {
  const identifier: ClaimID =
    'identifier' in data ? data.identifier : getIdentifierFromClaimInfo(data);
  const lines: string[] = [
    identifier,
    data.owner.toLowerCase(),
    data.timestampS.toString(),
    data.epoch.toString(),
  ];

  return lines.join('\n');
}
