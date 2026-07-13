import { InvalidRequestSpecError } from "../errors";
import { generateSpecsFromRequestSpecTemplate, RequestSpec, getProviderHashRequirementSpecFromProviderConfig, getProviderHashRequirementsFromSpec, ReclaimProviderConfigWithRequestSpec, ProviderHashRequirementSpec } from "../providerUtils";
import { Proof } from "../interfaces";

describe('generateSpecsFromRequestSpecTemplate', () => {
    const baseSpec: RequestSpec = {
        url: 'https://example.com',
        urlType: "TEMPLATE",
        method: 'GET',
        bodySniff: { enabled: false, template: '' },
        responseMatches: [],
        responseRedactions: [],
        templateParams: ['param1', 'param2'],
    };

    it('should generate request spec when no template parameters are replaced (templateParams defined, but no responseMatches)', () => {
        expect(generateSpecsFromRequestSpecTemplate([baseSpec], { 'param1': ['1'], 'param2': ['2'] })).toEqual([{ ...baseSpec }]);
    });

    it('should throw InvalidRequestSpecError if required template parameters are missing', () => {
        expect(() => generateSpecsFromRequestSpecTemplate([baseSpec], {})).toThrow(InvalidRequestSpecError);
        expect(() => generateSpecsFromRequestSpecTemplate([baseSpec], { 'param1': ['1'] })).toThrow(InvalidRequestSpecError);
    });

    it('should throw InvalidRequestSpecError if template parameters have different lengths', () => {
        expect(() => generateSpecsFromRequestSpecTemplate([baseSpec], { 'param1': ['1', '2'], 'param2': ['1'] })).toThrow(InvalidRequestSpecError);
    });

    it('should silently skip (not throw) an optional template whose params are entirely absent', () => {
        const optionalSpec: RequestSpec = { ...baseSpec, required: false, templateParams: ['optionalParam1', 'optionalParam2'] };
        expect(generateSpecsFromRequestSpecTemplate([optionalSpec], {})).toEqual([]);
        // Only baseSpec's params are present — optionalSpec's are absent and skipped,
        // baseSpec still generates normally.
        expect(generateSpecsFromRequestSpecTemplate([optionalSpec, baseSpec], { 'param1': ['1'], 'param2': ['2'] }))
            .toEqual([{ ...baseSpec }]);
    });

    it('should still throw for an optional template with a partial (inconsistent) param match', () => {
        const optionalSpec: RequestSpec = { ...baseSpec, required: false };
        expect(() => generateSpecsFromRequestSpecTemplate([optionalSpec], { 'param1': ['1'] })).toThrow(InvalidRequestSpecError);
    });

    it('should generate multiple request specs when template parameters have multiple values', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"name":"{{${param1}}}"', invert: undefined, isOptional: undefined, type: "contains" },
                { value: '"department":"(?<${param2}>.*)"', invert: undefined, isOptional: undefined, type: "regex" }
            ],
            responseRedactions: [
                { jsonPath: "$.employees[?(@.name == {{${param1}}})]", regex: '"name":"(?<${param1}>.*)"', xPath: "" },
                { jsonPath: "$.employees[?(@.department == {{${param2}}})]", regex: '"department":"(?<${param2}>.*)"', xPath: "" },
            ]
        };

        const result = generateSpecsFromRequestSpecTemplate([specWithMatches], { 'param1': ['alex', 'bob'], 'param2': ['IT', 'Bio'] });

        expect(result).toHaveLength(2);

        // Check first generated spec
        expect(result[0].responseMatches[0].value).toBe('"name":"{{alex}}"');
        expect(result[0].responseMatches[1].value).toBe('"department":"(?<IT>.*)"');
        expect(result[0].responseRedactions[0].jsonPath).toBe('$.employees[?(@.name == {{alex}})]');
        expect(result[0].responseRedactions[1].regex).toBe('"department":"(?<IT>.*)"');

        // Check second generated spec
        expect(result[1].responseMatches[0].value).toBe('"name":"{{bob}}"');
        expect(result[1].responseMatches[1].value).toBe('"department":"(?<Bio>.*)"');
        expect(result[1].responseRedactions[0].jsonPath).toBe('$.employees[?(@.name == {{bob}})]');
        expect(result[1].responseRedactions[1].regex).toBe('"department":"(?<Bio>.*)"');
    });

    it('should not throw when a redaction has empty, null, or undefined jsonPath/xPath/regex', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            templateParams: ['param1'],
            responseRedactions: [
                // Provider configs from the wire may omit or null these fields
                // despite the type declaring them as required strings.
                { jsonPath: '$.name["${param1}"]', regex: '', xPath: undefined as unknown as string },
                { jsonPath: null as unknown as string, regex: '"name":"(?<${param1}>.*)"', xPath: '' },
            ]
        };

        const result = generateSpecsFromRequestSpecTemplate([specWithMatches], { 'param1': ['alex'] });

        expect(result).toHaveLength(1);
        expect(result[0].responseRedactions[0].jsonPath).toBe('$.name["alex"]');
        expect(result[0].responseRedactions[0].regex).toBe('');
        expect(result[0].responseRedactions[0].xPath).toBeUndefined();
        expect(result[0].responseRedactions[1].jsonPath).toBeNull();
        expect(result[0].responseRedactions[1].regex).toBe('"name":"(?<alex>.*)"');
    });

    // Bundled claims (e.g. one Spotify libraryV3 claim proving 30+ playlist
    // names at once) need N values folded into ONE spec, not N separate specs
    // (see the 'separate' test above, which is the default and remains
    // unchanged). Opt in via `templateParamsMode: 'merge'`.
    it('with templateParamsMode "merge" should fold multiple template values into ONE spec with one match/redaction entry per value', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"id":${idx}', invert: undefined, isOptional: undefined, type: "contains" }
            ],
            responseRedactions: [
                { jsonPath: "$.items[${idx}].id", regex: '', xPath: '' }
            ],
            templateParams: ['idx'],
            templateParamsMode: 'merge',
        };

        const result = generateSpecsFromRequestSpecTemplate([specWithMatches], { idx: ['1', '2', '3'] });

        // One spec, with one match/redaction per value baked in.
        expect(result).toHaveLength(1);
        expect(result[0].responseMatches).toHaveLength(3);
        expect(result[0].responseMatches[0].value).toBe('"id":1');
        expect(result[0].responseMatches[1].value).toBe('"id":2');
        expect(result[0].responseMatches[2].value).toBe('"id":3');
        expect(result[0].responseRedactions[0].jsonPath).toBe('$.items[1].id');
        expect(result[0].responseRedactions[1].jsonPath).toBe('$.items[2].id');
        expect(result[0].responseRedactions[2].jsonPath).toBe('$.items[3].id');
    });

    it('templateParamsMode "merge" with a single value behaves the same as "separate" for N=1', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"id":${idx}', invert: undefined, isOptional: undefined, type: "contains" }
            ],
            responseRedactions: [
                { jsonPath: "$.items[${idx}].id", regex: '', xPath: '' }
            ],
            templateParams: ['idx'],
            templateParamsMode: 'merge',
        };

        const result = generateSpecsFromRequestSpecTemplate([specWithMatches], { idx: ['1'] });

        expect(result).toHaveLength(1);
        expect(result[0].responseMatches).toHaveLength(1);
        expect(result[0].responseMatches[0].value).toBe('"id":1');
    });

    it('should not mutate the original template spec', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"name":"{{${param1}}}"', invert: undefined, isOptional: undefined, type: "contains" }
            ],
            responseRedactions: []
        };

        generateSpecsFromRequestSpecTemplate([specWithMatches], { 'param1': ['alex'], 'param2': ['IT'] });

        // Original spec should remain unchanged
        expect(specWithMatches.responseMatches[0].value).toBe('"name":"{{${param1}}}"');
    });

    it('should replace all occurrences of a template parameter in response expectations', () => {
        const complexSpec: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"name":"{{${param1}}}", "nickname":"{{${param1}}}"', invert: undefined, isOptional: undefined, type: "contains" }
            ],
            responseRedactions: [
                { jsonPath: "$.employees[?(@.name == {{${param1}}} && @.alias == {{${param1}}})]", regex: '"{{${param1}}}":"(?<{{${param1}}}>.*)"', xPath: "//{{${param1}}}[@id='{{${param1}}}']" }
            ],
            templateParams: ['param1']
        };

        const result = generateSpecsFromRequestSpecTemplate([complexSpec], { 'param1': ['alex'] });

        expect(result).toHaveLength(1);

        // Value occurrences are all replaced
        expect(result[0].responseMatches[0].value).toBe('"name":"{{alex}}", "nickname":"{{alex}}"');

        // Redaction occurrences are all replaced
        expect(result[0].responseRedactions[0].jsonPath).toBe("$.employees[?(@.name == {{alex}} && @.alias == {{alex}})]");
        expect(result[0].responseRedactions[0].regex).toBe('"{{alex}}":"(?<{{alex}}>.*)"');
        expect(result[0].responseRedactions[0].xPath).toBe("//{{alex}}[@id='{{alex}}']");
    });
});

describe('getProviderHashRequirementSpecFromProviderConfig', () => {
    it('should return request specs combining requestData and allowedInjectedRequestData without proofs', () => {
        const providerConfig: ReclaimProviderConfigWithRequestSpec = {
            requestData: [{ url: 'http://a', method: 'GET', urlType: 'API', bodySniff: {enabled: false, template: ''}, responseMatches: [], responseRedactions: [] }],
            allowedInjectedRequestData: [{ url: 'http://b', method: 'GET', urlType: 'API', bodySniff: {enabled: false, template: ''}, responseMatches: [], responseRedactions: [] }]
        };
        const result = getProviderHashRequirementSpecFromProviderConfig(providerConfig);
        expect(result.requests).toHaveLength(2);
        expect(result.requests?.[0].url).toBe('http://a');
        expect(result.requests?.[1].url).toBe('http://b');
    });

    it('should construct dynamic specs using proofs', () => {
        const providerConfig: ReclaimProviderConfigWithRequestSpec = {
            requestData: [],
            allowedInjectedRequestData: [{ url: 'http://b', method: 'GET', urlType: 'API', bodySniff: {enabled: false, template: ''}, responseMatches: [{type: 'contains', value: '{{${param1}}}'} as any], responseRedactions: [], templateParams: ['param1'] }]
        };
        const mockProof: any = { claimData: { context: JSON.stringify({extractedParameters: {param1: ['testVal']}}) } };
        const result = getProviderHashRequirementSpecFromProviderConfig(providerConfig, [mockProof as Proof]);
        expect(result.requests).toHaveLength(1);
        expect(result.requests?.[0].responseMatches[0].value).toBe('{{testVal}}');
    });

    it('should handle missing requestData and allowedInjectedRequestData', () => {
        const result = getProviderHashRequirementSpecFromProviderConfig({} as any);
        expect(result.requests).toHaveLength(0);
    });
});

describe('getProviderHashRequirementsFromSpec', () => {
    it('should compute hash requirements for a given spec', () => {
        const spec: ProviderHashRequirementSpec = {
            requests: [
                { url: 'http://a', method: 'GET', urlType: 'API', bodySniff: {enabled: false, template: ''}, responseMatches: [], responseRedactions: [], required: true, multiple: false }
            ]
        };
        const result = getProviderHashRequirementsFromSpec(spec);
        expect(result.hashes).toHaveLength(1);
        expect(result.hashes[0]).toHaveProperty('value');
        expect(result.hashes[0].required).toBe(true);
        expect(result.hashes[0].multiple).toBe(false);
    });

    it('should return empty array if requests is undefined', () => {
        const spec: ProviderHashRequirementSpec = { requests: undefined };
        const result = getProviderHashRequirementsFromSpec(spec);
        expect(result.hashes).toHaveLength(0);
    });
});