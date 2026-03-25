import { verifyProof } from "../../Reclaim";
import { fetchProviderHashRequirementsBy } from "../providerUtils";
import { mockFetchBy } from "./mock-fetch";

describe('Validation', () => {
    it('should validate proofs correctly', async () => {
        globalThis.fetch = mockFetchBy((url) => {
            if (url.includes('attestors')) {
                return {
                    "data": [
                        {
                            "address": "0x1be31a94361a391bbafb2a4ccd704f57dc04d4bb"
                        },
                        {
                            "address": "0x244897572368eadf65bfbc5aec98d8e5443a9072"
                        }
                    ]
                }
            }

            return {
                "message": "Provider fetched successfully",
                "providers": [{
                    "requestData": [
                        {
                            "url": "https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser",
                            "expectedPageUrl": "",
                            "urlType": "TEMPLATE",
                            "method": "POST",
                            "responseMatches": [
                                {
                                    "value": "\"userName\":\"{{username}}\"",
                                    "type": "contains",
                                    "invert": false,
                                    "description": null,
                                    "order": null,
                                    "isOptional": false
                                }
                            ],
                            "responseRedactions": [
                                {
                                    "xPath": "",
                                    "jsonPath": "$.userName",
                                    "regex": "\"userName\":\"(.*)\"",
                                    "hash": ""
                                }
                            ],
                            "bodySniff": {
                                "enabled": true,
                                "template": "{\"includeGroups\":false,\"includeLogins\":false,\"includeVerificationStatus\":true}"
                            },
                            "requestHash": "0x8f3ebf2865a1dce8f5c070ea087a3af86ee9127b82dc79cefff76c45d8968c42",
                            "responseVariables": [
                                "username"
                            ],
                            "additionalClientOptions": null,
                            "writeRedactionMode": null,
                            "credentials": null
                        }
                    ],
                }],
                "isSuccess": true
            }
        });

        const hashRequirements = await fetchProviderHashRequirementsBy('dontcareintest', '1.0.0', []);

        // correct proofs
        expect(await verifyProof({
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
                "epoch": 1
            },
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "signatures": [
                "0x561d209c999536ad0c6b5834bb5416963a3d61b3045e621d99ba5e0a07aa1a7b0707a4e8f4a218c5dd13f9e470d3c7023b7ddeda5463069eb08c231dbb0ab63c1b"
            ]
        } as any, hashRequirements[0])).toEqual(true);

        // correct proofs
        expect(await verifyProof({
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
                "epoch": 1
            },
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "signatures": [
                "0x561d209c999536ad0c6b5834bb5416963a3d61b3045e621d99ba5e0a07aa1a7b0707a4e8f4a218c5dd13f9e470d3c7023b7ddeda5463069eb08c231dbb0ab63c1b"
            ]
        } as any, { providerId: 'dontcareintest', providerVersion: '1.0.0', allowedTags: [] })).toEqual(true);
    });

    it('should validate invalid proofs and return false', async () => {
        globalThis.fetch = mockFetchBy((url) => {
            if (url.includes('attestors')) {
                return {
                    "data": [
                        {
                            "address": "0x1be31a94361a391bbafb2a4ccd704f57dc04d4bb"
                        },
                        {
                            "address": "0x244897572368eadf65bfbc5aec98d8e5443a9072"
                        }
                    ]
                }
            }

            return {
                "message": "Provider fetched successfully",
                "providers": [{
                    "requestData": [
                        {
                            "url": "https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser",
                            "expectedPageUrl": "",
                            "urlType": "TEMPLATE",
                            "method": "POST",
                            "responseMatches": [
                                {
                                    "value": "\"userName\":\"{{username}}\"",
                                    "type": "contains",
                                    "invert": false,
                                    "description": null,
                                    "order": null,
                                    "isOptional": false
                                }
                            ],
                            "responseRedactions": [
                                {
                                    "xPath": "",
                                    "jsonPath": "$.userName.id",
                                    "regex": "\"userName\":\"(.*)\"",
                                    "hash": ""
                                }
                            ],
                            "bodySniff": {
                                "enabled": true,
                                "template": "{\"includeGroups\":false,\"includeLogins\":false,\"includeVerificationStatus\":true}"
                            },
                            "requestHash": "0x8f3ebf2865a1dce8f5c070ea087a3af86ee9127b82dc79cefff76c45d8968c42",
                            "responseVariables": [
                                "username"
                            ],
                            "additionalClientOptions": null,
                            "writeRedactionMode": null,
                            "credentials": null
                        }
                    ],
                }],
                "isSuccess": true
            }
        });

        const hashRequirements = await fetchProviderHashRequirementsBy('dontcareintest', '1.0.0', []);

        // invalid proofs
        expect(await verifyProof({
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
                "epoch": 1
            },
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "signatures": [
                "0x561d209c999536ad0c6b5834bb5416963a3d61b3045e621d99ba5e0a07aa1a7b0707a4e8f4a218c5dd13f9e470d3c7023b7ddeda5463069eb08c231dbb0ab63c1b"
            ]
        } as any, hashRequirements[0])).toEqual(false);

        // invalid proofs
        expect(await verifyProof({
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
                "epoch": 1
            },
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "signatures": [
                "0x561d209c999536ad0c6b5834bb5416963a3d61b3045e621d99ba5e0a07aa1a7b0707a4e8f4a218c5dd13f9e470d3c7023b7ddeda5463069eb08c231dbb0ab63c1b"
            ]
        } as any, { providerId: 'dontcareintest', providerVersion: '1.0.0', allowedTags: [] })).toEqual(false);
    });

    describe('Array Values and Multiple Proofs Configurations', () => {
        const { assertValidateProof } = require('../proofValidationUtils');

        const realProof = {
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
                "epoch": 1
            },
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "signatures": [
                "0x561d209c999536ad0c6b5834bb5416963a3d61b3045e621d99ba5e0a07aa1a7b0707a4e8f4a218c5dd13f9e470d3c7023b7ddeda5463069eb08c231dbb0ab63c1b"
            ]
        };

        it('should validate proof successfully if proof hash intersects with expected hash array', async () => {
            const requirementsWithArray = {
                hashes: [
                    {
                        // value is an array because of isOptional in original request spec
                        value: [
                            "0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b", // actual matching hash
                            "0xfakehash1234567890abcdef1234567890abcdef1234567890abcdef12345678"  // optional variation
                        ]
                    }
                ]
            };
            await expect(assertValidateProof([realProof] as any, requirementsWithArray)).resolves.toBeUndefined();
        });

        it('should accept duplicated proofs of the same hash when multiple is true', async () => {
            const requirementsMultipleTrue = {
                hashes: [
                    {
                        value: "0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b",
                        multiple: true
                    }
                ]
            };
            // Pass the same proof twice, representing multiple proofs in the list mapping to this single hash requirement
            await expect(assertValidateProof([realProof, realProof] as any, requirementsMultipleTrue)).resolves.toBeUndefined();
        });

        it('should reject duplicated proofs of the same hash when multiple is false', async () => {
            const requirementsMultipleFalse = {
                hashes: [
                    {
                        value: "0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b",
                        multiple: false
                    }
                ]
            };
            // Should fail because multiple is false but we passed two proofs that match this single hash requirement
            await expect(assertValidateProof([realProof, realProof] as any, requirementsMultipleFalse)).rejects.toThrow(/not allowed to appear more than once/);
        });
        it('should accept duplicated proofs of the same hash when multiple option is omitted (defaults to true)', async () => {
            const requirementsMultipleOmitted = {
                hashes: [
                    {
                        value: "0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"
                        // multiple is omitted, defaults to true
                    }
                ]
            };
            // Should pass because multiple defaults to true
            await expect(assertValidateProof([realProof, realProof] as any, requirementsMultipleOmitted)).resolves.toBeUndefined();
        });

        it('should reject validation when a proof is missing and required option is omitted (defaults to true)', async () => {
            const requirementsRequiredOmitted = {
                hashes: [
                    {
                        value: "0xMISSINGHASH1234567890abcdef1234567890abcdef1234567890abcdef123"
                        // required is omitted, defaults to true
                    }
                ]
            };
            // Should fail because the expected hash doesn't match our real proof, and required defaults to true
            await expect(assertValidateProof([realProof] as any, requirementsRequiredOmitted)).rejects.toThrow(/was not found/);
        });
        it('should reject validation when a required proof is missing (required is true)', async () => {
            const requirementsRequiredTrue = {
                hashes: [
                    {
                        value: "0xMISSINGHASH1234567890abcdef1234567890abcdef1234567890abcdef123",
                        required: true
                    }
                ]
            };
            // Should fail because the expected hash doesn't match our real proof, and required is explicitly true
            await expect(assertValidateProof([realProof] as any, requirementsRequiredTrue)).rejects.toThrow(/was not found/);
        });

        it('should accept validation when an optional proof is missing (required is false)', async () => {
            const requirementsRequiredFalse = {
                hashes: [
                    {
                        // The actual proof satisfying the validation
                        value: "0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"
                    },
                    {
                        // The missing hash
                        value: "0xMISSINGHASH1234567890abcdef1234567890abcdef1234567890abcdef123",
                        required: false // Explicitly marked as optional
                    }
                ]
            };
            // Should pass because the missing hash is not required, and all remaining proofs match permissible configurations
            await expect(assertValidateProof([realProof] as any, requirementsRequiredFalse)).resolves.toBeUndefined();
        });
    });
});
