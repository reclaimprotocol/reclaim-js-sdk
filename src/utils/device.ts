import { DeviceType } from "./types";

const navigatorDefined = typeof navigator !== 'undefined';
const windowDefined = typeof window !== 'undefined';

const userAgent = navigatorDefined ? navigator.userAgent.toLowerCase() : '';
const userAgentData = navigatorDefined ? (navigator as Navigator & {
    userAgentData?: {
        platform: string;
        brands?: { brand: string; version: string }[];
    }
}).userAgentData : undefined;

// Cache for device detection results
let cachedDeviceType: DeviceType.DESKTOP | DeviceType.MOBILE | null = null;
let cachedMobileType: DeviceType.ANDROID | DeviceType.IOS | null = null;

/**
 * Safe wrapper for window.matchMedia
 */
function safeMatchMedia(query: string): boolean {
    try {
        return window.matchMedia?.(query)?.matches || false;
    } catch {
        return false;
    }
}

/**
 * Safe wrapper for CSS.supports
 */
function safeCSSSupports(property: string, value: string): boolean {
    try {
        return CSS?.supports?.(property, value) || false;
    } catch {
        return false;
    }
}

/**
 * Safe wrapper for document.querySelector
 */
function safeQuerySelector(selector: string): boolean {
    try {
        return document?.querySelector?.(selector) !== null;
    } catch {
        return false;
    }
}

/**
 * Highly accurate device type detection - returns only 'desktop' or 'mobile'
 * Uses multiple detection methods and scoring system for maximum accuracy
 * @returns {DeviceType.DESKTOP | DeviceType.MOBILE} The detected device type
 */
export function getDeviceType(): DeviceType.DESKTOP | DeviceType.MOBILE {
    // Return cached result if available
    if (cachedDeviceType !== null) {
        return cachedDeviceType;
    }

    // Early return for server-side rendering - assume desktop
    if (!navigatorDefined || !windowDefined) {
        return DeviceType.DESKTOP;
    }

    let mobileScore = 0;
    const CONFIDENCE_THRESHOLD = 3; // Need at least 3 points to be considered mobile
    
    // ====== Device Characteristics ======
    
    // Screen dimensions
    const screenWidth = window.innerWidth || window.screen?.width || 0;
    const screenHeight = window.innerHeight || window.screen?.height || 0;
    const hasSmallScreen = screenWidth <= 480 || screenHeight <= 480;
    const hasLargeScreen = screenWidth > 1024 && screenHeight > 768;
    
    // Touch capabilities
    const hasTouch = 'ontouchstart' in window || 
                    (navigatorDefined && navigator.maxTouchPoints > 0);
    const hasPreciseMouse = safeMatchMedia('(pointer: fine)');
    const canHover = safeMatchMedia('(hover: hover)');
    const hasMouseAndTouch = hasTouch && hasPreciseMouse; // Touchscreen laptop
    
    // Windows touch laptop detection (used for exceptions)
    const isWindowsTouchLaptop = /Windows/i.test(userAgent) && 
                                hasPreciseMouse && 
                                hasTouch;
    
    // ====== Mobile Indicators (Add Points) ======
    
    // Touch without mouse = likely mobile (+2 points)
    // Touch with mouse = touchscreen laptop (+1 point)
    if (hasTouch && !hasMouseAndTouch) {
        mobileScore += 2;
    } else if (hasMouseAndTouch) {
        mobileScore += 1;
    }
    
    // Small screen is mobile indicator (+2 points)
    // Exception: Windows touch laptops with precise mouse should not be penalized for small screens
    if (hasSmallScreen && !isWindowsTouchLaptop) {
        mobileScore += 2;
    }
    
    // Mobile user agent is strong indicator (+3 points)
    const hasMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    if (hasMobileUserAgent) {
        mobileScore += 3;
    }
    
    // Mobile APIs only count if combined with other mobile signs (+2 points)
    // Exception: Desktop Safari and Windows touch laptops have mobile APIs but should not be considered mobile
    const hasMobileAPIs = 'orientation' in window || 
                         'DeviceMotionEvent' in window ||
                         'DeviceOrientationEvent' in window;
    const isDesktopSafari = /Safari/i.test(userAgent) && 
                           !/Mobile/i.test(userAgent) && 
                           /Mac|Intel/i.test(userAgent);
    if (hasMobileAPIs && (hasSmallScreen || hasMobileUserAgent) && !isDesktopSafari && !isWindowsTouchLaptop) {
        mobileScore += 2;
    }
    
    // High DPI with small screen = mobile (+1 point)
    const hasHighDPI = window.devicePixelRatio > 1.5;
    if (hasHighDPI && hasSmallScreen) {
        mobileScore += 1;
    }
    
    // Viewport meta tag with small screen = mobile optimized (+1 point)
    const hasViewportMeta = safeQuerySelector('meta[name="viewport"]');
    if (hasViewportMeta && hasSmallScreen) {
        mobileScore += 1;
    }
    
    // iPad Pro special case: Mac user agent with touch (+2 points)
    const isPadProInDesktopMode = userAgent.includes('macintosh') && hasTouch;
    if (isPadProInDesktopMode) {
        mobileScore += 2;
    }
    
    // ====== Desktop Indicators (Subtract Points) ======
    
    // Large screen with mouse = desktop (-3 points)
    if (hasLargeScreen && hasPreciseMouse) {
        mobileScore -= 3;
    } 
    // Large screen without touch = desktop (-2 points)
    else if (hasLargeScreen && !hasTouch) {
        mobileScore -= 2;
    }
    
    // Can hover with precise pointer = has real mouse (-2 points)
    if (hasPreciseMouse && canHover) {
        mobileScore -= 2;
    }
    
    // Windows user agent = strong desktop indicator (-3 points)
    const isWindowsDesktop = /Windows/i.test(userAgent) && !hasMobileUserAgent;
    if (isWindowsDesktop) {
        mobileScore -= 3;
    }

    // Cache and return the result
    cachedDeviceType = mobileScore >= CONFIDENCE_THRESHOLD ? DeviceType.MOBILE : DeviceType.DESKTOP;
    return cachedDeviceType;
}

/**
 * Highly accurate mobile device type detection - returns only 'android' or 'ios'
 * Should only be called when getDeviceType() returns 'mobile'
 * @returns {DeviceType.ANDROID | DeviceType.IOS} The detected mobile device type
 */
export function getMobileDeviceType(): DeviceType.ANDROID | DeviceType.IOS {
    // Return cached result if available
    if (cachedMobileType !== null) {
        return cachedMobileType;
    }

    // Early return for server-side rendering - default to Android
    if (!navigatorDefined || !windowDefined) {
        return DeviceType.ANDROID;
    }

    const ua = navigator.userAgent;
    
    // ====== iOS Detection ======
    
    // Direct iOS device detection
    const hasIOSDeviceName = /iPad|iPhone|iPod/i.test(ua);
    if (hasIOSDeviceName) {
        cachedMobileType = DeviceType.IOS;
        return cachedMobileType;
    }
    
    // iPad Pro detection (reports as Mac but has touch)
    const isMacWithTouch = /Macintosh|MacIntel/i.test(ua) && 'ontouchstart' in window;
    const isMacOSWithTouch = userAgentData?.platform === 'macOS' && 'ontouchstart' in window;
    if (isMacWithTouch || isMacOSWithTouch) {
        cachedMobileType = DeviceType.IOS;
        return cachedMobileType;
    }
    
    // iOS-specific APIs
    const hasIOSPermissionAPI = typeof (window as any).DeviceMotionEvent?.requestPermission === 'function';
    const hasIOSTouchCallout = safeCSSSupports('-webkit-touch-callout', 'none');
    if (hasIOSPermissionAPI || hasIOSTouchCallout) {
        cachedMobileType = DeviceType.IOS;
        return cachedMobileType;
    }
    
    // Safari without Chrome (iOS WebKit) - but not desktop Safari
    const isIOSWebKit = /WebKit/i.test(ua) && 
                       !/Chrome|CriOS|Android/i.test(ua) && 
                       !/Macintosh|MacIntel/i.test(ua);
    if (isIOSWebKit) {
        cachedMobileType = DeviceType.IOS;
        return cachedMobileType;
    }
    
    // ====== Android Detection ======
    
    // Direct Android detection
    const hasAndroidKeyword = /Android/i.test(ua);
    if (hasAndroidKeyword) {
        cachedMobileType = DeviceType.ANDROID;
        return cachedMobileType;
    }
    
    // Mobile Chrome (usually Android)
    const isChromeOnMobile = (window as any).chrome && /Mobile/i.test(ua);
    if (isChromeOnMobile) {
        cachedMobileType = DeviceType.ANDROID;
        return cachedMobileType;
    }
    
    // Default fallback - Android is more common globally
    cachedMobileType = DeviceType.ANDROID;
    return cachedMobileType;
}

/**
 * Convenience method to check if current device is mobile
 * @returns {boolean} True if device is mobile
 */
export function isMobileDevice(): boolean {
    return getDeviceType() === DeviceType.MOBILE;
}

/**
 * Convenience method to check if current device is desktop
 * @returns {boolean} True if device is desktop
 */
export function isDesktopDevice(): boolean {
    return getDeviceType() === DeviceType.DESKTOP;
}

/**
 * Clear cached device detection results (useful for testing)
 */
export function clearDeviceCache(): void {
    cachedDeviceType = null;
    cachedMobileType = null;
}

// Export safe wrappers for testing
export { safeMatchMedia, safeCSSSupports, safeQuerySelector };