import loggerModule from './logger';
import { ModalOptions } from './types';
import { constants } from './constants';
const logger = loggerModule.logger;

export class QRCodeModal {
    private modalId: string;
    private options: ModalOptions;
    private autoCloseTimer?: NodeJS.Timeout;
    private countdownTimer?: NodeJS.Timeout;
    private countdownSeconds: number = 60;

    constructor(options: ModalOptions = {}) {
        this.modalId = 'reclaim-qr-modal';
        this.options = {
            title: 'Verify with Reclaim',
            description: 'Scan the QR code with your mobile device to complete verification',
            extensionUrl: constants.CHROME_EXTENSION_URL,
            darkTheme: false,
            modalPopupTimer: 1,  // default to 1 minute
            showExtensionInstallButton: false, // default to false
            ...options
        };
    }

   async show(requestUrl: string): Promise<void> {
    try {

        // Prevent showing modal inside an iframe if enabled
        if (this.options.preventIframe) {
            try {
                if (window.self !== window.top) {
                    logger.info(
                        "Reclaim Modal blocked: preventIframe = true and page is inside an iframe."
                    );
                    if (this.options.onClose) this.options.onClose();
                    return;
                }
            } catch {
                logger.info(
                    "Reclaim Modal blocked: preventIframe = true and iframe check threw a security error."
                );
                if (this.options.onClose) this.options.onClose();
                return;
            }
        }

        // Remove existing modal if present
        this.close();

        // Create modal HTML
        const modalHTML = this.createModalHTML();

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Generate QR code
        await this.generateQRCode(requestUrl, 'reclaim-qr-code');

        // Add event listeners
        this.addEventListeners();

        // Start auto-close timer
        this.startAutoCloseTimer();

    } catch (error) {
        logger.info('Error showing QR code modal:', error);
        throw error;
    }
}


    close(): void {
        // Clear timers
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = undefined;
        }
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = undefined;
        }

        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.remove();
        }
        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    private getThemeStyles() {
        const isDark = this.options.darkTheme;

        return {
            modalBackground: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
            cardBackground: isDark ? '#1f2937' : 'white',
            titleColor: isDark ? '#f9fafb' : '#1f2937',
            textColor: isDark ? '#d1d5db' : '#6b7280',
            qrBackground: isDark ? '#374151' : '#f9fafb',
            tipBackground: isDark ? '#1e40af' : '#f0f9ff',
            tipBorder: isDark ? '#1e40af' : '#e0f2fe',
            tipTextColor: isDark ? '#dbeafe' : '#0369a1',
            buttonBackground: isDark ? '#374151' : '#f3f4f6',
            buttonColor: isDark ? '#f9fafb' : '#374151',
            buttonHoverBackground: isDark ? '#4b5563' : '#e5e7eb',
            countdownColor: isDark ? '#6b7280' : '#9ca3af',
            progressBackground: isDark ? '#4b5563' : '#e5e7eb',
            progressGradient: isDark
                ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
                : 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',
            linkColor: isDark ? '#60a5fa' : '#2563eb',
            extensionButtonBackground: isDark ? '#1e40af' : '#2563eb',
            extensionButtonHover: isDark ? '#1d4ed8' : '#1d4ed8'
        };
    }

    private createModalHTML(): string {
        const styles = this.getThemeStyles();

        return `
            <div id="${this.modalId}" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: ${styles.modalBackground};
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: ${styles.cardBackground};
                    border-radius: 12px;
                    padding: 32px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    position: relative;
                ">
                    <button id="reclaim-close-modal" style="
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color 0.2s;
                        width: 32px;
                        height: 32px;
                    "
                    onmouseover="this.style.backgroundColor='${styles.buttonHoverBackground}'"
                    onmouseout="this.style.backgroundColor='transparent'"
                    title="Close modal">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="${styles.buttonColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    
                    <h2 style="
                        margin: 0 0 16px 0;
                        font-size: 24px;
                        font-weight: 600;
                        color: ${styles.titleColor};
                    ">${this.options.title}</h2>
                    
                    <p style="
                        margin: 0 0 24px 0;
                        color: ${styles.textColor};
                        font-size: 14px;
                        line-height: 1.5;
                    ">${this.options.description}</p>
                    
                    <div id="reclaim-qr-code" style="
                        margin: 0 auto 24px auto;
                        background: ${styles.qrBackground};
                        border-radius: 8px;
                        display: inline-block;
                    "></div>
                    
                    ${this.options.showExtensionInstallButton ? `
                    <div style="
                        margin-bottom: 24px;
                        padding: 16px;
                        background: ${styles.tipBackground};
                        border: 1px solid ${styles.tipBorder};
                        border-radius: 8px;
                    ">
                        <p style="
                            margin: 0 0 12px 0;
                            font-size: 14px;
                            color: ${styles.tipTextColor};
                            font-weight: 500;
                        ">💡 For a better experience</p>
                        <p style="
                            margin: 0 0 12px 0;
                            font-size: 13px;
                            color: ${styles.tipTextColor};
                            line-height: 1.4;
                        ">Install our browser extension for seamless verification without QR codes</p>
                        <a href="${this.options.extensionUrl}" 
                           target="_blank" 
                           style="
                               display: inline-block;
                               background: ${styles.extensionButtonBackground};
                               color: white;
                               text-decoration: none;
                               padding: 8px 16px;
                               border-radius: 6px;
                               font-size: 12px;
                               font-weight: 500;
                               transition: background-color 0.2s;
                           "
                           onmouseover="this.style.backgroundColor='${styles.extensionButtonHover}'"
                           onmouseout="this.style.backgroundColor='${styles.extensionButtonBackground}'">
                            Install Extension
                        </a>
                    </div>` : ''}
                    
                    <div style="margin-top: 16px;">
                        <div id="reclaim-countdown" style="
                            font-size: 12px;
                            color: ${styles.countdownColor};
                            font-weight: 400;
                            margin-bottom: 8px;
                        ">Auto-close in 1:00</div>
                        
                        <div style="
                            width: 100%;
                            height: 4px;
                            background-color: ${styles.progressBackground};
                            border-radius: 2px;
                            overflow: hidden;
                        ">
                            <div id="reclaim-progress-bar" style="
                                width: 100%;
                                height: 100%;
                                background: ${styles.progressGradient};
                                border-radius: 2px;
                                transition: width 1s linear;
                            "></div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    private async generateQRCode(text: string, containerId: string): Promise<void> {
        try {
            // Simple QR code generation using a public API
            // In production, you might want to use a proper QR code library
            const qrCodeUrl = `${constants.QR_CODE_API_URL}?size=200x200&data=${encodeURIComponent(text)}`;

            const container = document.getElementById(containerId);
            const styles = this.getThemeStyles();

            if (container) {
                container.innerHTML = `
                    <img src="${qrCodeUrl}" 
                         alt="QR Code for Reclaim verification" 
                         style="width: 200px; height: 200px; border-radius: 4px;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; padding: 20px; color: ${styles.textColor}; font-size: 14px;">
                        QR code could not be loaded.<br>
                        <a href="${text}" target="_blank" style="color: ${styles.linkColor}; text-decoration: underline;">
                            Click here to open verification link
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            logger.info('Error generating QR code:', error);
            // Fallback to text link
            const container = document.getElementById(containerId);
            const styles = this.getThemeStyles();

            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; color: ${styles.textColor}; font-size: 14px;">
                        <a href="${text}" target="_blank" style="color: ${styles.linkColor}; text-decoration: underline;">
                            Click here to open verification link
                        </a>
                    </div>
                `;
            }
        }
    }

    private addEventListeners(): void {
        const closeButton = document.getElementById('reclaim-close-modal');
        const modal = document.getElementById(this.modalId);

        const closeModal = () => {
            this.close();
        };

        if (closeButton) {
            closeButton.addEventListener('click', closeModal);
        }

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        // Close on escape key
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    private startAutoCloseTimer(): void {
        this.countdownSeconds = (this.options.modalPopupTimer || 1) * 60; // default to 1 minute

        // Update countdown display immediately
        this.updateCountdownDisplay();

        // Start countdown timer (updates every second)
        this.countdownTimer = setInterval(() => {
            this.countdownSeconds--;
            this.updateCountdownDisplay();

            if (this.countdownSeconds <= 0) {
                this.close();
            }
        }, 1000);

        // Set auto-close timer for the number of minutes specified in the options in milliseconds
        const autoCloseMs = (this.options.modalPopupTimer || 1) * 60 * 1000;
        this.autoCloseTimer = setTimeout(() => {
            this.close();
        }, autoCloseMs);
    }

    private updateCountdownDisplay(): void {
        const countdownElement = document.getElementById('reclaim-countdown');
        const progressBar = document.getElementById('reclaim-progress-bar');

        if (countdownElement) {
            const minutes = Math.floor(this.countdownSeconds / 60);
            const seconds = this.countdownSeconds % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            countdownElement.textContent = `Auto-close in ${timeString}`;
        }

        if (progressBar) {
            // Calculate progress percentage (reverse: starts at 100%, goes to 0%)
            const totalSeconds = (this.options.modalPopupTimer || 1) * 60;
            const progressPercentage = (this.countdownSeconds / totalSeconds) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }
    }
}
