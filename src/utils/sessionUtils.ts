import {
  InitSessionError,
  UpdateSessionError
} from "./errors";
import { InitSessionResponse, SessionStatus } from "./types";
import { validateFunctionParams } from "./validationUtils";
import { BACKEND_BASE_URL } from './constants';
import loggerModule from './logger';
const logger = loggerModule.logger;

/**
 * Initializes a session with the provided parameters
 * @param providerId - The ID of the provider
 * @param appId - The ID of the application
 * @param timestamp - The timestamp of the request
 * @param signature - The signature for authentication
 * @returns A promise that resolves to an InitSessionResponse
 * @throws InitSessionError if the session initialization fails
 */
export async function initSession(
  providerId: string,
  appId: string,
  timestamp: string,
  signature: string
): Promise<InitSessionResponse> {
  logger.info(`Initializing session for providerId: ${providerId}, appId: ${appId}`);
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/sdk/init-session/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, appId, timestamp, signature })
    });

    const res = await response.json();

    if (!response.ok) {
      logger.info(`Session initialization failed: ${res.message || 'Unknown error'}`);
      throw new InitSessionError(res.message || `Error initializing session with providerId: ${providerId}`);
    }

    return res as InitSessionResponse;
  } catch (err) {
    logger.info({
      message: 'Failed to initialize session',
      providerId,
      appId,
      timestamp,
      error: err
    });
    throw err;
  }
}

/**
 * Updates the status of an existing session
 * @param sessionId - The ID of the session to update
 * @param status - The new status of the session
 * @returns A promise that resolves to the update response
 * @throws UpdateSessionError if the session update fails
 */
export async function updateSession(sessionId: string, status: SessionStatus) {
  logger.info(`Updating session status for sessionId: ${sessionId}, new status: ${status}`);
  validateFunctionParams(
    [{ input: sessionId, paramName: 'sessionId', isString: true }],
    'updateSession'
  );

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/sdk/update/session/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, status })
    });

    const res = await response.json();

    if (!response.ok) {
      const errorMessage = `Error updating session with sessionId: ${sessionId}. Status Code: ${response.status}`;
      logger.info(errorMessage, res);
      throw new UpdateSessionError(errorMessage);
    }

    logger.info(`Session status updated successfully for sessionId: ${sessionId}`);
    return res;
  } catch (err) {
    const errorMessage = `Failed to update session with sessionId: ${sessionId}`;
    logger.info(errorMessage, err);
    throw new UpdateSessionError(`Error updating session with sessionId: ${sessionId}`);
  }
}