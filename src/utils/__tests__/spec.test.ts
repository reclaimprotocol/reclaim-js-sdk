import { ReclaimProofRequest } from "../../Reclaim";
import { InvalidRequestSpecError } from "../errors";
import { generateSpecsFromRequestSpecTemplate, RequestSpec } from "../providerUtils";
import { ClaimCreationType } from "../types";
import { validateSignature } from "../validationUtils";
import { mockFetch } from "./mock-fetch";

describe('RequestSpec', () => {
    it('should generate request spec from template', () => {
        expect(generateSpecsFromRequestSpecTemplate([{
            url: 'https://example.com',
            urlType: "TEMPLATE",
            method: 'GET',
            bodySniff: {
                enabled: false,
                template: ''
            },
            responseMatches: [],
            responseRedactions: [],
            templateParams: ['param1', 'param2'],
        }], { 'param1': ['1'], 'param2': ['2'] })).toEqual([
            {
                url: 'https://example.com',
                urlType: "TEMPLATE",
                method: 'GET',
                bodySniff: {
                    enabled: false,
                    template: ''
                },
                responseMatches: [],
                responseRedactions: [],
                templateParams: ['param1', 'param2'],
            }
        ]);

        expect(() => generateSpecsFromRequestSpecTemplate([{
            url: 'https://example.com',
            urlType: "TEMPLATE",
            method: 'GET',
            bodySniff: {
                enabled: false,
                template: ''
            },
            responseMatches: [],
            responseRedactions: [],
            templateParams: ['param1', 'param2'],
        }], {})).toThrow(InvalidRequestSpecError);

        expect(generateSpecsFromRequestSpecTemplate([{
            url: 'https://example.com',
            urlType: "TEMPLATE",
            method: 'GET',
            bodySniff: {
                enabled: false,
                template: ''
            },
            responseMatches: [
                {
                    value: '"name":"{{param1}}"',
                    invert: undefined,
                    isOptional: undefined,
                    type: "contains"
                },
                {
                    value: '"department":"(?<param2>.*)"',
                    invert: undefined,
                    isOptional: undefined,
                    type: "regex"
                }
            ],
            responseRedactions: [
                {
                    jsonPath: "$.employees[?(@.name == {{param1}})]",
                    regex: '"name":"(?<param1>.*)"',
                    xPath: ""
                },
                {
                    jsonPath: "$.employees[?(@.department == {{param2}})]",
                    regex: '"department":"(?<param2>.*)"',
                    xPath: ""
                },
            ],
            templateParams: ['param1', 'param2'],
        }], { 'param1': ['alex', 'bob'], 'param2': ['IT', 'Bio'] })).toEqual([
            {
                url: 'https://example.com',
                urlType: "TEMPLATE",
                method: 'GET',
                bodySniff: {
                    enabled: false,
                    template: ''
                },
                responseMatches: [
                    {
                        value: '"name":"{{alex}}"',
                        invert: undefined,
                        isOptional: undefined,
                        type: "contains"
                    },
                    {
                        value: '"department":"(?<IT>.*)"',
                        invert: undefined,
                        isOptional: undefined,
                        type: "regex"
                    }
                ],
                responseRedactions: [
                    {
                        jsonPath: "$.employees[?(@.name == {{alex}})]",
                        regex: '"name":"(?<alex>.*)"',
                        xPath: ""
                    },
                    {
                        jsonPath: "$.employees[?(@.department == {{IT}})]",
                        regex: '"department":"(?<IT>.*)"',
                        xPath: ""
                    },
                ],
                templateParams: ['param1', 'param2'],
            },
            {
                url: 'https://example.com',
                urlType: "TEMPLATE",
                method: 'GET',
                bodySniff: {
                    enabled: false,
                    template: ''
                },
                responseMatches: [
                    {
                        value: '"name":"{{bob}}"',
                        invert: undefined,
                        isOptional: undefined,
                        type: "contains"
                    },
                    {
                        value: '"department":"(?<bio>.*)"',
                        invert: undefined,
                        isOptional: undefined,
                        type: "regex"
                    }
                ],
                responseRedactions: [
                    {
                        jsonPath: "$.employees[?(@.name == {{bob}})]",
                        regex: '"name":"(?<bob>.*)"',
                        xPath: ""
                    },
                    {
                        jsonPath: "$.employees[?(@.department == {{bio}})]",
                        regex: '"department":"(?<bio>.*)"',
                        xPath: ""
                    },
                ],
                templateParams: ['param1', 'param2'],
            }
        ]);
    });
});