import { hashProofClaimParams, getIdentifierFromClaimInfo, getProviderParamsAsCanonicalizedString } from "../../witness";
import { HttpProviderClaimParams, ClaimInfo } from "../types";
import { ethers } from "ethers";
import { canonicalStringify } from "../strings";

describe('Witness', () => {
    describe('hashProofClaimParams', () => {
        /**
         * Test: Base single hash generation.
         * Explanation: When there are no optional rules or missing rules, the function should return 
         * a single string (hash) or an array with a single hash.
         */
        it('should generate a single hash when there are no optional rules', () => {
            const params: HttpProviderClaimParams = {
                url: 'https://example.com',
                method: 'GET',
                body: '',
                responseMatches: [
                    { value: 'name', type: 'contains', invert: false, isOptional: undefined }
                ],
                responseRedactions: [
                    { jsonPath: '$.name', regex: 'name', xPath: '' }
                ]
            };

            const result = hashProofClaimParams(params);
            
            // Expected to be a single string, or an array with 1 string length if we universally return array.
            // But since our refactor, it returns a single string if there's exactly 1 combination.
            expect(typeof result === 'string' || (Array.isArray(result) && result.length === 1)).toBeTruthy();
        });

        /**
         * Test: Optional combinations generation (2^n combinations).
         * Explanation: When we have N optional response matches, the logic should generate
         * 2^N combinations representing every possible subset of rules being present or absent.
         * However, empty sets (0 rules) are excluded by design, so it produces (2^N) - 1 combinations.
         */
        it('should generate (2^n - 1) possible hashes for n fully optional rule pairs', () => {
            const params: HttpProviderClaimParams = {
                url: 'https://example.com',
                method: 'GET',
                body: '',
                // 3 optional rules => 2^3 = 8 combinations. Minus 1 for the empty set = 7 valid combinations.
                responseMatches: [
                    { value: 'name1', type: 'contains', invert: false, isOptional: true },
                    { value: 'name2', type: 'contains', invert: false, isOptional: true },
                    { value: 'name3', type: 'contains', invert: false, isOptional: true }
                ],
                // Corresponding redactions pairs by index
                responseRedactions: [
                    { jsonPath: '$.name1', regex: 'name1', xPath: '' },
                    { jsonPath: '$.name2', regex: 'name2', xPath: '' },
                    { jsonPath: '$.name3', regex: 'name3', xPath: '' }
                ]
            };

            const result = hashProofClaimParams(params);
            
            expect(Array.isArray(result)).toBeTruthy();
            expect(result).toHaveLength(7);
            
            // All generated hashes should be strictly unique 32-byte hex strings.
            const uniqueHashes = new Set(result as string[]);
            expect(uniqueHashes.size).toBe(7);
        });

        /**
         * Test: Mixed required and optional combinations.
         * Explanation: If we have some required rules and some optional rules, 
         * any combination omitting a REQUIRED rule is instantly invalid. 
         * For example, 1 required rule and 2 optional rules will yield exactly 2^2 = 4 combinations.
         */
        it('should generate 2^n hashes for n optional pairs when there are other required rules', () => {
             const params: HttpProviderClaimParams = {
                url: 'https://example.com',
                method: 'GET',
                body: '',
                responseMatches: [
                    { value: 'required1', type: 'contains', invert: false, isOptional: undefined }, // Required
                    { value: 'optional1', type: 'contains', invert: false, isOptional: true }, // Optional
                    { value: 'optional2', type: 'contains', invert: false, isOptional: true }  // Optional
                ],
                responseRedactions: [
                    { jsonPath: '$.req1', regex: 'req1', xPath: '' },
                    { jsonPath: '$.opt1', regex: 'opt1', xPath: '' },
                    { jsonPath: '$.opt2', regex: 'opt2', xPath: '' }
                ]
            };

            const result = hashProofClaimParams(params);
            
            // 2 optional rules = 4 combinations. (The empty set is structurally impossible since required1 is always present).
            expect(Array.isArray(result)).toBeTruthy();
            expect(result).toHaveLength(4);
            
            const uniqueHashes = new Set(result as string[]);
            expect(uniqueHashes.size).toBe(4);
        });
    });

    describe('getIdentifierFromClaimInfo', () => {
        it('should generate correct identifier with empty context', () => {
            const info: ClaimInfo = { provider: 'provider1', parameters: 'param1', context: '' };
            const result = getIdentifierFromClaimInfo(info);
            const expectedStr = 'provider1\nparam1\n';
            expect(result).toBe(ethers.keccak256(new TextEncoder().encode(expectedStr)).toLowerCase());
        });

        it('should re-canonicalize non-empty context', () => {
            const info: ClaimInfo = { provider: 'provider1', parameters: 'param1', context: '{"b": 2, "a": 1}' };
            const result = getIdentifierFromClaimInfo(info);
            const expectedContext = canonicalStringify({ b: 2, a: 1 });
            const expectedStr = `provider1\nparam1\n${expectedContext}`;
            expect(result).toBe(ethers.keccak256(new TextEncoder().encode(expectedStr)).toLowerCase());
        });

        it('should throw error for invalid context JSON', () => {
             const info: ClaimInfo = { provider: 'provider1', parameters: 'param1', context: 'invalid json' };
             expect(() => getIdentifierFromClaimInfo(info)).toThrow('unable to parse non-empty context. Must be JSON');
        });
    });

    describe('getProviderParamsAsCanonicalizedString', () => {
        it('should return a single canonicalized string when no optional rules', () => {
            const params: HttpProviderClaimParams = { 
                url: 'http://a', 
                method: 'GET', 
                body: '', 
                responseMatches: [{type: 'contains', value: 'a', isOptional: false} as any], 
                responseRedactions: [{jsonPath: 'b', regex: 'c', xPath: 'd'} as any] 
            };
            const result = getProviderParamsAsCanonicalizedString(params);
            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('string');
            const expectedParams = { 
                url: 'http://a', 
                method: 'GET', 
                body: '', 
                responseMatches: [{value: 'a', type: 'contains'}], 
                responseRedactions: [{xPath: 'd', jsonPath: 'b', regex: 'c'}] 
            };
            expect(result[0]).toBe(canonicalStringify(expectedParams));
        });

        it('should return multiple strings for optional rules', () => {
            const params: HttpProviderClaimParams = { 
                url: 'http://a', 
                method: 'GET', 
                body: '', 
                responseMatches: [{type: 'contains', value: 'a', isOptional: true} as any, {type: 'regex', value: 'b', isOptional: true} as any], 
                responseRedactions: [{jsonPath: 'b', regex: 'c', xPath: 'd'} as any, {jsonPath: 'e', regex: 'f', xPath: 'g'} as any] 
            };
            const result = getProviderParamsAsCanonicalizedString(params);
            // 2 pairs of optional rules => 2^2 - 1 = 3 combinations.
            expect(result).toHaveLength(3);
        });

        it('should filter out combinations missing required rules', () => {
            const params: HttpProviderClaimParams = { 
                url: 'http://a', 
                method: 'GET', 
                body: '', 
                responseMatches: [{type: 'contains', value: 'a', isOptional: false} as any, {type: 'regex', value: 'b', isOptional: true} as any], 
                responseRedactions: [{jsonPath: 'b', regex: 'c', xPath: 'd'} as any, {jsonPath: 'e', regex: 'f', xPath: 'g'} as any] 
            };
            const result = getProviderParamsAsCanonicalizedString(params);
            // Since rule 1 is required, it must be included. 
            // Rule 2 is optional, so it can be included or not.
            // valid combinations: (1, 2) and (1) -> 2 combinations.
            expect(result).toHaveLength(2); 
        });

        it('should handle undefined rules properly and return base object', () => {
            const params: HttpProviderClaimParams = { url: 'http://a', method: 'GET', body: '' } as any;
            const result = getProviderParamsAsCanonicalizedString(params);
            expect(result).toHaveLength(1);
            const expectedParams = { 
                url: 'http://a', 
                method: 'GET', 
                body: '', 
                responseMatches: [], 
                responseRedactions: [] 
            };
            expect(result[0]).toBe(canonicalStringify(expectedParams));
        });
    });
});
