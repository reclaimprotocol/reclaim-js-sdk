import { verifyProof } from "../../Reclaim";
import { ProofNotValidatedError } from "../errors";
import { assertVerifiedProof } from "../proofUtils";
import { assertValidateProof } from "../proofValidationUtils";
import { mockFetch } from "./mock-fetch";

describe('Request', () => {
    it('should verify proofs correctly', async () => {
        globalThis.fetch = mockFetch({
            "data": [
                {
                    "address": "0x1be31a94361a391bbafb2a4ccd704f57dc04d4bb"
                },
                {
                    "address": "0x244897572368eadf65bfbc5aec98d8e5443a9072"
                }
            ]
        });

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
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"] })).toEqual(true);

        // fake proofs
        expect(await verifyProof({
            // modified identifier
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10",
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
            // $.identifier is ignored
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"] })).toEqual(true);

        // fake proofs
        expect(await verifyProof({
            // modified identifier
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                // modified identifier
                "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10",
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
            // idenfier is ignored
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"] })).toEqual(true);

        // fake proofs
        expect(await verifyProof({
            // copied from a different proof
            "identifier": "0x017f00948bdef16b3d4d7eb30cf985fd21b4491fd08c39894ed5e84ac952c476",
            // copied from a different proof
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyedreclaim\"},\"proxySessionId\":\"40a7cda4b6\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0xb737a1f20b2b556e79f715f86098f205a2730bc5",
                "timestampS": 1773096902,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyedreclaim\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
                "identifier": "0x017f00948bdef16b3d4d7eb30cf985fd21b4491fd08c39894ed5e84ac952c476",
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
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"] })).toEqual(false);

        // fake proofs
        expect(await verifyProof({
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                // modified parameters
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"http://localhost:5173/api/i/users.UsersService/GetCurrentUser\"}",
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
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"] })).toEqual(false);

        // fake proofs
        expect(await verifyProof({
            "identifier": "0x51c192777d45010e9318c0e1eb2fefc0bc5a444f59e3d3e5a11e9a3d1b98e10c",
            "claimData": {
                "provider": "http",
                "parameters": "{\"additionalClientOptions\":{},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Chromium\\\";v=\\\"145\\\", \\\"Not:A-Brand\\\";v=\\\"99\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheedsyed\"},\"proxySessionId\":\"8e825912c9\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
                "owner": "0x2967c5e6b3c4f179699bcc6e45bbe13b2203818e",
                "timestampS": 1773163350,
                // modified context
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"mushaheed\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
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
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b"] })).toEqual(false);
    });

    it('should reject proof without parameters or providerHash', async () => {
        expect(await verifyProof({
            "identifier": "0xb20adb911a66ace19875f3822e4e96345311690530e3e91e5f138665d3a4e4d7",
            "claimData": {
                "provider": "http",
                "parameters": "",
                "owner": "0x1234567890123456789012345678901234567890",
                "timestampS": 1773228979,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"countryCode\":\"371\",\"email\":\"jasmine@drw.wiki\",\"firstName\":\"Jie\",\"lastName\":\"Hu\",\"phoneNumber\":\"67320123\",\"tier\":\"Platinum\",\"userId\":\"749305660\"},\"isAiProof\":true,\"isPortalProof\":true}",
                "identifier": "0xb20adb911a66ace19875f3822e4e96345311690530e3e91e5f138665d3a4e4d7",
                "epoch": 1
            },
            "signatures": [
                "0x3e10faee32a8bb1f3c0c08c6448a4118270a0be81af7361779f5cf1528465a94486ab742adbfe3f477cdf4d5711b70bd6f46504acdd382591ac4b768389cdf131b"
            ],
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://eu.attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "extractedParameterValues": {
                "userId": "749305660",
                "email": "jasmine@drw.wiki",
                "firstName": "Jie",
                "lastName": "Hu",
                "tier": "Platinum",
                "countryCode": "371",
                "phoneNumber": "67320123",
                "DYNAMIC_GEO": "IN"
            }
        } as any, { hashes: ["0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"] })).toEqual(false);

        expect(() => assertValidateProof([{
            "identifier": "0xb20adb911a66ace19875f3822e4e96345311690530e3e91e5f138665d3a4e4d7",
            "claimData": {
                "provider": "http",
                "parameters": "",
                "owner": "0x1234567890123456789012345678901234567890",
                "timestampS": 1773228979,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"countryCode\":\"371\",\"email\":\"jasmine@drw.wiki\",\"firstName\":\"Jie\",\"lastName\":\"Hu\",\"phoneNumber\":\"67320123\",\"tier\":\"Platinum\",\"userId\":\"749305660\"},\"isAiProof\":true,\"isPortalProof\":true}",
                "identifier": "0xb20adb911a66ace19875f3822e4e96345311690530e3e91e5f138665d3a4e4d7",
                "epoch": 1
            },
            "signatures": [
                "0x3e10faee32a8bb1f3c0c08c6448a4118270a0be81af7361779f5cf1528465a94486ab742adbfe3f477cdf4d5711b70bd6f46504acdd382591ac4b768389cdf131b"
            ],
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://eu.attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "extractedParameterValues": {
                "userId": "749305660",
                "email": "jasmine@drw.wiki",
                "firstName": "Jie",
                "lastName": "Hu",
                "tier": "Platinum",
                "countryCode": "371",
                "phoneNumber": "67320123",
                "DYNAMIC_GEO": "IN"
            }
        }] as any, {
            hashes: ["0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"]
        })).toThrow(new ProofNotValidatedError('Proof has no HTTP provider params to hash'));
    });

    it('should reject proof which do not match hash', async () => {
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
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5e"] })).toEqual(false);

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
        } as any, { hashes: ["0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5e"] })).toEqual(false);

        expect(await verifyProof({
            "identifier": "0xb20adb911a66ace19875f3822e4e96345311690530e3e91e5f138665d3a4e4d7",
            "claimData": {
                "provider": "http",
                "parameters": "",
                "owner": "0x1234567890123456789012345678901234567890",
                "timestampS": 1773228979,
                "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"countryCode\":\"371\",\"email\":\"jasmine@drw.wiki\",\"firstName\":\"Jie\",\"lastName\":\"Hu\",\"phoneNumber\":\"67320123\",\"tier\":\"Platinum\",\"userId\":\"749305660\"},\"isAiProof\":true,\"isPortalProof\":true}",
                "identifier": "0xb20adb911a66ace19875f3822e4e96345311690530e3e91e5f138665d3a4e4d7",
                "epoch": 1
            },
            "signatures": [
                "0x3e10faee32a8bb1f3c0c08c6448a4118270a0be81af7361779f5cf1528465a94486ab742adbfe3f477cdf4d5711b70bd6f46504acdd382591ac4b768389cdf131b"
            ],
            "witnesses": [
                {
                    "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                    "url": "wss://eu.attestor.reclaimprotocol.org:444/ws"
                }
            ],
            "extractedParameterValues": {
                "userId": "749305660",
                "email": "jasmine@drw.wiki",
                "firstName": "Jie",
                "lastName": "Hu",
                "tier": "Platinum",
                "countryCode": "371",
                "phoneNumber": "67320123",
                "DYNAMIC_GEO": "IN"
            }
        } as any, { hashes: [""] })).toEqual(false);
    });
});
