import { ReclaimProofRequest } from "../../Reclaim";
import { ClaimCreationType } from "../types";
import { validateSignature } from "../validationUtils";
import { mockFetch, mockFetchBy } from "./mock-fetch";

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
                "reclaimSessionId": "123",
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
                "reclaimSessionId": "123",
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

    it('should default to portal URL and useAppClip false when no options provided', async () => {
        globalThis.fetch = mockFetch({
            sessionId: '999',
            resolvedProviderVersion: '1.0.0'
        });

        const request = await ReclaimProofRequest.init(
            testAppId,
            testAppSecret,
            'example'
        );

        const output = JSON.parse(request.toJsonString());
        expect(output.options.customSharePageUrl).toEqual('https://portal.reclaimprotocol.org');
        expect(output.options.useAppClip).toEqual(false);
    });

    describe('portalUrl alias', () => {
        const initMock = { sessionId: '456', resolvedProviderVersion: '1.0.0' };

        const initWith = (opts: Record<string, string>) =>
            ReclaimProofRequest.init(testAppId, testAppSecret, 'example', opts as any);

        beforeEach(() => {
            globalThis.fetch = mockFetch(initMock);
        });

        it('syncs to customSharePageUrl in serialized output', async () => {
            const request = await initWith({ portalUrl: 'https://portal.reclaimprotocol.org' });
            const output = JSON.parse(request.toJsonString());

            expect(output.options.customSharePageUrl).toEqual('https://portal.reclaimprotocol.org');
            expect(output.options.portalUrl).toEqual('https://portal.reclaimprotocol.org');
        });

        it('survives round-trip through fromJsonString', async () => {
            const request = await initWith({ portalUrl: 'https://custom-portal.example.com' });
            const restored = await ReclaimProofRequest.fromJsonString(request.toJsonString());
            const output = JSON.parse(restored.toJsonString());

            expect(output.options.customSharePageUrl).toEqual('https://custom-portal.example.com');
            expect(output.options.portalUrl).toEqual('https://custom-portal.example.com');
        });

        it('default portal URL survives round-trip', async () => {
            // init with no portalUrl/customSharePageUrl → default applied
            const request = await ReclaimProofRequest.init(testAppId, testAppSecret, 'example');
            const json = request.toJsonString();
            const restored = await ReclaimProofRequest.fromJsonString(json);
            const output = JSON.parse(restored.toJsonString());

            expect(output.options.customSharePageUrl).toEqual('https://portal.reclaimprotocol.org');
        });

        it('takes precedence over customSharePageUrl', async () => {
            const request = await initWith({
                customSharePageUrl: 'https://old.example.com',
                portalUrl: 'https://new.example.com',
            });
            const output = JSON.parse(request.toJsonString());

            expect(output.options.customSharePageUrl).toEqual('https://new.example.com');
        });
    });

    describe('verificationMode', () => {
        beforeEach(() => {
            globalThis.fetch = mockFetch({
                sessionId: '789',
                resolvedProviderVersion: '1.0.0'
            });
        });

        it('should default verificationMode to portal in launchOptions', async () => {
            const request = await ReclaimProofRequest.init(
                testAppId,
                testAppSecret,
                'example'
            );

            const output = JSON.parse(request.toJsonString());
            // launchOptions not set — verificationMode resolved at call time, not in options
            expect(output.options.launchOptions).toBeUndefined();
        });

        it('should serialize verificationMode in launchOptions', async () => {
            const request = await ReclaimProofRequest.init(
                testAppId,
                testAppSecret,
                'example',
                {
                    launchOptions: { verificationMode: 'app' }
                }
            );

            const output = JSON.parse(request.toJsonString());
            expect(output.options.launchOptions.verificationMode).toEqual('app');
        });

        it('should round-trip verificationMode through fromJsonString', async () => {
            const request = await ReclaimProofRequest.init(
                testAppId,
                testAppSecret,
                'example',
                {
                    launchOptions: { verificationMode: 'app' }
                }
            );

            const restored = await ReclaimProofRequest.fromJsonString(request.toJsonString());
            const output = JSON.parse(restored.toJsonString());
            expect(output.options.launchOptions.verificationMode).toEqual('app');
        });

        it('getRequestUrl should return portal URL by default', async () => {
            let capturedUrl = '';
            const request = await ReclaimProofRequest.init(testAppId, testAppSecret, 'example');
            globalThis.fetch = mockFetchBy((url) => {
                if (url.includes('shortener')) {
                    // capture the body isn't available, but the shortener is called after building the full URL
                    // return error to fall back to full URL
                    return { error: true };
                }
                return { success: true };
            });

            const url = await request.getRequestUrl();
            expect(url).toContain('portal.reclaimprotocol.org');
            expect(url).not.toContain('share.reclaimprotocol.org');
        });

        it('getRequestUrl with verificationMode app should return share page URL', async () => {
            const request = await ReclaimProofRequest.init(testAppId, testAppSecret, 'example');
            globalThis.fetch = mockFetchBy((url) => {
                if (url.includes('shortener')) {
                    return { error: true };
                }
                return { success: true };
            });

            const url = await request.getRequestUrl({ verificationMode: 'app' });
            expect(url).toContain('share.reclaimprotocol.org');
            expect(url).not.toContain('portal.reclaimprotocol.org');
        });

        it('should preserve useAppClip alongside verificationMode', async () => {
            const request = await ReclaimProofRequest.init(
                testAppId,
                testAppSecret,
                'example',
                {
                    useAppClip: true,
                    launchOptions: { verificationMode: 'app' }
                }
            );

            const output = JSON.parse(request.toJsonString());
            expect(output.options.useAppClip).toEqual(true);
            expect(output.options.launchOptions.verificationMode).toEqual('app');
        });
    });
});