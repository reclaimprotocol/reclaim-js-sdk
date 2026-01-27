import { ethers } from "ethers";
import { InavlidParametersError, InvalidParamError, InvalidSignatureError } from "./errors";
import canonicalize from 'canonicalize'
import { Context } from "./interfaces";
import loggerModule from './logger';
import { ProofRequestOptions, ModalOptions } from "./types";
const logger = loggerModule.logger;

/**
 * Validates function parameters based on specified criteria
 * @param params - An array of objects containing input, paramName, and optional isString flag
 * @param functionName - The name of the function being validated
 * @throws InvalidParamError if any parameter fails validation
 */
export function validateFunctionParams(params: { input: any, paramName: string, isString?: boolean }[], functionName: string): void {
  params.forEach(({ input, paramName, isString }) => {
    if (input == null) {
      logger.info(`Validation failed: ${paramName} in ${functionName} is null or undefined`);
      throw new InvalidParamError(`${paramName} passed to ${functionName} must not be null or undefined.`);
    }
    if (isString && typeof input !== 'string') {
      logger.info(`Validation failed: ${paramName} in ${functionName} is not a string`);
      throw new InvalidParamError(`${paramName} passed to ${functionName} must be a string.`);
    }
    if (isString && input.trim() === '') {
      logger.info(`Validation failed: ${paramName} in ${functionName} is an empty string`);
      throw new InvalidParamError(`${paramName} passed to ${functionName} must not be an empty string.`);
    }
  });
}

export function validateFunctionParamsWithFn(param: { input: any, paramName: string, isValid: () => boolean }, functionName: string): void {
  if (!param.isValid()) {
    logger.info(`Validation failed: ${param.paramName} in ${functionName} is not valid`);
    throw new InvalidParamError(`${param.paramName} passed to ${functionName} must be valid.`);
  }
}


// validate the parameters
/** 
 * Validates the parameters object
 * @param parameters - The parameters object to validate
 * @throws InavlidParametersError if the parameters object is not valid
 */
export function validateParameters(parameters: { [key: string]: string }): void {
  try {
    // check if the parameters is an object of key value pairs of string and string
    if (typeof parameters !== 'object' || parameters === null) {
      logger.info(`Parameters validation failed: Provided parameters is not an object`);
      throw new InavlidParametersError(`The provided parameters is not an object`);
    }
    // check each key and value in the parameters object
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        logger.info(`Parameters validation failed: Provided parameters is not an object of key value pairs of string and string`);
        throw new InavlidParametersError(`The provided parameters is not an object of key value pairs of string and string`);
      }
    }
  } catch (e) {
    logger.info(`Parameters validation failed: ${(e as Error).message}`);
    throw new InavlidParametersError(`Invalid parameters passed to validateParameters.`, e as Error);
  }
}


/**
* Validates a URL string
* @param url - The URL to validate
* @param functionName - The name of the function calling this validation
* @throws InvalidParamError if the URL is invalid or empty
*/
export function validateURL(url: string, functionName: string): void {
  try {
    new URL(url);
  } catch (e) {
    logger.info(`URL validation failed for ${url} in ${functionName}: ${(e as Error).message}`);
    throw new InvalidParamError(`Invalid URL format ${url} passed to ${functionName}.`, e as Error);
  }
}

/**
* Validates a signature against the provided application ID
* @param providerId - The ID of the provider
* @param signature - The signature to validate
* @param applicationId - The expected application ID
* @param timestamp - The timestamp of the signature
* @throws InvalidSignatureError if the signature is invalid or doesn't match the application ID
*/
export function validateSignature(providerId: string, signature: string, applicationId: string, timestamp: string): void {
  try {
    logger.info(`Starting signature validation for providerId: ${providerId}, applicationId: ${applicationId}, timestamp: ${timestamp}`);

    const message = canonicalize({ providerId, timestamp });
    if (!message) {
      logger.info('Failed to canonicalize message for signature validation');
      throw new Error('Failed to canonicalize message');
    }
    const messageHash = ethers.keccak256(new TextEncoder().encode(message));
    let appId = ethers.verifyMessage(
      ethers.getBytes(messageHash),
      ethers.hexlify(signature)
    ).toLowerCase();

    if (ethers.getAddress(appId) !== ethers.getAddress(applicationId)) {
      logger.info(`Signature validation failed: Mismatch between derived appId (${appId}) and provided applicationId (${applicationId})`);
      throw new InvalidSignatureError(`Signature does not match the application id: ${appId}`);
    }

    logger.info(`Signature validated successfully for applicationId: ${applicationId}`);
  } catch (err) {
    logger.info(`Signature validation failed: ${(err as Error).message}`);
    if (err instanceof InvalidSignatureError) {
      throw err;
    }
    throw new InvalidSignatureError(`Failed to validate signature: ${(err as Error).message}`);
  }
}


/**
 * Validates the context object
 * @param context - The context object to validate
 * @throws InvalidParamError if the context object is not valid
 */
export function validateContext(context: Context): void {
  if (!context.contextAddress) {
    logger.info(`Context validation failed: Provided context address in context is not valid`);
    throw new InvalidParamError(`The provided context address in context is not valid`);
  }

  if (!context.contextMessage) {
    logger.info(`Context validation failed: Provided context message in context is not valid`);
    throw new InvalidParamError(`The provided context message in context is not valid`);
  }

  validateFunctionParams([
    { input: context.contextAddress, paramName: 'contextAddress', isString: true },
    { input: context.contextMessage, paramName: 'contextMessage', isString: true }
  ], 'validateContext');
}

/**
 * Validates the options object
 * @param options - The options object to validate
 * @throws InvalidParamError if the options object is not valid
 */
export function validateOptions(options: ProofRequestOptions): void {
  if (options.acceptAiProviders && typeof options.acceptAiProviders !== 'boolean') {
    logger.info(`Options validation failed: Provided acceptAiProviders in options is not valid`);
    throw new InvalidParamError(`The provided acceptAiProviders in options is not valid`);
  }

  if (options.log && typeof options.log !== 'boolean') {
    logger.info(`Options validation failed: Provided log in options is not valid`);
    throw new InvalidParamError(`The provided log in options is not valid`);
  }

  if (options.providerVersion && typeof options.providerVersion !== 'string') {
    logger.info(`Options validation failed: Provided providerVersion in options is not valid`);
    throw new InvalidParamError(`The provided providerVersion in options is not valid`);
  }
}

/**
 * Validates the modalOptions object
 * @param modalOptions - The modalOptions object to validate
 * @param functionName - The name of the function calling this validation
 * @param paramPrefix - Optional prefix for parameter names (e.g., 'modalOptions.')
 * @throws InvalidParamError if the modalOptions object is not valid
 */
export function validateModalOptions(modalOptions: ModalOptions, functionName: string, paramPrefix: string = ''): void {
  if (modalOptions.title !== undefined) {
    validateFunctionParams([
      { input: modalOptions.title, paramName: `${paramPrefix}title`, isString: true }
    ], functionName);
  }

  if (modalOptions.description !== undefined) {
    validateFunctionParams([
      { input: modalOptions.description, paramName: `${paramPrefix}description`, isString: true }
    ], functionName);
  }

  if (modalOptions.extensionUrl !== undefined) {
    validateURL(modalOptions.extensionUrl, functionName);
    validateFunctionParams([
      { input: modalOptions.extensionUrl, paramName: `${paramPrefix}extensionUrl`, isString: true }
    ], functionName);
  }

  if (modalOptions.darkTheme !== undefined) {
    if (typeof modalOptions.darkTheme !== 'boolean') {
      throw new InvalidParamError(`${paramPrefix}darkTheme prop must be a boolean`);
    }
    validateFunctionParams([
      { input: modalOptions.darkTheme, paramName: `${paramPrefix}darkTheme` }
    ], functionName);
  }

  if (modalOptions.modalPopupTimer !== undefined) {
    if (typeof modalOptions.modalPopupTimer !== 'number' || modalOptions.modalPopupTimer <= 0 || !Number.isInteger(modalOptions.modalPopupTimer)) {
      throw new InvalidParamError(`${paramPrefix}modalPopupTimer prop must be a valid time in minutes`);
    }
    validateFunctionParams([
      { input: modalOptions.modalPopupTimer, paramName: `${paramPrefix}modalPopupTimer` }
    ], functionName);
  }

  if (modalOptions.showExtensionInstallButton !== undefined) {
    if (typeof modalOptions.showExtensionInstallButton !== 'boolean') {
      throw new InvalidParamError(`${paramPrefix}showExtensionInstallButton prop must be a boolean`);
    }
    validateFunctionParams([
      { input: modalOptions.showExtensionInstallButton, paramName: `${paramPrefix}showExtensionInstallButton` }
    ], functionName);
  }
}



