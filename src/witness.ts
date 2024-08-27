import { ethers } from 'ethers';
import type { WitnessData } from './interfaces';
import type { ClaimID, ClaimInfo, CompleteClaimData } from './types';

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
) {
  const identifier =
    typeof params === 'string' ? params : getIdentifierFromClaimInfo(params);
  const completeInput = [
    identifier,
    epoch.toString(),
    witnessesRequiredForClaim.toString(),
    timestampS.toString(),
  ].join('\n');
  const completeHashStr = ethers.keccak256(strToUint8Array(completeInput));
  const completeHash = ethers.getBytes(completeHashStr);
  const completeHashView = uint8ArrayToDataView(completeHash);
  const witnessesLeft = [...witnesses];
  const selectedWitnesses: WitnessData[] = [];
  // we'll use 32 bits of the hash to select
  // each witness
  let byteOffset = 0;
  for (let i = 0; i < witnessesRequiredForClaim; i++) {
    const randomSeed = completeHashView.getUint32(byteOffset);
    const witnessIndex = randomSeed % witnessesLeft.length;
    const witness = witnessesLeft[witnessIndex] as WitnessData;
    selectedWitnesses.push(witness);

    // Remove the selected witness from the list of witnesses left
    witnessesLeft[witnessIndex] = witnessesLeft[
      witnessesLeft.length - 1
    ] as WitnessData;
    witnessesLeft.pop();
    byteOffset = (byteOffset + 4) % completeHash.length;
  }

  return selectedWitnesses;
}

export function getIdentifierFromClaimInfo(info: ClaimInfo): ClaimID {
  const str = `${info.provider}\n${info.parameters}\n${info.context || ''}`;
  return ethers.keccak256(strToUint8Array(str)).toLowerCase();
}

export function strToUint8Array(str: string) {
  return new TextEncoder().encode(str);
}

export function uint8ArrayToDataView(arr: Uint8Array) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}

export function createSignDataForClaim(data: CompleteClaimData) {
  const identifier =
    'identifier' in data ? data.identifier : getIdentifierFromClaimInfo(data);
  const lines = [
    identifier,
    data.owner.toLowerCase(),
    data.timestampS.toString(),
    data.epoch.toString(),
  ];

  return lines.join('\n');
}
