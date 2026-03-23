import { verifyProof } from "../../Reclaim";
import { mockFetch } from "./mock-fetch";

const testAppId = '0x9323eFec99973623932Db45438DCE4dEa9D9aE4c';
const testAppSecret = '37e1d9da2f551ce0dac7e0eeda8a9e00daf62a3a3c548ed98cc80fc1a3983ad6';

const validProof = {
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
} as any;

const mockAttestors = {
    "data": [
        { "address": "0x1be31a94361a391bbafb2a4ccd704f57dc04d4bb" },
        { "address": "0x244897572368eadf65bfbc5aec98d8e5443a9072" }
    ]
};

describe('Request', () => {
    it('should verify proofs correctly', async () => {
        globalThis.fetch = mockFetch(mockAttestors);

        // correct proofs
        expect((await verifyProof({
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
        } as any)).isVerified).toEqual(true);

        // fake proofs
        expect((await verifyProof({
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
        } as any)).isVerified).toEqual(true);

        // fake proofs
        expect((await verifyProof({
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
        } as any)).isVerified).toEqual(true);

        // fake proofs
        expect((await verifyProof({
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
        } as any)).isVerified).toEqual(false);

        // fake proofs
        expect((await verifyProof({
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
        } as any)).isVerified).toEqual(false);

        // fake proofs
        expect((await verifyProof({
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
        } as any)).isVerified).toEqual(false);
    });

    it('should return extracted data on successful verification', async () => {
        globalThis.fetch = mockFetch(mockAttestors);

        const result = await verifyProof(validProof);

        expect(result.isVerified).toEqual(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].context.contextAddress).toEqual('0x0');
        expect(result.data[0].context.contextMessage).toEqual('sample context');
        expect(result.data[0].context.providerHash).toBeDefined();
        expect(result.data[0].extractedParameters).toEqual({
            DYNAMIC_GEO: 'IN',
            username: 'mushaheedsyed',
        });
        // extractedParameters should not be in context
        expect(result.data[0].context.extractedParameters).toBeUndefined();
    });

    it('should return empty data on failed verification', async () => {
        globalThis.fetch = mockFetch(mockAttestors);

        const result = await verifyProof({
            ...validProof,
            "claimData": {
                ...validProof.claimData,
                // mismatched signature — different owner
                "owner": "0xb737a1f20b2b556e79f715f86098f205a2730bc5",
            },
        } as any);

        expect(result.isVerified).toEqual(false);
        expect(result.data).toEqual([]);
    });

    it('should extract context fields from valid proof', async () => {
        globalThis.fetch = mockFetch(mockAttestors);

        // modifying context invalidates the signature, so isVerified will be false
        // and data will be empty — test extractProofData directly via a valid proof
        // that happens to have minimal context fields
        const result = await verifyProof(validProof);

        // the valid proof has contextAddress and contextMessage in context
        expect(result.isVerified).toEqual(true);
        expect(result.data[0].context.contextAddress).toEqual('0x0');
        expect(result.data[0].context.contextMessage).toEqual('sample context');
        expect(result.data[0].extractedParameters).toEqual({
            DYNAMIC_GEO: 'IN',
            username: 'mushaheedsyed',
        });
    });

    it('should return empty data when context is invalid (verification fails)', async () => {
        globalThis.fetch = mockFetch(mockAttestors);

        const proofWithBadContext = {
            ...validProof,
            claimData: {
                ...validProof.claimData,
                context: "not-json",
            },
        } as any;

        // modified context causes signature mismatch → isVerified false, data empty
        const result = await verifyProof(proofWithBadContext);

        expect(result.isVerified).toEqual(false);
        expect(result.data).toEqual([]);
    });

    it('should handle multiple proofs and return data for each', async () => {
        globalThis.fetch = mockFetch(mockAttestors);

        const result = await verifyProof([validProof, validProof]);

        expect(result.isVerified).toEqual(true);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].extractedParameters.username).toEqual('mushaheedsyed');
        expect(result.data[1].extractedParameters.username).toEqual('mushaheedsyed');
    });
});
