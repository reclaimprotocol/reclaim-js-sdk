import {
  InitSessionError,
  UpdateSessionError,
  StatusUrlError,
  ProviderConfigFetchError
} from "./errors";
import { InitSessionResponse, ProviderConfigResponse, ProviderHashRequirementsResponse, SessionStatus, StatusUrlResponse } from "./types";
import { validateFunctionParams } from "./validationUtils";
import { BACKEND_BASE_URL, constants } from './constants';
import { http } from "./fetch";
import loggerModule from './logger';
import { getProviderHashRequirementsFromSpec, ProviderHashRequirementsConfig } from "./providerUtils";

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
  signature: string,
  versionNumber?: string
): Promise<InitSessionResponse> {
  logger.info(`Initializing session for providerId: ${providerId}, appId: ${appId}`);
  try {
    const response = await http.client(`${BACKEND_BASE_URL}/api/sdk/init/session/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, appId, timestamp, signature, versionNumber })
    });

    const res = await response.json();

    if (!response.ok) {
      logger.info(`Session initialization failed: ${res.message || 'Unknown error'}`);
      throw new InitSessionError(res.message || `Error initializing session with providerId: ${providerId}`);
    }

    return res as InitSessionResponse;
  } catch (err) {
    logger.info(`Failed to initialize session for providerId: ${providerId}, appId: ${appId}`, err);
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
    const response = await http.client(`${BACKEND_BASE_URL}/api/sdk/update/session/`, {
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

/**
 * Fetches the status URL for a given session ID
 * @param sessionId - The ID of the session to fetch the status URL for
 * @returns A promise that resolves to a StatusUrlResponse
 * @throws StatusUrlError if the status URL fetch fails
 */
export async function fetchStatusUrl(sessionId: string): Promise<StatusUrlResponse> {
  validateFunctionParams(
    [{ input: sessionId, paramName: 'sessionId', isString: true }],
    'fetchStatusUrl'
  );

  try {
    const response = await http.client(`${constants.DEFAULT_RECLAIM_STATUS_URL}${sessionId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const res = await response.json();

    if (!response.ok) {
      const errorMessage = `Error fetching status URL for sessionId: ${sessionId}. Status Code: ${response.status}`;
      logger.info(errorMessage, res);
      throw new StatusUrlError(errorMessage);
    }

    return res as StatusUrlResponse;
  } catch (err) {
    const errorMessage = `Failed to fetch status URL for sessionId: ${sessionId}`;
    logger.info(errorMessage, err);
    throw new StatusUrlError(`Error fetching status URL for sessionId: ${sessionId}`);
  }
}

export async function fetchProviderConfig(providerId: string, exactProviderVersionString: string): Promise<ProviderConfigResponse> {
  validateFunctionParams(
    [
      { input: providerId, paramName: 'providerId', isString: true },
      { input: exactProviderVersionString, paramName: 'exactProviderVersionString', isString: true }
    ],
    'fetchProviderConfig'
  );

  try {
    const response = await http.client(constants.DEFAULT_PROVIDER_URL(providerId, exactProviderVersionString), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const res = await response.json();

    if (!response.ok) {
      const errorMessage = `Error fetching provider config for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}. Status Code: ${response.status}`;
      logger.info(errorMessage, res);
      throw new ProviderConfigFetchError(errorMessage);
    }

    return res as ProviderConfigResponse;
  } catch (err) {
    const errorMessage = `Failed to fetch provider config for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`;
    logger.info(errorMessage, err);
    throw new ProviderConfigFetchError(`Error fetching provider config for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`);
  }
}

/**
 * Fetches the provider configuration by the providerId and its version; and constructs the robust hash requirements needed for proof validation.
 * It resolves both explicitly required HTTP requests and allowed injected requests based on the provider version.
 * 
 * See also:
 * 
 * * `ReclaimProofRequest.getProviderHashRequirements()` - An alternative of this function to get the expected hashes for a proof request. The result can be provided in verifyProof function's `config` parameter for proof validation.
 * * `getProviderHashRequirementsFromSpec()` - An alternative of this function to get the expected hashes from a provider spec. The result can be provided in verifyProof function's `config` parameter for proof validation.
 * 
 * @param providerId - The unique identifier of the selected provider.
 * @param exactProviderVersionString - The specific version string of the provider configuration to ensure deterministic validation.
 * @returns A promise that resolves to `ProviderHashRequirementsConfig` representing the expected hashes for proof validation.
 */
export async function fetchProviderHashRequirementsBy(providerId: string, exactProviderVersionString: string): Promise<ProviderHashRequirementsConfig> {
  validateFunctionParams(
    [
      { input: providerId, paramName: 'providerId', isString: true },
      { input: exactProviderVersionString, paramName: 'exactProviderVersionString', isString: true }
    ],
    'fetchProviderConfig'
  );

  try {
    const response = await http.client(constants.DEFAULT_PROVIDER_HASH_REQUIREMENTS_URL(providerId, exactProviderVersionString), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'reclaim-client-api': '1' }
    });

    const res = await response.json();

    if (!response.ok) {
      const errorMessage = `Error fetching provider config for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}. Status Code: ${response.status}`;
      logger.info(errorMessage, res);
      throw new ProviderConfigFetchError(errorMessage);
    }

    const typedResponse = res as ProviderHashRequirementsResponse;
    const hashRequirements = typedResponse.hashRequirements;
    if (!hashRequirements) {
      throw new ProviderConfigFetchError(`Error fetching provider hash requirements for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}. Received the following response from remote: ${JSON.stringify(res)}`);
    }
    return hashRequirements;
  } catch (err) {
    const errorMessage = `Failed to fetch provider hash requirements for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`;
    logger.info(errorMessage, err);
    throw new ProviderConfigFetchError(`Error fetching provider hash requirements for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`);
  }
}