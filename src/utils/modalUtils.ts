import loggerModule from './logger';
const logger = loggerModule.logger;

export interface ModalOptions {
    title?: string;
    description?: string;
    extensionUrl?: string;
    onClose?: () => void;
}

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
            extensionUrl: 'https://chrome.google.com/webstore/detail/reclaim-protocol/hfcnhpjgimdliffdbdcdkpkkkdlhgfkb',
            ...options
        };
    }

    async show(requestUrl: string): Promise<void> {
        try {
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

    private createModalHTML(): string {
        return `
            <div id="${this.modalId}" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 32px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                ">
                    <h2 style="
                        margin: 0 0 16px 0;
                        font-size: 24px;
                        font-weight: 600;
                        color: #1f2937;
                    ">${this.options.title}</h2>
                    
                    <p style="
                        margin: 0 0 24px 0;
                        color: #6b7280;
                        font-size: 14px;
                        line-height: 1.5;
                    ">${this.options.description}</p>
                    
                    <div id="reclaim-qr-code" style="
                        margin: 0 auto 24px auto;
                        padding: 16px;
                        background: #f9fafb;
                        border-radius: 8px;
                        display: inline-block;
                    "></div>
                    
                    <div style="
                        margin-bottom: 24px;
                        padding: 16px;
                        background: #f0f9ff;
                        border: 1px solid #e0f2fe;
                        border-radius: 8px;
                    ">
                        <p style="
                            margin: 0 0 12px 0;
                            font-size: 14px;
                            color: #0369a1;
                            font-weight: 500;
                        ">💡 For a better experience</p>
                        <p style="
                            margin: 0 0 12px 0;
                            font-size: 13px;
                            color: #0369a1;
                            line-height: 1.4;
                        ">Install our browser extension for seamless verification without QR codes</p>
                        <a href="${this.options.extensionUrl}" 
                           target="_blank" 
                           style="
                               display: inline-block;
                               background: #2563eb;
                               color: white;
                               text-decoration: none;
                               padding: 8px 16px;
                               border-radius: 6px;
                               font-size: 12px;
                               font-weight: 500;
                               transition: background-color 0.2s;
                           "
                           onmouseover="this.style.backgroundColor='#1d4ed8'"
                           onmouseout="this.style.backgroundColor='#2563eb'">
                            Install Extension
                        </a>
                    </div>
                    
                    <button id="reclaim-close-modal" style="
                        background: #f3f4f6;
                        border: none;
                        color: #374151;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background-color 0.2s;
                    "
                    onmouseover="this.style.backgroundColor='#e5e7eb'"
                    onmouseout="this.style.backgroundColor='#f3f4f6'">
                        Close
                    </button>
                    
                    <div style="margin-top: 16px;">
                        <div id="reclaim-countdown" style="
                            font-size: 12px;
                            color: #9ca3af;
                            font-weight: 400;
                            margin-bottom: 8px;
                        ">Auto-close in 1:00</div>
                        
                        <div style="
                            width: 100%;
                            height: 4px;
                            background-color: #e5e7eb;
                            border-radius: 2px;
                            overflow: hidden;
                        ">
                            <div id="reclaim-progress-bar" style="
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
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
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
            
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <img src="${qrCodeUrl}" 
                         alt="QR Code for Reclaim verification" 
                         style="width: 200px; height: 200px; border-radius: 4px;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; padding: 20px; color: #6b7280; font-size: 14px;">
                        QR code could not be loaded.<br>
                        <a href="${text}" target="_blank" style="color: #2563eb; text-decoration: underline;">
                            Click here to open verification link
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            logger.info('Error generating QR code:', error);
            // Fallback to text link
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; color: #6b7280; font-size: 14px;">
                        <a href="${text}" target="_blank" style="color: #2563eb; text-decoration: underline;">
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
        this.countdownSeconds = 60;
        
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

        // Set auto-close timer for 1 minute
        this.autoCloseTimer = setTimeout(() => {
            this.close();
        }, 60000);
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
            const progressPercentage = (this.countdownSeconds / 60) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }
    }
}