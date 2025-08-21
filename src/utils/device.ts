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

/**
 * Highly accurate device type detection - returns only 'desktop' or 'mobile'
 * Uses multiple detection methods and scoring system for maximum accuracy
 * @returns {DeviceType.DESKTOP | DeviceType.MOBILE} The detected device type
 */
export function getDeviceType(): DeviceType.DESKTOP | DeviceType.MOBILE {
    const navigatorDefined = typeof navigator !== "undefined";
    const windowDefined = typeof window !== "undefined";
    const documentDefined = typeof document !== "undefined";
    const userAgent = navigatorDefined ? (navigator.userAgent || "").toLowerCase() : "";

    // Early return for SSR
    if (!navigatorDefined || !windowDefined || !documentDefined) {
        return DeviceType.DESKTOP;
    }

    let mobileScore = 0;
    const CONFIDENCE_THRESHOLD = 4; // stricter to avoid touch-laptop false positives

    // 1) Touch capability (weight: 3)
    const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
        mobileScore += 3;
    }

    // 2) User agent (weight: 3)
    const mobileUserAgentPattern = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    if (mobileUserAgentPattern.test(userAgent)) {
        mobileScore += 3;
    }

    // 3) Client Hints: navigator.userAgentData.mobile (weight: 3)
    const uaDataMobile = (navigator as any)?.userAgentData?.mobile;
    if (uaDataMobile === true) mobileScore += 3;


    // 4) Mobile-specific APIs (weight: 2)
    const hasMobileAPIs = ("orientation" in window) ||
        ("DeviceMotionEvent" in window) ||
        ("DeviceOrientationEvent" in window);
    if (hasMobileAPIs) {
        mobileScore += 2;
    }

    // 5) Device pixel ratio for mobile devices (weight: 1)
    const hasHighDPI = window.devicePixelRatio > 1.5;
    if (hasHighDPI && isTouchDevice) {
        mobileScore += 1;
    }

    // 6) Mobile-specific browser features (weight: 2)
    const hasMobileFeatures = ("ontouchstart" in document.documentElement) ||
        ("onorientationchange" in window) ||
        (navigator.maxTouchPoints > 1);
    if (hasMobileFeatures) {
        mobileScore += 2;
    }

    // 7) hasPointer: desktops usually have fine pointer (negative weight)
    const hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (hasFinePointer && !isTouchDevice) {
        mobileScore -= 2;
    }

    // 8) Battery API (mobile-leaning signal) (weight: 1)
    if (("getBattery" in navigator) || ("battery" in navigator)) {
        mobileScore += 1;
    }

    // 9) isPadWithKeyboard (iPadOS reports "Macintosh" + touch) (weight: 2)
    const isPadWithKeyboard = userAgent.includes("macintosh") && isTouchDevice;
    if (isPadWithKeyboard) {
        mobileScore += 2;
    }

    // 10) Mobile-specific viewport behavior (weight: 1)
    const hasViewportMeta = document.querySelector('meta[name="viewport"]') !== null;
    if (hasViewportMeta && isTouchDevice) {
        mobileScore += 1;
    }

    return mobileScore >= CONFIDENCE_THRESHOLD ? DeviceType.MOBILE : DeviceType.DESKTOP;
}

/**
 * Highly accurate mobile device type detection - returns only 'android' or 'ios'
 * Should only be called when getDeviceType() returns 'mobile'
 * @returns {DeviceType.ANDROID | DeviceType.IOS} The detected mobile device type
 */
export function getMobileDeviceType(): DeviceType.ANDROID | DeviceType.IOS {
    // Early return for server-side rendering - default to Android
    if (!navigatorDefined || !windowDefined) {
        return DeviceType.ANDROID;
    }

    const ua = navigator.userAgent;

    // Strategy 1: Direct iOS detection using comprehensive regex
    const iosPattern = /iPad|iPhone|iPod/i;
    if (iosPattern.test(ua)) {
        return DeviceType.IOS;
    }

    // Strategy 2: Direct Android detection
    const androidPattern = /Android/i;
    if (androidPattern.test(ua)) {
        return DeviceType.ANDROID;
    }

    // Strategy 3: iPad Pro masquerading as Mac detection
    const isMacWithTouch = /Macintosh|MacIntel/i.test(ua) && 'ontouchstart' in window;
    if (isMacWithTouch) {
        return DeviceType.IOS;
    }

    // Strategy 4: Modern iPad detection using userAgentData
    if (userAgentData?.platform === 'macOS' && 'ontouchstart' in window) {
        return DeviceType.IOS;
    }

    // Strategy 5: iOS-specific API detection
    if (typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
        return DeviceType.IOS;
    }

    // Strategy 6: CSS property detection for iOS
    if (typeof CSS !== 'undefined' && CSS.supports?.('-webkit-touch-callout', 'none')) {
        return DeviceType.IOS;
    }

    // Strategy 7: WebKit without Chrome/Android indicates iOS Safari
    const isIOSWebKit = /WebKit/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua);
    if (isIOSWebKit) {
        return DeviceType.IOS;
    }

    // Strategy 8: Chrome detection for Android (when Android not explicitly found)
    const isChromeOnMobile = (window as any).chrome && /Mobile/i.test(ua);
    if (isChromeOnMobile && !iosPattern.test(ua)) {
        return DeviceType.ANDROID;
    }

    // Strategy 9: Check for mobile-specific patterns that indicate Android
    const androidMobilePattern = /Mobile.*Android|Android.*Mobile/i;
    if (androidMobilePattern.test(ua)) {
        return DeviceType.ANDROID;
    }

    // Strategy 10: Fallback using existing regex patterns
    const mobilePattern = /webos|blackberry|iemobile|opera mini/i;
    if (mobilePattern.test(ua)) {
        // These are typically Android-based or Android-like
        return DeviceType.ANDROID;
    }

    // Default fallback - Android is more common globally
    return DeviceType.ANDROID;
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