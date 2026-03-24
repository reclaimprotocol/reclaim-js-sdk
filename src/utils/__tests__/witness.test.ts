import { hashProofClaimParams } from "../../witness";
import { HttpProviderClaimParams } from "../types";

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
});
