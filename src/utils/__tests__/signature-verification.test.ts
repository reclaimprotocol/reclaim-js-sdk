import { ethers } from 'ethers';
import { verifyProof } from '../../Reclaim';
import { assertVerifiedProof } from '../proofUtils';
import { createSignDataForClaim } from '../../witness';
import { Proof } from '../interfaces';
import { mockFetchBy } from './mock-fetch';
import { ProofNotVerifiedError } from '../errors';

describe('Signature Verification', () => {
    let attestorWallet: any;
    let validClaim: Proof['claimData'];

    beforeEach(() => {
        // Generate a new key pair for each test simulating an attestor identity
        attestorWallet = ethers.Wallet.createRandom();

        // Setup a mock fetch globally to intercept the /api/attestors endpoint call 
        // to return the generated wallet's public address
        globalThis.fetch = mockFetchBy((url) => {
            if (url.includes('attestors')) {
                return {
                    "data": [
                        { "address": attestorWallet.address.toLowerCase() }
                    ]
                };
            }

            // We mock the provider config api for the verifyProof test. 
            // It expects hash requirements to match the claim.
            if (url.includes('providers/config')) {
                return {
                    message: "Provider config fetched successfully",
                    providers: {
                        requestData: [{
                            url: "https://example.com",
                            method: "GET",
                            responseMatches: [{ value: "example", type: "contains" }],
                            responseRedactions: []
                        }]
                    },
                    isSuccess: true
                };
            }

            return {
                "message": "Hash requirements fetched successfully",
                "hashRequirements": {
                    "hashes": [
                        { "value": "0xExpectedHashHere" } // We will pass specific config manually in tests to bypass this
                    ]
                },
                "providerId": "dontcare",
                "providerVersionString": "1.0.0"
            };
        });

        // Initialize a structurally sound claim to be signed
        validClaim = {
            provider: 'http',
            parameters: JSON.stringify({
                url: 'https://example.com',
                method: 'GET',
                responseMatches: [{ type: 'contains', value: 'example' }],
                responseRedactions: [],
                body: ''
            }),
            owner: '0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e',
            timestampS: Math.floor(Date.now() / 1000),
            context: '{"contextAddress":"0x0","contextMessage":"sample context"}',
            identifier: '0x0000000000000000000000000000000000000000000000000000000000000000',
            epoch: 1
        };
    });

    /**
     * Test: assertVerifiedProof with valid signature by recognized attestor.
     * Explanation: `assertVerifiedProof` determines if the cryptographic signatures
     * provided on the proof successfully resolve to public addresses present in the active 
     * Witness registry (`attestors`). It derives the digest from the ClaimData using 
     * `createSignDataForClaim` and validates using secp256k1 recovery (via ethers.verifyMessage).
     */
    it('should successfully verify a signature signed by a recognized attestor using internal function', async () => {
        // Create canonical string representation of the claim identical to the protocol spec
        const signData = createSignDataForClaim(validClaim);

        // Attestor signs the keccak256 digest
        const signature = await attestorWallet.signMessage(signData);

        const proof: Proof = {
            identifier: validClaim.identifier,
            claimData: validClaim,
            witnesses: [{ id: attestorWallet.address, url: '' }],
            signatures: [signature],
            extractedParameterValues: {}
        };

        // Assert that the explicit internal verification function completes without throwing
        await expect(assertVerifiedProof(proof, [{ id: attestorWallet.address, url: '' }])).resolves.toBeUndefined();
    });

    /**
     * Test: End-to-end `verifyProof` execution.
     * Explanation: `verifyProof` handles both the extraction of the real attestors registry over HTTP,
     * the cryptographic signature validation, AND the validation of the configuration match via hash structures.
     */
    it('should resolve full verifyProof execution successfully via generic interface', async () => {
        const signData = createSignDataForClaim(validClaim);
        const signature = await attestorWallet.signMessage(signData);

        const proof: Proof = {
            identifier: validClaim.identifier,
            claimData: validClaim,
            witnesses: [{ id: attestorWallet.address, url: '' }],
            signatures: [signature],
            extractedParameterValues: {}
        };

        const { hashProofClaimParams } = require('../../witness');
        const computedHash = hashProofClaimParams(JSON.parse(validClaim.parameters));
        
        // Pass the dynamically generated hash as the expected validation config hash
        const validationConfig = {
            hashes: [
                { value: Array.isArray(computedHash) ? computedHash[0] : computedHash }
            ]
        };

        const result = await verifyProof(proof, validationConfig);
        expect(result.isVerified).toBe(true);
    });

    /**
     * Test: Forgery failure (Unauthorized signer).
     * Explanation: If a malicious actor generates a grammatically perfect proof
     * but signs it using a generic wallet key (which isn't recorded as an active attestor
     * by the Reclaim registry), the signature recovery will successfully identify *who* signed it,
     * but will fail the inclusion-check against the active registry array.
     */
    it('should throw ProofNotVerifiedError if signed by an unauthorized key pair', async () => {
        const maliciousWallet = ethers.Wallet.createRandom();
        
        const signData = createSignDataForClaim(validClaim);
        // Signed by someone else, not the recognized attestor wallet
        const maliciousSignature = await maliciousWallet.signMessage(signData);

        const proof: Proof = {
            identifier: validClaim.identifier,
            claimData: validClaim,
            witnesses: [{ id: maliciousWallet.address, url: '' }],
            signatures: [maliciousSignature],
            extractedParameterValues: {}
        };

        // Since mockFetchBy returns `attestorWallet.address`, verification of `maliciousSignature` should throw
        await expect(assertVerifiedProof(proof, [{ id: attestorWallet.address, url: '' }])).rejects.toThrow(ProofNotVerifiedError);
        
        // Also verify the high-level API suppresses the throw and cleanly returns false
        const { hashProofClaimParams } = require('../../witness');
        const computedHash = hashProofClaimParams(JSON.parse(validClaim.parameters));
        const validationConfig = {
            hashes: [{ value: Array.isArray(computedHash) ? computedHash[0] : computedHash }]
        };
        const result = await verifyProof(proof, validationConfig);
        expect(result.isVerified).toBe(false);
    });

    /**
     * Test: Tampered Data failure.
     * Explanation: Any alteration to the original `claimData` subsequent to its signature
     * will completely change the recovered public key derived from secp256k1 recovery process, 
     * implicitly yielding a registry mismatch error, structurally guaranteeing the integrity of 
     * the underlying authenticated data payload.
     */
    it('should throw ProofNotVerifiedError if claim payload data changes after signing', async () => {
        const signData = createSignDataForClaim(validClaim);
        const signature = await attestorWallet.signMessage(signData);

        // Simulate a "man-in-the-middle" that modifies parameters after payload has been attested
        const tamperedClaim = { 
            ...validClaim, 
            parameters: JSON.stringify({ ...JSON.parse(validClaim.parameters), url: "https://hacked.com" }) 
        };

        const proof: Proof = {
            identifier: tamperedClaim.identifier,
            claimData: tamperedClaim,
            witnesses: [{ id: attestorWallet.address, url: '' }],
            signatures: [signature],
            extractedParameterValues: {}
        };

        await expect(assertVerifiedProof(proof, [{ id: attestorWallet.address, url: '' }])).rejects.toThrow(ProofNotVerifiedError);
    });
});
