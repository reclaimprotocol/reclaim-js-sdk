import { ReclaimProofRequest } from "../../Reclaim";
import { ClaimCreationType } from "../types";
import { validateSignature } from "../validationUtils";
import { mockFetch } from "./mock-fetch";

const testAppId = '0x9323eFec99973623932Db45438DCE4dEa9D9aE4c';
const testAppSecret = '37e1d9da2f551ce0dac7e0eeda8a9e00daf62a3a3c548ed98cc80fc1a3983ad6';

describe('Request', () => {
    it('should serialize to JSON correctly', async () => {
        globalThis.fetch = mockFetch({
            sessionId: '123',
            resolvedProviderVersion: '1.0.0'
        });

        const testProviderId = 'example';

        const request = await ReclaimProofRequest.init(
            testAppId,
            testAppSecret,
            testProviderId,
            {
                log: true,
                acceptAiProviders: false,
                useAppClip: false,
                customSharePageUrl: 'https://portal.reclaimprotocol.org',
                launchOptions: {
                    canUseDeferredDeepLinksFlow: true,
                },
                canAutoSubmit: false,
                preferredLocale: 'zh-Hant-HK',
                metadata: {
                    'theme': 'dark'
                }
            });

        request.setAppCallbackUrl('https://api.example.com/success?session=def');
        request.setCancelCallbackUrl('https://api.example.com/cancel?session=def');
        request.setRedirectUrl('https://example.com/success?session=def');
        request.setCancelRedirectUrl('https://example.com/cancelled?session=def');

        request.setJsonContext({ 'user': 'john@example.com' });

        request.setClaimCreationType(ClaimCreationType.STANDALONE);

        request.setParams({ 'user': 'john@example.com' });

        const actualOutput = JSON.parse(request.toJsonString());

        const expectedOutput = {
            "applicationId": "0x9323eFec99973623932Db45438DCE4dEa9D9aE4c",
            "providerId": "example",
            "sessionId": "123",
            "context": {
                "user": "john@example.com"
            },
            "appCallbackUrl": "https://api.example.com/success?session=def",
            "claimCreationType": "createClaim",
            "parameters": {
                "user": "john@example.com"
            },
            "signature": actualOutput.signature,
            "redirectUrl": "https://example.com/success?session=def",
            "redirectUrlOptions": {
                "method": "GET",
            },
            "cancelCallbackUrl": "https://api.example.com/cancel?session=def",
            "cancelRedirectUrl": "https://example.com/cancelled?session=def",
            "cancelRedirectUrlOptions": {
                "method": "GET",
            },
            "timestamp": actualOutput.timestamp,
            "timeStamp": actualOutput.timeStamp,
            "options": {
                "log": true,
                "acceptAiProviders": false,
                "useAppClip": false,
                "customSharePageUrl": "https://portal.reclaimprotocol.org",
                "launchOptions": {
                    "canUseDeferredDeepLinksFlow": true
                },
                "canAutoSubmit": false,
                "preferredLocale": "zh-Hant-HK",
                "metadata": {
                    "theme": "dark"
                },
                "useBrowserExtension": true
            },
            // this can change in future
            "sdkVersion": actualOutput.sdkVersion,
            "jsonProofResponse": false,
            "resolvedProviderVersion": "1.0.0"
        };

        expect(actualOutput.applicationId).toEqual(testAppId);
        expect(validateSignature(testProviderId, actualOutput.signature, actualOutput.applicationId, actualOutput.timestamp)).toBeUndefined();
        expect(actualOutput).toEqual(expectedOutput);
    });

    it('should create request from JSON correctly', async () => {
        const originalRequest = {
            "applicationId": "0x9323eFec99973623932Db45438DCE4dEa9D9aE4c",
            "providerId": "example",
            "sessionId": "123",
            "context": {
                "user": "john@example.com"
            },
            "appCallbackUrl": "https://api.example.com/success?session=def",
            "claimCreationType": "createClaim",
            "parameters": {
                "user": "john@example.com"
            },
            "signature": "0xbbf1aad7bd65c6d0c37a5b6012c4dff217e190372d5e364bf8f2bf4ea9df3a080ec8b325b84b29e130d9b15401087b36bc4852367c8f93427c39ffb7b44b498d1c",
            "redirectUrl": "https://example.com/success?session=def",
            "redirectUrlOptions": {
                "method": "GET",
            },
            "cancelCallbackUrl": "https://api.example.com/cancel?session=def",
            "cancelRedirectUrl": "https://example.com/cancelled?session=def",
            "timestamp": "1769867597546",
            "timeStamp": "1769867597546",
            "options": {
                "log": true,
                "acceptAiProviders": false,
                "useAppClip": false,
                "customSharePageUrl": "https://portal.reclaimprotocol.org",
                "launchOptions": {
                    "canUseDeferredDeepLinksFlow": true
                },
                "canAutoSubmit": false,
                "preferredLocale": "zh-Hant-HK",
                "metadata": {
                    "theme": "dark"
                },
                "useBrowserExtension": true
            },
            "sdkVersion": "js-4.10.0",
            "jsonProofResponse": false,
            "resolvedProviderVersion": "1.0.0"
        };
        const request = await ReclaimProofRequest.fromJsonString(JSON.stringify(originalRequest));
        const requestJson = JSON.parse(request.toJsonString());

        // this can change in future
        requestJson.sdkVersion = originalRequest.sdkVersion;

        expect(requestJson).toEqual(originalRequest);
    });
});