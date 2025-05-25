const navigatorDefined = typeof navigator !== 'undefined';
const windowDefined = typeof window !== 'undefined';

const userAgent = navigatorDefined ? navigator.userAgent.toLowerCase() : '';
const userAgentData = navigatorDefined ? (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData : undefined;

export const userAgentIsAndroid = userAgent.includes("android");

const isIpad =
  windowDefined &&
  navigatorDefined &&
  (userAgentData?.platform === 'iPad' || userAgent.includes('ipad'));

export const userAgentIsIOS =
  /iphone|ipod/i.test(userAgent) || isIpad;

export const userAgentIsMobile =
  /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
  (windowDefined && 'orientation' in window);
