import { ethers } from 'ethers';
import type { ClaimID, ClaimInfo, CompleteClaimData } from './utils/types';
import { canonicalStringify } from './utils/strings';

export function getIdentifierFromClaimInfo(info: ClaimInfo): ClaimID {
  // re-canonicalize context if it's not empty
  let canonicalContext = info.context || '';
  if (canonicalContext.length > 0) {
    try {
      const ctx = JSON.parse(canonicalContext);
      canonicalContext = canonicalStringify(ctx);
    } catch (e) {
      throw new Error('unable to parse non-empty context. Must be JSON');
    }
  }

  const str = `${info.provider}\n${info.parameters}\n${canonicalContext}`;
  return ethers.keccak256(strToUint8Array(str)).toLowerCase();
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
