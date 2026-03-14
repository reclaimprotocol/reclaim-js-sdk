import { ethers } from 'ethers';
import type { ClaimID, ClaimInfo, CompleteClaimData, HttpProviderClaimParams } from './utils/types';
import { canonicalStringify } from './utils/strings';

export function createSignDataForClaim(data: CompleteClaimData): string {
  const identifier: ClaimID = getIdentifierFromClaimInfo(data);
  const lines: string[] = [
    identifier,
    data.owner.toLowerCase(),
    data.timestampS.toString(),
    data.epoch.toString(),
  ];

  return lines.join('\n');
}

function getIdentifierFromClaimInfo(info: ClaimInfo): ClaimID {
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

export function hashProofClaimParams(params: HttpProviderClaimParams): string {
  const serializedParams = getProviderParamsAsCanonicalizedString(params);

  return ethers.keccak256(
    strToUint8Array(serializedParams)
  ).toLowerCase()
}

function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function getProviderParamsAsCanonicalizedString(params: HttpProviderClaimParams): string {
  const filteredParams: HttpProviderClaimParams = {
    url: params?.url ?? '',
    // METHOD needs to be explicitly specified and absence or unknown method should cause error, but we're choosing to ignore it in this case
    method: params?.method ?? 'GET',
    body: params?.body ?? '',
    responseMatches: params?.responseMatches?.map(it => ({
      value: it.value ?? '',
      // This needs to be explicitly specified and absence should cause error, but we're choosing to ignore it in this case
      type: it.type ?? 'contains',
      invert: it.invert || undefined,
      isOptional: it.isOptional || undefined,
    })) ?? [],
    responseRedactions: params?.responseRedactions?.map(it => ({
      xPath: it.xPath ?? '',
      jsonPath: it.jsonPath ?? '',
      regex: it.regex ?? '',
      hash: it.hash || undefined,
    })) ?? [],
  }

  const serializedParams = canonicalStringify(filteredParams)

  return serializedParams;
}
