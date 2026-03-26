export * from './Reclaim';
export type * from './utils/interfaces';
export type * from './utils/types';
export * from './utils/proofUtils';
export type * from './utils/proofUtils';
export * from './utils/proofValidationUtils';
export type * from './utils/proofValidationUtils';
export * from './utils/providerUtils';
export type * from './utils/providerUtils';
export * from './utils/sessionUtils';
export type * from './utils/sessionUtils';
export * from './witness';
export type * from './witness';
export { verifyTeeAttestation } from './utils/verifyTee';
export { TeeVerificationError } from './utils/errors';
// Export device detection utilities for debugging (optional)
export {
    getDeviceType,
    getMobileDeviceType,
    isMobileDevice,
    isDesktopDevice,
    clearDeviceCache
} from './utils/device';
