import { ethers } from "ethers";
import { SignedClaim, TemplateData } from "./types";
import { createSignDataForClaim } from "../witness";
import { BACKEND_BASE_URL, constants } from "./constants";
import { replaceAll } from "./helper";
import { validateURL } from "./validationUtils";
import { BackendServerError, ProofNotVerifiedError } from "./errors";
import loggerModule from './logger';
import { WitnessData } from "./interfaces";
const logger = loggerModule.logger;


/**
 * Retrieves a shortened URL for the given URL
 * @param url - The URL to be shortened
 * @returns A promise that resolves to the shortened URL, or the original URL if shortening fails
 */
export async function getShortenedUrl(url: string): Promise<string> {
  logger.info(`Attempting to shorten URL: ${url}`);
  try {
    validateURL(url, 'getShortenedUrl')
    const response = await fetch(`${BACKEND_BASE_URL}/api/sdk/shortener`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullUrl: url })
    })
    const res = await response.json()
    if (!response.ok) {
      logger.info(`Failed to shorten URL: ${url}, Response: ${JSON.stringify(res)}`);
      return url;
    }
    const shortenedVerificationUrl = res.result.shortUrl
    return shortenedVerificationUrl
  } catch (err) {
    logger.info(`Error shortening URL: ${url}, Error: ${err}`);
    return url
  }
}

/**
 * Creates a link with embedded template data
 * @param templateData - The data to be embedded in the link
 * @param sharePagePath - The path to the share page (optional)
 * @returns A promise that resolves to the created link (shortened if possible)
 */
export async function createLinkWithTemplateData(templateData: TemplateData, sharePagePath?: string): Promise<string> {
  let template = encodeURIComponent(JSON.stringify(templateData))
  template = replaceAll(template, '(', '%28')
  template = replaceAll(template, ')', '%29')
  const fullLink = sharePagePath ? `${sharePagePath}/?template=${template}` : `${constants.RECLAIM_SHARE_URL}${template}`
  try {
    const shortenedLink = await getShortenedUrl(fullLink)
    return shortenedLink;
  } catch (err) {
    logger.info(`Error creating link for sessionId: ${templateData.sessionId}, Error: ${err}`);
    return fullLink;
  }
}

/**
 * Retrieves the list of witnesses for a given claim
 */
export async function getAttestors(): Promise<WitnessData[]> {
	const response = await fetch(constants.DEFAULT_ATTESTORS_URL)
	if (!response.ok) {
		response.body?.cancel()
		throw new BackendServerError(
			`Failed to fetch witness addresses: ${response.status}`
		)
	}

	const { data } = await response.json() as {
		data: {
			address: string
		}[]
	}
	return data.map(wt => ({ id: wt.address, url: '' }))
}

/**
 * Recovers the signers' addresses from a signed claim
 * @param claim - The signed claim object
 * @param signatures - The signatures associated with the claim
 * @returns An array of recovered signer addresses
 */
export function recoverSignersOfSignedClaim({
  claim,
  signatures
}: SignedClaim): string[] {
  const dataStr = createSignDataForClaim({ ...claim })
  const signers = signatures.map(signature =>
    ethers.verifyMessage(dataStr, ethers.hexlify(signature)).toLowerCase()
  )
  return signers;
}
