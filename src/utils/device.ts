// * There isn't a uniform/universal way to detect if the user is browsing a webpage from a mobile device, but this seems to work most of the time and might be enough for our case.
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
const windowDefined = typeof window !== 'undefined';

export const userAgentIsAndroid = userAgent.includes("android");

const isIPadOS13Plus = windowDefined && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

export const userAgentIsIOS = /iphone|ipad|ipod/i.test(userAgent) || isIPadOS13Plus;
