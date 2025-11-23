export * from './Reclaim';
export * from './utils/interfaces';
export { ClaimCreationType, ModalOptions, DeviceType, ProofPropertiesJSON } from './utils/types';
// Export device detection utilities for debugging (optional)
export { 
    getDeviceType, 
    getMobileDeviceType, 
    isMobileDevice, 
    isDesktopDevice,
    clearDeviceCache 
} from './utils/device';