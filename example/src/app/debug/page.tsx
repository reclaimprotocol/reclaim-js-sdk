'use client'
import React, { useEffect, useState } from 'react'
import { getDeviceType, getMobileDeviceType, isMobileDevice, isDesktopDevice } from '@reclaimprotocol/js-sdk'

interface DebugInfo {
  detection: {
    deviceType: string
    mobileType?: string
    isMobile: boolean
    isDesktop: boolean
  }
  scoring: {
    touchDevice: boolean
    hasMouse: boolean
    screenSize: string
    isSmallScreen: boolean
    isLargeScreen: boolean
    userAgent: string
    hasMobileUA: boolean
    hasMobileAPIs: boolean
    devicePixelRatio: number
    hasViewportMeta: boolean
    canHover: boolean
    pointerType: string
  }
  environment: {
    userAgent: string
    platform: string
    vendor: string
    language: string
    screenResolution: string
    windowSize: string
    orientation?: string
    touchPoints: number
  }
  capabilities: {
    touch: boolean
    geolocation: boolean
    notifications: boolean
    serviceWorker: boolean
    webGL: boolean
    webRTC: boolean
    deviceMotion: boolean
    deviceOrientation: boolean
  }
  recommendations: string[]
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const collectDebugInfo = (): DebugInfo => {
      // Detection results
      const deviceType = getDeviceType()
      const isMobile = isMobileDevice()
      const isDesktop = isDesktopDevice()
      const mobileType = isMobile ? getMobileDeviceType() : undefined

      // Screen info
      const screenWidth = window.innerWidth || window.screen?.width || 0
      const screenHeight = window.innerHeight || window.screen?.height || 0
      const isSmallScreen = screenWidth <= 768 || screenHeight <= 768
      const isLargeScreen = screenWidth > 1024 && screenHeight > 768

      // Touch detection
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Pointer detection
      const getPointerType = () => {
        if (!window.matchMedia) return 'unknown'
        if (window.matchMedia('(pointer: fine)').matches) return 'fine (mouse/trackpad)'
        if (window.matchMedia('(pointer: coarse)').matches) return 'coarse (touch)'
        return 'none'
      }

      // User agent check
      const userAgent = navigator.userAgent
      const hasMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent.toLowerCase())

      // Mobile APIs
      const hasMobileAPIs = 'orientation' in window || 
                           'DeviceMotionEvent' in window ||
                           'DeviceOrientationEvent' in window

      // Viewport meta
      const hasViewportMeta = document.querySelector('meta[name="viewport"]') !== null

      // Hover capability
      const canHover = window.matchMedia?.('(hover: hover)')?.matches || false
      const hasMouse = window.matchMedia?.('(pointer: fine)')?.matches || false

      // Capabilities check
      const checkWebGL = (): boolean => {
        try {
          const canvas = document.createElement('canvas')
          return !!(window.WebGLRenderingContext && 
                   (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
        } catch {
          return false
        }
      }

      // Generate recommendations
      const recommendations: string[] = []
      
      if (deviceType === 'desktop' && hasTouch && hasMouse) {
        recommendations.push('Desktop with touchscreen detected - device correctly identified')
      }
      
      if (deviceType === 'mobile' && isLargeScreen) {
        recommendations.push('Large screen mobile device (tablet) detected')
      }
      
      if (deviceType === 'desktop' && isSmallScreen) {
        recommendations.push('Desktop with small window - resize detection working correctly')
      }
      
      if (userAgent.includes('iPad') && deviceType === 'mobile') {
        recommendations.push('iPad correctly detected as mobile device')
      }
      
      if (userAgent.includes('Macintosh') && hasTouch) {
        recommendations.push('iPad Pro in desktop mode detected via touch + Mac UA')
      }

      if (!window.matchMedia) {
        recommendations.push('⚠️ matchMedia not supported - using fallback detection')
      }

      if (hasMobileAPIs && deviceType === 'desktop') {
        recommendations.push('Desktop browser with mobile APIs - correctly identified as desktop')
      }

      return {
        detection: {
          deviceType,
          mobileType,
          isMobile,
          isDesktop
        },
        scoring: {
          touchDevice: hasTouch,
          hasMouse,
          screenSize: `${screenWidth} × ${screenHeight}`,
          isSmallScreen,
          isLargeScreen,
          userAgent: navigator.userAgent,
          hasMobileUA,
          hasMobileAPIs,
          devicePixelRatio: window.devicePixelRatio || 1,
          hasViewportMeta,
          canHover,
          pointerType: getPointerType()
        },
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor,
          language: navigator.language,
          screenResolution: `${window.screen?.width || 0} × ${window.screen?.height || 0}`,
          windowSize: `${window.innerWidth} × ${window.innerHeight}`,
          orientation: (window.screen as any)?.orientation?.type,
          touchPoints: navigator.maxTouchPoints || 0
        },
        capabilities: {
          touch: hasTouch,
          geolocation: 'geolocation' in navigator,
          notifications: 'Notification' in window,
          serviceWorker: 'serviceWorker' in navigator,
          webGL: checkWebGL(),
          webRTC: 'RTCPeerConnection' in window,
          deviceMotion: 'DeviceMotionEvent' in window,
          deviceOrientation: 'DeviceOrientationEvent' in window
        },
        recommendations
      }
    }

    setDebugInfo(collectDebugInfo())

    // Update on resize
    const handleResize = () => {
      setDebugInfo(collectDebugInfo())
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const copyDebugInfo = () => {
    if (!debugInfo) return
    
    const debugText = JSON.stringify(debugInfo, null, 2)
    navigator.clipboard.writeText(debugText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadDebugReport = () => {
    if (!debugInfo) return
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...debugInfo
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reclaim-device-debug-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!debugInfo) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </main>
    )
  }

  const getStatusColor = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? 'text-green-600' : 'text-gray-500'
    }
    return 'text-gray-900'
  }

  const getDeviceIcon = () => {
    if (debugInfo.detection.deviceType === 'mobile') {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getDeviceIcon()}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Device Detection Debug</h1>
                <p className="text-sm text-gray-500">Reclaim SDK Device Detection Analysis</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyDebugInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
              <button
                onClick={downloadDebugReport}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Download Report
              </button>
            </div>
          </div>

          {/* Detection Result */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Device Type</p>
              <p className="text-xl font-bold text-blue-900 capitalize">{debugInfo.detection.deviceType}</p>
            </div>
            {debugInfo.detection.mobileType && (
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">Mobile Type</p>
                <p className="text-xl font-bold text-purple-900 uppercase">{debugInfo.detection.mobileType}</p>
              </div>
            )}
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Is Mobile</p>
              <p className="text-xl font-bold text-green-900">{debugInfo.detection.isMobile ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-amber-600 font-medium mb-1">Is Desktop</p>
              <p className="text-xl font-bold text-amber-900">{debugInfo.detection.isDesktop ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {debugInfo.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Detection Insights</h2>
            <ul className="space-y-2">
              {debugInfo.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-sm text-blue-800">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Scoring Factors */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection Factors</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Touch Device</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.touchDevice)}`}>
                  {debugInfo.scoring.touchDevice ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Has Mouse</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.hasMouse)}`}>
                  {debugInfo.scoring.hasMouse ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Screen Size</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.scoring.screenSize}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Small Screen (≤768px)</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.isSmallScreen)}`}>
                  {debugInfo.scoring.isSmallScreen ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Large Screen (&gt;1024px)</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.isLargeScreen)}`}>
                  {debugInfo.scoring.isLargeScreen ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Mobile User Agent</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.hasMobileUA)}`}>
                  {debugInfo.scoring.hasMobileUA ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Mobile APIs</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.hasMobileAPIs)}`}>
                  {debugInfo.scoring.hasMobileAPIs ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Device Pixel Ratio</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.scoring.devicePixelRatio}x</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Viewport Meta Tag</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.hasViewportMeta)}`}>
                  {debugInfo.scoring.hasViewportMeta ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Can Hover</span>
                <span className={`text-sm font-medium ${getStatusColor(debugInfo.scoring.canHover)}`}>
                  {debugInfo.scoring.canHover ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Pointer Type</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.scoring.pointerType}</span>
              </div>
            </div>
          </div>

          {/* Environment Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment</h2>
            <div className="space-y-3">
              <div className="py-2 border-b">
                <p className="text-xs text-gray-500 mb-1">User Agent</p>
                <p className="text-sm text-gray-900 font-mono break-all">{debugInfo.environment.userAgent}</p>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Platform</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.environment.platform}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Vendor</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.environment.vendor}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Language</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.environment.language}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Screen Resolution</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.environment.screenResolution}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Window Size</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.environment.windowSize}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Touch Points</span>
                <span className="text-sm font-medium text-gray-900">{debugInfo.environment.touchPoints}</span>
              </div>
              {debugInfo.environment.orientation && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Orientation</span>
                  <span className="text-sm font-medium text-gray-900">{debugInfo.environment.orientation}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browser Capabilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(debugInfo.capabilities).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw JSON Preview */}
        <details className="bg-gray-900 rounded-lg shadow-sm p-6 mt-6">
          <summary className="cursor-pointer text-gray-300 font-medium mb-4 select-none hover:text-white">
            View Raw JSON Data
          </summary>
          <pre className="text-xs text-gray-400 overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Reclaim SDK Device Detection Debug Tool</p>
          <p>Report any detection issues at: <a href="https://github.com/reclaimprotocol/reclaim-js-sdk/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Issues</a></p>
        </div>
      </div>
    </main>
  )
}