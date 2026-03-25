import { ethers } from 'ethers';
import type { ClaimID, ClaimInfo, CompleteClaimData, HashableHttpProviderClaimParams, HttpProviderClaimParams } from './utils/types';
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

/**
 * Computes the cryptographic claim hash(es) for the HTTP provider payload parameters.
 * 
 * If the parameters comprise solely of rigid/required rules (or represents an extracted 
 * attested payload that enforces all its defined elements), this computes and returns a single deterministic string.
 *
 * **Combinatorial Hashes Intention:**
 * If the payload configuration defines optional elements (`isOptional: true` on ResponseMatchSpec),
 * a single rule configuration inherently encompasses multiple logical subset definitions. 
 * Since cryptographic hashes strictly enforce exact data byte-by-byte, 
 * this function recursively computes a hash for every mathematically valid permutation of the optional subsets 
 * (inclusive and exclusive) so the validator can verify the proof against any of the legitimate subset match signatures.
 * 
 * @param params - The HTTP provider claim configuration or extracted attested parameters.
 * @returns A single keccak256 hash string, or an array of hex-string hashes if parameter optionality generates combinations.
 */
export function hashProofClaimParams(params: HttpProviderClaimParams): string | string[] {
  const serializedParams = getProviderParamsAsCanonicalizedString(params);

  if (Array.isArray(serializedParams)) {
    return serializedParams.map(serialized =>
      ethers.keccak256(strToUint8Array(serialized)).toLowerCase()
    );
  }

  return ethers.keccak256(
    strToUint8Array(serializedParams)
  ).toLowerCase()
}

function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Computes canonicalized string(s) for the provided HTTP parameter payload.
 *
 * **Architectural Concept**:
 * In Reclaim, proof security revolves around generating a deterministic Hash based on the JSON stringified keys
 * of matched specifications (e.g. `responseMatches` and `responseRedactions`).
 * When processing a Provider Configuration containing `isOptional` rules, the protocol doesn't require users to generate a 
 * proof that matched *all* of the rules. A valid proof could inherently omit any optional rules if the server payload didn't contain them.
 * 
 * To ensure the eventual Proof's Hash safely validates against the parent template's Requirement Hash, logic here 
 * loops $2^N$ times using bitmask computation (where N = number of rule pairs) and yields canonically sorted 
 * permutations for every sub-set of optional combinations. 
 * Any combination forcefully omitting a mathematically required (`isOptional: false`) rule is stripped out.
 * 
 * Note: When a user successfully generates a proof, their attested parameter payload *strictly strips* out the `isOptional` tags, 
 * producing exactly 1 deterministic configuration subset (what the user actually proved!).
 *  
 * @param params - The structured parameters.
 * @returns Serialized string or array of strings.
 */
function getProviderParamsAsCanonicalizedString(params: HttpProviderClaimParams): string | string[] {
  // redaction cannot be more than response match
  const pairsCount = params?.responseMatches?.length ?? 0;
  const validCanonicalizedStrings: string[] = [];

  // Total combinations: 2^pairsCount
  const totalCombinations = 1 << pairsCount;

  for (let i = 0; i < totalCombinations; i++) {
    let isValidCombination = true;
    let includedCount = 0;

    const currentMatches: HashableHttpProviderClaimParams['responseMatches'] = [];
    const currentRedactions: HashableHttpProviderClaimParams['responseRedactions'] = [];

    for (let j = 0; j < pairsCount; j++) {
      const isIncluded = (i & (1 << j)) !== 0;
      const match = params?.responseMatches?.[j];
      const redaction = params?.responseRedactions?.[j];

      if (isIncluded) {
        if (match) {
          currentMatches.push({
            value: match.value ?? '',
            // This needs to be explicitly specified and absence should cause error, but we're choosing to ignore it in this case
            type: match.type ?? 'contains',
            invert: match.invert || undefined,
          });
        }
        if (redaction) {
          currentRedactions.push({
            xPath: redaction.xPath ?? '',
            jsonPath: redaction.jsonPath ?? '',
            regex: redaction.regex ?? '',
            hash: redaction.hash || undefined,
          });
        }
        includedCount++;
      } else {
        if (match && !match.isOptional) {
          isValidCombination = false;
          break;
        }
      }
    }

    if (isValidCombination && includedCount > 0) {
      const filteredParams: HashableHttpProviderClaimParams = {
        url: params?.url ?? '',
        // METHOD needs to be explicitly specified and absence or unknown method should cause error, but we're choosing to ignore it in this case
        method: params?.method ?? 'GET',
        body: params?.body ?? '',
        responseMatches: currentMatches,
        responseRedactions: currentRedactions,
      };

      validCanonicalizedStrings.push(canonicalStringify(filteredParams));
    }
  }

  // If there are no rules initially, we still want to stringify the base params
  if (validCanonicalizedStrings.length === 0) {
    const filteredParams: HashableHttpProviderClaimParams = {
      url: params?.url ?? '',
      method: params?.method ?? 'GET',
      body: params?.body ?? '',
      responseMatches: [],
      responseRedactions: [],
    };
    return canonicalStringify(filteredParams);
  }

  return validCanonicalizedStrings.length === 1 ? validCanonicalizedStrings[0] : validCanonicalizedStrings;
}
