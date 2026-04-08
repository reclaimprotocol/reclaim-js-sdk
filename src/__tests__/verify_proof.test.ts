/**
 * @jest-environment node
 */

import { verifyProof, verifyTeeAttestation, TeeVerificationError, getPublicDataFromProofs } from '../index';
import { Proof, TeeAttestation } from '../utils/interfaces';

const proofData = [{ "identifier": "0xbb5c63656a650276728d3cb9ce3f90361223c7814fd94f6582b682dfc96e4ba8", "claimData": { "provider": "http", "parameters": "{\"additionalClientOptions\":{\"popcornApiUrl\":\"https://popcorn-cluster-aws-us-east-2.popcorn.reclaimprotocol.org\"},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Not-A.Brand\\\";v=\\\"24\\\", \\\"Chromium\\\";v=\\\"146\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"srivatsanqb\"},\"proxySessionId\":\"1ab031c2ef\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}", "owner": "0x9c3dcb81fe10f6e494bfaa0220ea0ba7bcf3ad94", "timestampS": 1774346626, "context": "{\"attestationNonce\":\"0xdf1cd84efbeded8c07d0fcdccc4883e74ecf5ed65eaf023d2aa1aafd75611f6c04eb1f633396ecbcc4f6fe9fc11c25586a4dac3a99deb40c44ae5cf49cebae6d1b\",\"attestationNonceData\":{\"applicationId\":\"0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5\",\"sessionId\":\"1ab031c2ef\",\"timestamp\":\"1774346557104\"},\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"srivatsanqb\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\",\"reclaimSessionId\":\"1ab031c2ef\"}", "identifier": "0xbb5c63656a650276728d3cb9ce3f90361223c7814fd94f6582b682dfc96e4ba8", "epoch": 1 }, "witnesses": [{ "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072", "url": "wss://attestor.reclaimprotocol.org:444/ws" }], "signatures": ["0x379b164165e005d75be4ec7854d745d68ad56d738a08da3a4c30eb071948bf5d0c7262bb8c46189e0cadb583dbb00917b73fbdbf74b5914eb69774ce97196a911c"], "teeAttestation": { "workload_digest": "342772716647.dkr.ecr.us-east-2.amazonaws.com/popcorn/browser-node@sha256:beb71484ef0fa21e0fbe204e2522a012fa16d6b4be4b4fcb1d9b13727d48188b", "verifier_digest": "342772716647.dkr.ecr.us-east-2.amazonaws.com/popcorn/attestor@sha256:41ca800a1fc851d60a8885c7b87d9481565484512b47c5bf1badb43243855bca", "nonce": "0xdf1cd84efbeded8c07d0fcdccc4883e74ecf5ed65eaf023d2aa1aafd75611f6c04eb1f633396ecbcc4f6fe9fc11c25586a4dac3a99deb40c44ae5cf49cebae6d1b", "snp_report": "BQAAAAAAAAAAAAMCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAEAAAAAAAd3icAAAAAAAAABAAAAAAAAADHYrIWCfikwvPs/dRPK5XYtt5cYfLfHfK2ZoX+YLExwMdishYJ+KTC8+z91E8rldi23lxh8t8d8rZmhf5gsTHAt1bd5yxUjkJWC6a0OVW2jBI5aCEEx4+geYntPRVHgQfLDgoqljdgRYa5YV642nYXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACrXDTSvTs8rMd6eJVyxntdx8BBmmPvCo00o6mpM/Oo6///////////////////////////////////////////BAAAAAAAHd4ZAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAHd4BOgEAAToBAAQAAAAAAB3eDwAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxb6iyCGN6w1+riXkbH/VRo74O7renVbzgEV55dDfppNSQch0oHVzSkdkof7cutCuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA883WWYbGmUblVREZjknNOVNHOAocli+JJ/RLttazCHVOQnMxItPJxuNpXown66H7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "vlek_cert": "MIIFIzCCAtegAwIBAgIBADBBBgkqhkiG9w0BAQowNKAPMA0GCWCGSAFlAwQCAgUAoRwwGgYJKoZIhvcNAQEIMA0GCWCGSAFlAwQCAgUAogMCATAwgYAxFDASBgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZpY2VzMRcwFQYDVQQDDA5TRVYtVkxFSy1NaWxhbjAeFw0yNjAzMDkxOTMwMDVaFw0yNzAzMDkxOTMwMDVaMHoxFDASBgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZpY2VzMREwDwYDVQQDDAhTRVYtVkxFSzB2MBAGByqGSM49AgEGBSuBBAAiA2IABE/rO0PxEkKVu5SAX9Fv+h1pF0r+wWNmNO+DLcMENz2IOaqYiS6swJjXThFjsjIx5mdy42ozh33DIC+b02LmGScVQrREUL0h5KR4Qd5+BTiO+UDBb8Xd/p8rzpTQn+foEKOB8jCB7zAQBgkrBgEEAZx4AQEEAwIBADAUBgkrBgEEAZx4AQIEBxYFTWlsYW4wEQYKKwYBBAGceAEDAQQDAgEEMBEGCisGAQQBnHgBAwIEAwIBADARBgorBgEEAZx4AQMEBAMCAQAwEQYKKwYBBAGceAEDBQQDAgEAMBEGCisGAQQBnHgBAwYEAwIBADARBgorBgEEAZx4AQMHBAMCAQAwEQYKKwYBBAGceAEDAwQDAgEdMBIGCisGAQQBnHgBAwgEBAICAN4wLAYJKwYBBAGceAEFBB8WHUNOPWNjLXVzLWVhc3QtMi5hbWF6b25hd3MuY29tMEEGCSqGSIb3DQEBCjA0oA8wDQYJYIZIAWUDBAICBQChHDAaBgkqhkiG9w0BAQgwDQYJYIZIAWUDBAICBQCiAwIBMAOCAgEAezLRKlKoxDhJ9gGLDoIhruKSWJcwMHPn6E/aJzJvpDaYfb12ACKHyiMsm5htk6+lL9Kse544pmhhUm/hxlpUNXiF+61obfKcaxp11Q2hzC/hTyLYpse6IXskLq6OH+DXzrcw0X30t3YIiUqzCGszbeTBy4uUOULxz3XbSUYFsKwsk9oMuo7isOUM3INiMiOTq91THlp6ZSVJDLIpW8v17DSL7yfJsvyLKsvtL7YjohFsOJe/qr/ttVSLC9WJmnxMxaxtgLSVGwCNTHsx6646R7SAPRVXpdOd4f+Gfj4Dk1eiELs1L85Qm0tChDLrLLO31X9cwPxg6fjdZ3sgqZrOv9Up2EiiX3uzH9pjuek9KZw8BvbNmkABURnj2QVKkANKWeVwJ2OI9xmbKnLDQp+t3Q6gTcdPdcjSsAkT0JijpzamEmIPLdBobgVHAcxCxRhBILmJWQcU8V8Rg2+n/Zs8gpuGaCj0j8s8YDq7+sgy0/5CsDgAhU7+4HqzBTPbhOCNAI9uptU6v0xoDLzldXmVJQaGWp6zQ+WB29ZnFrF4UE85+os3uIwc6uEPBjh3bjmhTwa3I7LWRWldRyoJUuLnBIdTJYVIkgrYJ47LfI3akZxUM0D+FpqawemnHOTT1z8ee1wj7wnE6nS2X0R7cJNthweU48At2ZfRIuPYvu9av2Y=", "timestamp": "2026-03-24T10:03:43Z" } }]

const expectedApplicationId = "0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5";

function cloneProof(): Proof {
    return JSON.parse(JSON.stringify(proofData[0])) as Proof;
}

describe('verifyProof', () => {
    it('verifies proof signature and returns extracted data', async () => {
        const proof = cloneProof();
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(result.isVerified).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.data).toHaveLength(1);
        expect(result.data[0].extractedParameters).toEqual({ DYNAMIC_GEO: 'IN', username: 'srivatsanqb' });
    });

    it('returns error object when signature verification fails', async () => {
        const proof = cloneProof();
        proof.signatures = ['0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff'];
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(result.isVerified).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.data).toEqual([]);
    });

    it('returns error when proof data is tampered (signature mismatch)', async () => {
        const proof = cloneProof();
        proof.claimData.timestampS = proof.claimData.timestampS + 60 * 60;
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(result.isVerified).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.data).toEqual([]);
    });

    it('returns TeeVerificationError when TEE digests are tampered', async () => {
        const proof = cloneProof();
        const attestation = proof.teeAttestation as TeeAttestation;
        const [prefix, digest] = attestation.workload_digest.split('@sha256:');
        const originalHex = digest ?? '';
        const flippedHex = (originalHex[0] === '0' ? '1' : '0') + originalHex.slice(1);
        attestation.workload_digest = `${prefix}@sha256:${flippedHex}`;
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true, verifyTEE: true });
        expect(result.isVerified).toBe(false);
        expect(result.isTeeVerified).toBe(false);
        expect(result.error).toBeInstanceOf(TeeVerificationError);
    });

    it('returns TeeVerificationError when teeAttestation is missing from proof', async () => {
        const proof = cloneProof();
        delete (proof as any).teeAttestation;
        // Context (and its attestationNonce) stays intact so signature remains valid.
        // verifyTeeAttestation sees missing teeAttestation and returns false.
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true, verifyTEE: true });
        expect(result.isVerified).toBe(false);
        expect(result.isTeeVerified).toBe(false);
        expect(result.error).toBeInstanceOf(TeeVerificationError);
    });

    it('standalone verifyTeeAttestation detects tampered digests', async () => {
        const proof = cloneProof();
        const attestation = proof.teeAttestation as TeeAttestation;
        const [prefix, digest] = attestation.workload_digest.split('@sha256:');
        const originalHex = digest ?? '';
        const flippedHex = (originalHex[0] === '0' ? '1' : '0') + originalHex.slice(1);
        attestation.workload_digest = `${prefix}@sha256:${flippedHex}`;
        await expect(verifyTeeAttestation(proof, expectedApplicationId)).resolves.toBe(false);
    });
});

describe('getPublicDataFromProofs', () => {
    it('returns empty array if no publicData is present', () => {
        const proof1 = cloneProof();
        const proof2 = cloneProof();
        proof1.publicData = undefined;
        proof2.publicData = undefined;

        const result = getPublicDataFromProofs([proof1, proof2]);
        expect(result).toEqual([]);
    });

    it('extracts publicData correctly', () => {
        const proof = cloneProof();
        proof.publicData = { user: 'test1' };

        const result = getPublicDataFromProofs([proof]);
        expect(result).toEqual([{ user: 'test1' }]);
    });

    it('deduplicates identical publicData', () => {
        const proof1 = cloneProof();
        const proof2 = cloneProof();
        proof1.publicData = { user: 'test', score: '100' };
        // Identical data but different key order to also test canonical hashing
        proof2.publicData = { score: '100', user: 'test' };

        const result = getPublicDataFromProofs([proof1, proof2]);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ user: 'test', score: '100' });
    });

    it('returns multiple distinct publicData objects', () => {
        const proof1 = cloneProof();
        const proof2 = cloneProof();
        proof1.publicData = { user: 'test1' };
        proof2.publicData = { user: 'test2' };

        const result = getPublicDataFromProofs([proof1, proof2]);
        expect(result).toHaveLength(2);
        expect(result).toEqual([{ user: 'test1' }, { user: 'test2' }]);
    });
});
