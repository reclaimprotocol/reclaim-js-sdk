import { ethers } from 'ethers';
import type { ClaimID, ClaimInfo, CompleteClaimData, HttpProviderParams } from './utils/types';
import { canonicalStringify } from './utils/strings';
import { ProviderClaimData } from './utils/interfaces';

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

export function hashProviderParams(params: HttpProviderParams): string {
  const filteredParams: HttpProviderParams = {
    url: params.url ?? '',
    method: params.method ?? '',
    body: params.body ?? '',
    responseMatches: params.responseMatches?.map(it => ({
      value: it.value ?? '',
      type: it.type ?? 'regex',
      invert: it.invert ?? false,
      isOptional: it.isOptional ?? false,
    })) ?? [],
    responseRedactions: params.responseRedactions?.map(it => ({
      xPath: it.xPath ?? '',
      jsonPath: it.jsonPath ?? '',
      regex: it.regex ?? '',
      hash: it.hash ?? undefined,
    })) ?? [],
  }

  const serializedParams = canonicalStringify(filteredParams)
  return ethers.keccak256(
    strToUint8Array(serializedParams)
  ).toLowerCase()
}

function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
