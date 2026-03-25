import { TextEncoder, TextDecoder } from 'util';

// Object.assign(global, { TextDecoder, TextEncoder });

const originalUint8ArrayHasInstance = Uint8Array[Symbol.hasInstance];
Object.defineProperty(Uint8Array, Symbol.hasInstance, {
    value(potentialInstance: unknown) {
        if (this === Uint8Array) {
            return Object.prototype.toString.call(potentialInstance) === '[object Uint8Array]';
        }
        return typeof originalUint8ArrayHasInstance === 'function'
            ? originalUint8ArrayHasInstance.call(this, potentialInstance)
            : potentialInstance instanceof (this as any);
    },
});

if (typeof globalThis.ReadableStream !== 'function') {
    const { ReadableStream } = require('node:stream/web');
    Object.assign(globalThis, { ReadableStream });
}

if (typeof globalThis.fetch !== 'function') {
    const { fetch, Headers, Request, Response, FormData, File, Blob } = require('undici');
    Object.assign(globalThis, { fetch, Headers, Request, Response, FormData, File, Blob });
}
