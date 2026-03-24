/**
 * @jest-environment node
 */

import { verifyProof } from '../Reclaim';
import { Proof } from '../utils/interfaces';
import { verifyTeeAttestation } from '../utils/verifyTee';
const proofData = [
    {
        "identifier": "0x89db983329e3b597d1775f7ccbd01ccede980c35d1d620a517957d89a8e9f3b2",
        "claimData": {
            "provider": "http",
            "parameters": "{\"additionalClientOptions\":{\"popcornApiUrl\":\"https://popcorn-cluster-aws-us-east-2.popcorn.reclaimprotocol.org\"},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Not-A.Brand\\\";v=\\\"24\\\", \\\"Chromium\\\";v=\\\"146\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"srivatsanqb\"},\"proxySessionId\":\"f6194461c1\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
            "owner": "0x9c3dcb81fe10f6e494bfaa0220ea0ba7bcf3ad94",
            "timestampS": 1774301976,
            "context": "{\"attestationNonce\":\"0x882fcf8b7532d837d2cfae467a3364661dcadde72ce704abc56276a53807230004536ee37a5ce75401210ff6fc7825a4c7a1daf20f508be7aba0c3aa2d985d861b\",\"attestationNonceData\":{\"applicationId\":\"0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5\",\"sessionId\":\"f6194461c1\",\"timestamp\":\"1774301899179\"},\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"srivatsanqb\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
            "identifier": "0x89db983329e3b597d1775f7ccbd01ccede980c35d1d620a517957d89a8e9f3b2",
            "epoch": 1
        },
        "witnesses": [
            {
                "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                "url": "wss://attestor.reclaimprotocol.org:444/ws"
            }
        ],
        "signatures": [
            "0x57d0683ce9d4177b6d4f7b1bf6c708a9c69af0a4e9d7af245688982b2e875b1d01e614f0c1d686ccdc90962e7824c6e0d737ca2fb4632ee05d8b29826bace4981c"
        ],
        "teeAttestation": "{\"workload_digest\":\"342772716647.dkr.ecr.us-east-2.amazonaws.com/popcorn/browser-node@sha256:a3005bef16a482821c49cd6ceec4fb932e61fcf492e4def1e905810e1cc47e90\",\"verifier_digest\":\"342772716647.dkr.ecr.us-east-2.amazonaws.com/popcorn/attestor@sha256:41ca800a1fc851d60a8885c7b87d9481565484512b47c5bf1badb43243855bca\",\"nonce\":\"0x882fcf8b7532d837d2cfae467a3364661dcadde72ce704abc56276a53807230004536ee37a5ce75401210ff6fc7825a4c7a1daf20f508be7aba0c3aa2d985d861b\",\"snp_report\":\"BQAAAAAAAAAAAAMCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAEAAAAAAAc3icAAAAAAAAABAAAAAAAAACBevTZk6qxbaE8sL5AfXz9n9mee7m/TPZx7jMKRTBUiYF69NmTqrFtoTywvkB9fP2f2Z57ub9M9nHuMwpFMFSJt1bd5yxUjkJWC6a0OVW2jBI5aCEEx4+geYntPRVHgQfLDgoqljdgRYa5YV642nYXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAypR9JVDdrIKI4zxu8aOUIvljZHCagLahCYO3ikv4dq///////////////////////////////////////////BAAAAAAAG94ZAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAHN4AOgEAADoBAAQAAAAAABzeDwAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtH2EfSQ0XQGJnIy3imNohQlSrYhmQYP0MM3TQA+32bOCx73PznGQ+GzlKRZj7WB6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJvTQW1rx+dv8tOpkscIq720X8oI9Vch8LUW5DWm8VliMPknA56cJJcQ831SYW04TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\",\"vlek_cert\":\"MIIFIzCCAtegAwIBAgIBADBBBgkqhkiG9w0BAQowNKAPMA0GCWCGSAFlAwQCAgUAoRwwGgYJKoZIhvcNAQEIMA0GCWCGSAFlAwQCAgUAogMCATAwgYAxFDASBgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZpY2VzMRcwFQYDVQQDDA5TRVYtVkxFSy1NaWxhbjAeFw0yNTEyMTUyMTE0MThaFw0yNjEyMTUyMTE0MThaMHoxFDASBgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZpY2VzMREwDwYDVQQDDAhTRVYtVkxFSzB2MBAGByqGSM49AgEGBSuBBAAiA2IABDirub0yTsaVN3lKIfO9nkXbwvmUR8OIyuWiGgFyhFoDfNg3PhjD2XzbWNPH1dVrCEO1hFDBSZt4/JAKRekyeey0H4w3n0vnKKbWVFja0UYt0Z+Pner/xWltfd9jvuH7NaOB8jCB7zAQBgkrBgEEAZx4AQEEAwIBADAUBgkrBgEEAZx4AQIEBxYFTWlsYW4wEQYKKwYBBAGceAEDAQQDAgEEMBEGCisGAQQBnHgBAwIEAwIBADARBgorBgEEAZx4AQMEBAMCAQAwEQYKKwYBBAGceAEDBQQDAgEAMBEGCisGAQQBnHgBAwYEAwIBADARBgorBgEEAZx4AQMHBAMCAQAwEQYKKwYBBAGceAEDAwQDAgEbMBIGCisGAQQBnHgBAwgEBAICAN4wLAYJKwYBBAGceAEFBB8WHUNOPWNjLXVzLWVhc3QtMi5hbWF6b25hd3MuY29tMEEGCSqGSIb3DQEBCjA0oA8wDQYJYIZIAWUDBAICBQChHDAaBgkqhkiG9w0BAQgwDQYJYIZIAWUDBAICBQCiAwIBMAOCAgEAzbeDx8AXTxyIaPLAkRA+a+1E8WIWRBK66yyPodAMxCCyEEmeegfjIw9YxQMS9w+WPemcUwUlanRaTRmue1mpsjyegv8G0UZ3wcIRveyk/2X/MuOY9tWGnviyzElHFaVjATS07T9TNNQhtQkIa5+yq9b/NxLOW+3NBryJ8VsebFdUoPKi7KU3TgwAEVBxqEyesIdFJ0LnOffg4rHsI+LMzPKA/oP2ZBgewqEOQJdQuaMCk/RDHapFlRwE4ANP6onLv9VWpmAdnjteap2RJqWwccuCuYx7eGZFIjliAQY1IQOL7+t7gLhl8Da9kSN9lMZGfm1AE6Wk1UmB7nMEDKNlKLr1eyO+ULrIewdUO3KFEmkOGSvi9RTA4uvYe2dMWBu9h6Y2Tca/2K9LYfAN7yh+KNirMHxeamENr8AgJ8UyVetHK+K/R9Nr5SWSpvXcTnqV1AMmoYRO6O1lYZI7XeYW0eTM7gK6znRvDH1bkxIM8d55PX26vcQqgGwSsJVpAjfF2SxRCakqyO5Gya23me2HlPazd9HyITQk5zepkqCddcKS2FELWw3waR/bp3T8OBEvFC8bswEyBcAX15Dch3THvO8jGkwHtiJsEhHvzu8fUjyVoMffKkHKX3T/bsGSEvMNMEXhMRqF6CzDnfWU/Dd/I3DB9MKXWihh8u+aZlss8X4=\",\"timestamp\":\"2026-03-23T21:39:31Z\"}\n"
    }
]

describe('verifyProof', () => {
    it('verifies proof and TEE attestation end-to-end', async () => {
        const proof = proofData[0] as Proof;
        if (typeof proof.teeAttestation === 'string') {
            proof.teeAttestation = JSON.parse(proof.teeAttestation);
        }
        const expectedApplicationId = "0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5";
        const verificationStatus = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(verificationStatus).toBe(true);
        await expect(verifyTeeAttestation(proof, expectedApplicationId)).resolves.toBe(true);
    });
});
