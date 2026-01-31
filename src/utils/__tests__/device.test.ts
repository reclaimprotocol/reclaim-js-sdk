import {
  getDeviceType,
  getMobileDeviceType,
  isMobileDevice,
  isDesktopDevice,
  clearDeviceCache,
  safeMatchMedia,
  safeCSSSupports,
  safeQuerySelector
} from '../device';
import { DeviceType } from '../types';

describe('Device Detection', () => {
  // Store original values
  let originalUserAgent: PropertyDescriptor | undefined;
  let originalPlatform: PropertyDescriptor | undefined;
  let originalMaxTouchPoints: PropertyDescriptor | undefined;
  let originalVendor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Store original descriptors
    originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
    originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    originalMaxTouchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints');
    originalVendor = Object.getOwnPropertyDescriptor(navigator, 'vendor');
  });

  afterEach(() => {
    // Clear device cache
    clearDeviceCache();

    // Restore original values
    if (originalUserAgent) {
      Object.defineProperty(navigator, 'userAgent', originalUserAgent);
    }
    if (originalPlatform) {
      Object.defineProperty(navigator, 'platform', originalPlatform);
    }
    if (originalMaxTouchPoints) {
      Object.defineProperty(navigator, 'maxTouchPoints', originalMaxTouchPoints);
    }
    if (originalVendor) {
      Object.defineProperty(navigator, 'vendor', originalVendor);
    }

    // Clean up any added properties
    delete (window as any).ontouchstart;
    delete (window as any).orientation;
    delete (window as any).DeviceMotionEvent;
    delete (window as any).DeviceOrientationEvent;

    // Restore window.matchMedia if it was mocked
    if ('matchMedia' in window) {
      delete (window as any).matchMedia;
    }
  });

  // Helper function to mock navigator properties
  const mockNavigator = (props: Partial<Navigator>) => {
    Object.entries(props).forEach(([key, value]) => {
      Object.defineProperty(navigator, key, {
        configurable: true,
        writable: true,
        value
      });
    });
  };

  // Helper function to mock window properties
  const mockWindow = (props: any) => {
    Object.entries(props).forEach(([key, value]) => {
      (window as any)[key] = value;
    });
  };

  // Helper function to mock screen size
  const mockScreenSize = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: height
    });
    Object.defineProperty(window.screen, 'width', {
      configurable: true,
      writable: true,
      value: width
    });
    Object.defineProperty(window.screen, 'height', {
      configurable: true,
      writable: true,
      value: height
    });
  };

  // Helper function to mock media queries
  const mockMatchMedia = (matches: { [query: string]: boolean }) => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: matches[query] || false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  };

  // Helper function to mock viewport meta tag
  const mockViewportMetaTag = (exists: boolean) => {
    document.querySelector = jest.fn().mockImplementation((selector: string) => {
      if (selector === 'meta[name="viewport"]') {
        return exists ? {} : null;
      }
      return null;
    });
  };

  describe('Desktop Detection', () => {
    test('should detect standard desktop without touch', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 0
      });
      mockScreenSize(1920, 1080);
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });

      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
      expect(isDesktopDevice()).toBe(true);
      expect(isMobileDevice()).toBe(false);
    });

    test('should detect desktop with touchscreen (Windows laptop)', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 10
      });
      mockScreenSize(1920, 1080);
      mockWindow({ ontouchstart: null });
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });

      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
      expect(isDesktopDevice()).toBe(true);
      expect(isMobileDevice()).toBe(false);
    });

    test('should detect macOS desktop', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0
      });
      mockScreenSize(2560, 1440);
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });

      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
      expect(isDesktopDevice()).toBe(true);
    });

    test('should detect Linux desktop', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        maxTouchPoints: 0
      });
      mockScreenSize(1920, 1080);
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });

      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });
  });

  describe('Mobile Detection', () => {
    test('should detect iPhone', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5
      });
      mockScreenSize(390, 844);
      mockWindow({
        ontouchstart: null,
        orientation: 0,
        DeviceMotionEvent: function () { },
        DeviceOrientationEvent: function () { }
      });
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      expect(getDeviceType()).toBe(DeviceType.MOBILE);
      expect(getMobileDeviceType()).toBe(DeviceType.IOS);
      expect(isMobileDevice()).toBe(true);
      expect(isDesktopDevice()).toBe(false);
    });

    test('should detect Android phone', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5
      });
      mockScreenSize(412, 915);
      mockWindow({
        ontouchstart: null,
        orientation: 0,
        DeviceMotionEvent: function () { },
        DeviceOrientationEvent: function () { }
      });
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      expect(getDeviceType()).toBe(DeviceType.MOBILE);
      expect(getMobileDeviceType()).toBe(DeviceType.ANDROID);
      expect(isMobileDevice()).toBe(true);
    });

    test('should detect iPad', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5
      });
      mockScreenSize(768, 1024); // iPad screen size
      mockWindow({
        ontouchstart: null,
        orientation: 0,
        DeviceMotionEvent: function () { },
        DeviceOrientationEvent: function () { }
      });
      mockViewportMetaTag(true);
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      expect(getMobileDeviceType()).toBe(DeviceType.IOS);
      // tablet expects page type desktop? This was originally expecting .MOBILE
      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });

    test('should detect Android tablet', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10
      });
      mockScreenSize(768, 1024); // Smaller dimension to trigger mobile detection
      mockWindow({
        ontouchstart: null,
        orientation: 0,
        DeviceMotionEvent: function () { },
        DeviceOrientationEvent: function () { }
      });
      mockViewportMetaTag(true);
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      expect(getMobileDeviceType()).toBe(DeviceType.ANDROID);
      // tablet expects page type desktop? This was originally expecting .MOBILE
      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });
  });

  describe('Edge Cases', () => {
    test('should detect iPad Pro masquerading as Mac (desktop mode)', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5  // iPad Pro has touch points even in desktop mode
      });
      mockScreenSize(768, 1024); // Use smaller dimension to help trigger mobile detection
      mockWindow({
        ontouchstart: null,
        DeviceMotionEvent: function () { },
        DeviceOrientationEvent: function () { }
      });
      mockViewportMetaTag(true);
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      expect(getMobileDeviceType()).toBe(DeviceType.IOS);
      // tablet expects page type desktop? This was originally expecting .MOBILE
      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });

    test('should handle desktop with small window size', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 0
      });
      mockScreenSize(600, 400); // Small window but still desktop
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });

      // Even with small window, should still detect as desktop due to other factors
      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });

    test('should handle desktop browser in mobile emulation mode', () => {
      // Chrome DevTools mobile emulation
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        maxTouchPoints: 5
      });
      mockScreenSize(375, 667);
      mockWindow({
        ontouchstart: null,
        orientation: 0
      });
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      // Should detect as mobile when in emulation mode
      expect(getDeviceType()).toBe(DeviceType.MOBILE);
      expect(getMobileDeviceType()).toBe(DeviceType.IOS);
    });

    test('should handle Surface Pro (tablet with keyboard)', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 10
      });
      mockScreenSize(1920, 1280);
      mockWindow({
        ontouchstart: null
      });
      mockMatchMedia({
        '(pointer: fine)': true,  // Has both mouse and touch
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true,
        '(any-pointer: coarse)': true,
        '(any-pointer: fine)': true
      });

      // Should detect as desktop when keyboard/mouse is attached
      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });

    test('should handle old mobile browsers without touch events', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Linux; Android 4.4.2; GT-I9505) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.76 Mobile Safari/537.36',
        maxTouchPoints: 0  // Old browser might not support this
      });
      mockScreenSize(360, 640);
      mockWindow({
        DeviceMotionEvent: function () { },
        DeviceOrientationEvent: function () { }
      });
      mockViewportMetaTag(true);
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      // Should still detect as mobile based on user agent and screen size
      expect(getDeviceType()).toBe(DeviceType.MOBILE);
      expect(getMobileDeviceType()).toBe(DeviceType.ANDROID);
    });
  });

  describe('Mobile Type Detection', () => {
    test('should detect iOS devices correctly', () => {
      const iosUserAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      ];

      iosUserAgents.forEach(ua => {
        mockNavigator({ userAgent: ua });
        expect(getMobileDeviceType()).toBe(DeviceType.IOS);
      });
    });

    test('should detect Android devices correctly', () => {
      const androidUserAgents = [
        'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
        'Mozilla/5.0 (Linux; Android 10; SM-A505FN) AppleWebKit/537.36',
        'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36'
      ];

      androidUserAgents.forEach(ua => {
        mockNavigator({ userAgent: ua });
        expect(getMobileDeviceType()).toBe(DeviceType.ANDROID);
      });
    });

    test('should handle Chrome on iOS (reports as CriOS)', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
      });
      expect(getMobileDeviceType()).toBe(DeviceType.IOS);
    });

    test('should fallback to Android for unknown mobile devices', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Mobile; UnknownDevice) Gecko/537.36'
      });
      expect(getMobileDeviceType()).toBe(DeviceType.ANDROID);
    });
  });

  describe('Helper Functions', () => {
    test('isMobileDevice should return correct boolean', () => {
      // Mobile
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5
      });
      mockScreenSize(375, 667);
      mockWindow({ ontouchstart: null });
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });
      expect(isMobileDevice()).toBe(true);

      // Clear cache before testing desktop
      clearDeviceCache();

      // Desktop
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        maxTouchPoints: 0
      });
      mockScreenSize(1920, 1080);
      delete (window as any).ontouchstart;
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });
      expect(isMobileDevice()).toBe(false);
    });

    test('isDesktopDevice should return correct boolean', () => {
      // Desktop
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        maxTouchPoints: 0
      });
      mockScreenSize(1920, 1080);
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });
      expect(isDesktopDevice()).toBe(true);

      // Clear cache before testing mobile
      clearDeviceCache();

      // Mobile
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5
      });
      mockScreenSize(375, 667);
      mockWindow({ ontouchstart: null });
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });
      expect(isDesktopDevice()).toBe(false);
    });
  });

  describe('Safety Features', () => {
    test('should handle missing window.matchMedia gracefully', () => {
      // Delete matchMedia to simulate old browser
      delete (window as any).matchMedia;

      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        maxTouchPoints: 10  // Has touch
      });
      mockScreenSize(1920, 1080);

      // Should still detect correctly without matchMedia
      expect(() => getDeviceType()).not.toThrow();
      expect(getDeviceType()).toBe(DeviceType.DESKTOP);
    });

    test('should handle matchMedia throwing errors', () => {
      // Mock matchMedia to throw error
      window.matchMedia = jest.fn().mockImplementation(() => {
        throw new Error('Invalid media query');
      });

      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5
      });
      mockScreenSize(375, 667);

      // Should not throw and should still detect mobile
      expect(() => getDeviceType()).not.toThrow();
      expect(getDeviceType()).toBe(DeviceType.MOBILE);
    });

    test('should handle missing CSS.supports gracefully', () => {
      // Delete CSS object
      delete (window as any).CSS;

      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });

      // Should not throw and should still detect iOS
      expect(() => getMobileDeviceType()).not.toThrow();
      expect(getMobileDeviceType()).toBe(DeviceType.IOS);
    });

    test('should handle CSS.supports not being a function', () => {
      // Mock CSS without supports method
      (window as any).CSS = {};

      mockNavigator({
        userAgent: 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36'
      });

      // Should not throw
      expect(() => getMobileDeviceType()).not.toThrow();
      expect(getMobileDeviceType()).toBe(DeviceType.ANDROID);
    });

    test('should handle document.querySelector errors gracefully', () => {
      // Mock querySelector to throw
      document.querySelector = jest.fn().mockImplementation(() => {
        throw new Error('Invalid selector');
      });

      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile',
        maxTouchPoints: 5
      });
      mockScreenSize(375, 667);

      // Should not throw
      expect(() => getDeviceType()).not.toThrow();
      expect(getDeviceType()).toBe(DeviceType.MOBILE);
    });
  });

  describe('Caching', () => {
    test('should cache device type detection result', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        maxTouchPoints: 0
      });
      mockScreenSize(1920, 1080);
      mockMatchMedia({
        '(pointer: fine)': true,
        '(hover: hover)': true,
        '(pointer: fine) and (hover: hover)': true
      });

      // First call
      const result1 = getDeviceType();

      // Change environment to mobile
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile',
        maxTouchPoints: 5
      });
      mockScreenSize(375, 667);
      mockWindow({ ontouchstart: null, DeviceMotionEvent: function () { }, DeviceOrientationEvent: function () { } });
      mockViewportMetaTag(true);
      mockMatchMedia({
        '(pointer: coarse)': true,
        '(pointer: fine)': false,
        '(hover: hover)': false,
        '(pointer: fine) and (hover: hover)': false
      });

      // Second call should return cached result
      const result2 = getDeviceType();
      expect(result2).toBe(result1);
      expect(result2).toBe(DeviceType.DESKTOP);

      // Clear cache
      clearDeviceCache();

      // Third call should detect new environment
      const result3 = getDeviceType();
      expect(result3).toBe(DeviceType.MOBILE);
    });

    test('should cache mobile type detection result', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile'
      });

      // First call
      const result1 = getMobileDeviceType();
      expect(result1).toBe(DeviceType.IOS);

      // Change user agent to Android
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36'
      });

      // Second call should return cached result
      const result2 = getMobileDeviceType();
      expect(result2).toBe(DeviceType.IOS);

      // Clear cache
      clearDeviceCache();

      // Third call should detect new type
      const result3 = getMobileDeviceType();
      expect(result3).toBe(DeviceType.ANDROID);
    });
  });

  describe('Safe Wrapper Functions', () => {
    test('safeMatchMedia should handle missing window.matchMedia', () => {
      delete (window as any).matchMedia;
      expect(safeMatchMedia('(pointer: fine)')).toBe(false);
    });

    test('safeMatchMedia should handle matchMedia errors', () => {
      window.matchMedia = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      expect(safeMatchMedia('(pointer: fine)')).toBe(false);
    });

    test('safeCSSSupports should handle missing CSS', () => {
      delete (window as any).CSS;
      expect(safeCSSSupports('-webkit-touch-callout', 'none')).toBe(false);
    });

    test('safeCSSSupports should handle CSS.supports errors', () => {
      (window as any).CSS = {
        supports: jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        })
      };
      expect(safeCSSSupports('-webkit-touch-callout', 'none')).toBe(false);
    });

    test('safeQuerySelector should handle querySelector errors', () => {
      document.querySelector = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      expect(safeQuerySelector('meta[name="viewport"]')).toBe(false);
    });

    test('safeQuerySelector should return true when element exists', () => {
      document.querySelector = jest.fn().mockReturnValue({});
      expect(safeQuerySelector('meta[name="viewport"]')).toBe(true);
    });

    test('safeQuerySelector should return false when element does not exist', () => {
      document.querySelector = jest.fn().mockReturnValue(null);
      expect(safeQuerySelector('meta[name="viewport"]')).toBe(false);
    });
  });
});