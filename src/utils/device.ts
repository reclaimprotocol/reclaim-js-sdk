import { DeviceType } from "./types";

const navigatorDefined = typeof navigator !== 'undefined';
const windowDefined = typeof window !== 'undefined';

const userAgent = navigatorDefined ? navigator.userAgent.toLowerCase() : '';
const userAgentData = navigatorDefined ? (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData : undefined;

export const userAgentIsAndroid = userAgent.includes(DeviceType.ANDROID);

const isIpad =
    windowDefined &&
    navigatorDefined &&
    (userAgentData?.platform === DeviceType.IPAD || userAgent.includes(DeviceType.IPAD));

export const userAgentIsIOS =
    new RegExp(`${DeviceType.IOS}|ipod`, 'i').test(userAgent) || isIpad;

export const userAgentIsMobile =
    new RegExp(`${DeviceType.ANDROID}|webos|${DeviceType.IOS}|${DeviceType.IPAD}|ipod|blackberry|iemobile|opera mini`, 'i').test(userAgent) ||
    (windowDefined && 'orientation' in window);