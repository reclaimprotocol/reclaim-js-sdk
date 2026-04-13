import { OnError, TrustedData, VerifyProofResultFailure, VerifyProofResultSuccess } from './types'
import { TimeoutError } from './errors'
import loggerModule from './logger'
import { hashObject } from './validationUtils';
import { Proof } from './interfaces';
const logger = loggerModule.logger

/**
 * Escapes special characters in a string for use in a regular expression
 * @param string - The input string to escape
 * @returns The input string with special regex characters escaped
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Replaces all occurrences of a substring in a string
 * @param str - The original string
 * @param find - The substring to find
 * @param replace - The string to replace the found substrings with
 * @returns A new string with all occurrences of 'find' replaced by 'replace'
 */
export function replaceAll(str: string, find: string, replace: string): string {
  if (find === '') return str;
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

/**
 * Schedules a task to end an interval after a specified timeout
 * @param sessionId - The ID of the current session
 * @param intervals - A Map containing the intervals
 * @param onFailureCallback - Callback function to be called on failure
 * @param timeout - Timeout in milliseconds (default: 10 minutes)
 */
export function scheduleIntervalEndingTask(
  sessionId: string,
  intervals: Map<string, NodeJS.Timer>,
  onFailureCallback: OnError,
  timeout: number = 1000 * 60 * 10
): void {
  setTimeout(() => {
    if (intervals.has(sessionId)) {
      const message = 'Interval ended without receiving proofs'
      onFailureCallback(new TimeoutError(message))
      logger.info(message)
      clearInterval(intervals.get(sessionId) as NodeJS.Timeout)
      intervals.delete(sessionId)
    }
  }, timeout)
}

export const createVerifyProofResultSuccess = (proofs: Proof[], isTeeVerified = false): VerifyProofResultSuccess => {
  return {
    isVerified: true,
    isTeeVerified,
    error: undefined,
    data: proofs.map(createTrustedDataFromProofData),
    publicData: getPublicDataFromProofs(proofs),
  }
}


export const createVerifyProofResultFailure = (error: Error, isTeeVerified = false): VerifyProofResultFailure => {
  return {
    isVerified: false,
    isTeeVerified,
    error,
    data: [],
    publicData: [],
  }
}

export function createTrustedDataFromProofData(proof: Proof): TrustedData {
  try {
    const context = JSON.parse(proof.claimData.context)
    const { extractedParameters, ...rest } = context
    return {
      context: rest,
      extractedParameters: extractedParameters ?? {},
    }
  } catch {
    return {
      context: {},
      extractedParameters: {},
    }
  }
}

export function getPublicDataFromProofs(proofs: Proof[]): any[] {
  const data: any[] = [];
  const seenData = new Set<string>();
  for (const proof of proofs) {
    const publicData = proof.publicData;
    if (publicData === null || publicData === undefined) {
      continue;
    }
    try {
      const hash = hashObject(publicData);
      if (seenData.has(hash)) {
        continue;
      }
      seenData.add(hash);
    } catch (_) {
      // if hash fails, we still push the data
    }
    data.push(publicData);
  }
  return data;
}
