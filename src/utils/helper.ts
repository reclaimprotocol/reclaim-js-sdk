import { OnError } from './types'
import { TimeoutError } from './errors'
import loggerModule from './logger'
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
