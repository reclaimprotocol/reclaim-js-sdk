import { verifyTeeAttestation } from './src/utils/verifyTee';
import { Proof } from './src/utils/interfaces';
import { verifyProof } from './dist';

const proofData = [
    {
        "identifier": "0x79ed614ce4b0f573d17947b0a012dbc2be89eabb8c436198470635063e14cf40",
        "claimData": {
            "provider": "http",
            "parameters": "{\"additionalClientOptions\":{\"popcornApiUrl\":\"https://popcorn-cluster-aws-us-east-2.popcorn.reclaimprotocol.org\"},\"body\":\"{\\\"includeGroups\\\":false,\\\"includeLogins\\\":false,\\\"includeVerificationStatus\\\":true}\",\"geoLocation\":\"{{DYNAMIC_GEO}}\",\"headers\":{\"Accept\":\"application/json\",\"Accept-Language\":\"en-US,en;q=0.9\",\"Sec-Ch-Ua\":\"\\\"Not-A.Brand\\\";v=\\\"24\\\", \\\"Chromium\\\";v=\\\"146\\\"\",\"Sec-Ch-Ua-Mobile\":\"?0\",\"Sec-Fetch-Mode\":\"same-origin\",\"Sec-Fetch-Site\":\"same-origin\",\"User-Agent\":\"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36\"},\"method\":\"POST\",\"paramValues\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"srivatsanqb\"},\"proxySessionId\":\"e417bf71d5\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"\\\"userName\\\":\\\"{{username}}\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.userName\",\"regex\":\"\\\"userName\\\":\\\"(.*)\\\"\",\"xPath\":\"\"}],\"url\":\"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser\"}",
            "owner": "0x9c3dcb81fe10f6e494bfaa0220ea0ba7bcf3ad94",
            "timestampS": 1774300165,
            "context": "{\"attestationNonce\":\"0xe24c36659113dd35d6862ba9ddac0bbb6a7a64785ea75e3e3b7f9454bc22663019d7dbda82daca764dd88026a34e973644d66109b770caf0627ed7feebf02bc01c\",\"attestationNonceData\":{\"applicationId\":\"0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5\",\"sessionId\":\"e417bf71d5\",\"timestamp\":\"1774300088632\"},\"contextAddress\":\"0x0\",\"contextMessage\":\"sample context\",\"extractedParameters\":{\"DYNAMIC_GEO\":\"IN\",\"username\":\"srivatsanqb\"},\"providerHash\":\"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b\"}",
            "identifier": "0x79ed614ce4b0f573d17947b0a012dbc2be89eabb8c436198470635063e14cf40",
            "epoch": 1
        },
        "witnesses": [
            {
                "id": "0x244897572368eadf65bfbc5aec98d8e5443a9072",
                "url": "wss://attestor.reclaimprotocol.org:444/ws"
            }
        ],
        "signatures": [
            "0x1d2ae71f4cef38392cbb0ba76f4edc986e53f16d360f70cb7c4ed30f1f7bd3fa43121384c2c947d281442136fa0b1d9bc8a5cd160fcdd5979f46a23b2ef180bc1b"
        ],
        "teeAttestation": "{\"workload_digest\":\"342772716647.dkr.ecr.us-east-2.amazonaws.com/popcorn/browser-node@sha256:a3005bef16a482821c49cd6ceec4fb932e61fcf492e4def1e905810e1cc47e90\",\"verifier_digest\":\"342772716647.dkr.ecr.us-east-2.amazonaws.com/popcorn/attestor@sha256:41ca800a1fc851d60a8885c7b87d9481565484512b47c5bf1badb43243855bca\",\"nonce\":\"0xe24c36659113dd35d6862ba9ddac0bbb6a7a64785ea75e3e3b7f9454bc22663019d7dbda82daca764dd88026a34e973644d66109b770caf0627ed7feebf02bc01c\",\"snp_report\":\"BQAAAAAAAAAAAAMCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAEAAAAAAAd3icAAAAAAAAABAAAAAAAAAAYPiQxSq9wrShO/KdoGFtZmQzvTpjnXx93EPssZyez9Rg+JDFKr3CtKE78p2gYW1mZDO9OmOdfH3cQ+yxnJ7P1t1bd5yxUjkJWC6a0OVW2jBI5aCEEx4+geYntPRVHgQfLDgoqljdgRYa5YV642nYXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAj4CTu7MWm8Nc7iO8uYocEBONqft7KUaHMMtLfsz30W///////////////////////////////////////////BAAAAAAAHd4ZAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAHd4BOgEAAToBAAQAAAAAAB3eDwAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5BlMVWC+doEPib8n5ym/H699BJJc518mdeyLpAIZtOTnW/gtel0zeYq3/ibE0rdlAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfUPdLmsbYlmROyB5Y74Pcu+mAPN8zpwcUEvgrDdH4dpwBAL3vMCp2GtOPVe30bUSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\",\"vlek_cert\":\"MIIFIzCCAtegAwIBAgIBADBBBgkqhkiG9w0BAQowNKAPMA0GCWCGSAFlAwQCAgUAoRwwGgYJKoZIhvcNAQEIMA0GCWCGSAFlAwQCAgUAogMCATAwgYAxFDASBgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZpY2VzMRcwFQYDVQQDDA5TRVYtVkxFSy1NaWxhbjAeFw0yNjAzMDkxOTMwMDVaFw0yNzAzMDkxOTMwMDVaMHoxFDASBgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZpY2VzMREwDwYDVQQDDAhTRVYtVkxFSzB2MBAGByqGSM49AgEGBSuBBAAiA2IABE/rO0PxEkKVu5SAX9Fv+h1pF0r+wWNmNO+DLcMENz2IOaqYiS6swJjXThFjsjIx5mdy42ozh33DIC+b02LmGScVQrREUL0h5KR4Qd5+BTiO+UDBb8Xd/p8rzpTQn+foEKOB8jCB7zAQBgkrBgEEAZx4AQEEAwIBADAUBgkrBgEEAZx4AQIEBxYFTWlsYW4wEQYKKwYBBAGceAEDAQQDAgEEMBEGCisGAQQBnHgBAwIEAwIBADARBgorBgEEAZx4AQMEBAMCAQAwEQYKKwYBBAGceAEDBQQDAgEAMBEGCisGAQQBnHgBAwYEAwIBADARBgorBgEEAZx4AQMHBAMCAQAwEQYKKwYBBAGceAEDAwQDAgEdMBIGCisGAQQBnHgBAwgEBAICAN4wLAYJKwYBBAGceAEFBB8WHUNOPWNjLXVzLWVhc3QtMi5hbWF6b25hd3MuY29tMEEGCSqGSIb3DQEBCjA0oA8wDQYJYIZIAWUDBAICBQChHDAaBgkqhkiG9w0BAQgwDQYJYIZIAWUDBAICBQCiAwIBMAOCAgEAezLRKlKoxDhJ9gGLDoIhruKSWJcwMHPn6E/aJzJvpDaYfb12ACKHyiMsm5htk6+lL9Kse544pmhhUm/hxlpUNXiF+61obfKcaxp11Q2hzC/hTyLYpse6IXskLq6OH+DXzrcw0X30t3YIiUqzCGszbeTBy4uUOULxz3XbSUYFsKwsk9oMuo7isOUM3INiMiOTq91THlp6ZSVJDLIpW8v17DSL7yfJsvyLKsvtL7YjohFsOJe/qr/ttVSLC9WJmnxMxaxtgLSVGwCNTHsx6646R7SAPRVXpdOd4f+Gfj4Dk1eiELs1L85Qm0tChDLrLLO31X9cwPxg6fjdZ3sgqZrOv9Up2EiiX3uzH9pjuek9KZw8BvbNmkABURnj2QVKkANKWeVwJ2OI9xmbKnLDQp+t3Q6gTcdPdcjSsAkT0JijpzamEmIPLdBobgVHAcxCxRhBILmJWQcU8V8Rg2+n/Zs8gpuGaCj0j8s8YDq7+sgy0/5CsDgAhU7+4HqzBTPbhOCNAI9uptU6v0xoDLzldXmVJQaGWp6zQ+WB29ZnFrF4UE85+os3uIwc6uEPBjh3bjmhTwa3I7LWRWldRyoJUuLnBIdTJYVIkgrYJ47LfI3akZxUM0D+FpqawemnHOTT1z8ee1wj7wnE6nS2X0R7cJNthweU48At2ZfRIuPYvu9av2Y=\",\"timestamp\":\"2026-03-23T21:09:19Z\"}"
    }
]

async function test() {
    try {
        const proof = proofData[0] as unknown as Proof;
        // parse teeAttestation because it's a JSON string in the provided data
        if (typeof proof.teeAttestation === 'string') {
            proof.teeAttestation = JSON.parse(proof.teeAttestation);
        }

        console.log('--- Starting TEE Verification ---');
        const expectedApplicationId = "0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5";
        const verificationStatus = await verifyProof(proof)
        if (verificationStatus) {
            console.log('✅ Verification PASSED!');
        } else {
            console.log('❌ Verification FAILED!');
        }
        await verifyTeeAttestation(proof, expectedApplicationId);
        console.log('✅ TEE Verification PASSED!');
    } catch (err) {
        console.error('❌ TEE Verification FAILED');
        console.error(err);
    }
}

test();
