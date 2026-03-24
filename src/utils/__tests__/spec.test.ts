import { InvalidRequestSpecError } from "../errors";
import { generateSpecsFromRequestSpecTemplate, RequestSpec } from "../providerUtils";

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

    it('should generate multiple request specs when template parameters have multiple values', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"name":"{{param1}}"', invert: undefined, isOptional: undefined, type: "contains" },
                { value: '"department":"(?<param2>.*)"', invert: undefined, isOptional: undefined, type: "regex" }
            ],
            responseRedactions: [
                { jsonPath: "$.employees[?(@.name == {{param1}})]", regex: '"name":"(?<param1>.*)"', xPath: "" },
                { jsonPath: "$.employees[?(@.department == {{param2}})]", regex: '"department":"(?<param2>.*)"', xPath: "" },
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

    it('should not mutate the original template spec', () => {
        const specWithMatches: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"name":"{{param1}}"', invert: undefined, isOptional: undefined, type: "contains" }
            ],
            responseRedactions: []
        };

        generateSpecsFromRequestSpecTemplate([specWithMatches], { 'param1': ['alex'], 'param2': ['IT'] });

        // Original spec should remain unchanged
        expect(specWithMatches.responseMatches[0].value).toBe('"name":"{{param1}}"');
    });

    it('should replace all occurrences of a template parameter in response expectations', () => {
        const complexSpec: RequestSpec = {
            ...baseSpec,
            responseMatches: [
                { value: '"name":"{{param1}}", "nickname":"{{param1}}"', invert: undefined, isOptional: undefined, type: "contains" }
            ],
            responseRedactions: [
                { jsonPath: "$.employees[?(@.name == {{param1}} && @.alias == {{param1}})]", regex: '"{{param1}}":"(?<{{param1}}>.*)"', xPath: "//{{param1}}[@id='{{param1}}']" }
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