// --- KONFIGURASI ---
// Alamat backend di Netlify. Ini sudah final dan tidak perlu diubah.
const apiUrl = '/.netlify/functions/api';
// --------------------

// --- SECURITY UTILITIES ---
/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Creates a safe HTML element with sanitized content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string} content - Inner content
 * @returns {HTMLElement} Safe HTML element
 */
function createSafeElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    // Set attributes safely
    Object.keys(attributes).forEach(key => {
        if (key === 'className') {
            element.className = attributes[key];
        } else if (key === 'style' && typeof attributes[key] === 'object') {
            Object.assign(element.style, attributes[key]);
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, attributes[key]);
        } else if (['id', 'href', 'src', 'alt', 'title', 'type', 'value', 'placeholder'].includes(key)) {
            element.setAttribute(key, attributes[key]);
        }
    });

    // Set content safely
    if (content) {
        element.textContent = content;
    }

    return element;
}

/**
 * Safely sets innerHTML with sanitized content
 * @param {HTMLElement} element - Element to set content on
 * @param {string} html - HTML string to sanitize and set
 */
function setSafeHTML(element, html) {
    if (!element) return;
    // For simple cases, use textContent
    if (!html.includes('<')) {
        element.textContent = html;
        return;
    }

    // For complex HTML, create a temporary div and sanitize
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove potentially dangerous elements and attributes
    const dangerousElements = ['script', 'iframe', 'object', 'embed'];
    const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover'];

    dangerousElements.forEach(tag => {
        const elements = tempDiv.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });

    tempDiv.querySelectorAll('*').forEach(el => {
        dangerousAttributes.forEach(attr => {
            if (el.hasAttribute(attr)) {
                el.removeAttribute(attr);
            }
        });
    });

    element.innerHTML = tempDiv.innerHTML;
}

// --- DATA MANAGEMENT ---
class DataManager {
    constructor() {
        this.dataWajibPajak = [];
        this.dataWilayah = [];
        this.dataMasterPajak = [];
        this.dataKetetapan = [];
        this.kelurahanChoices = null;
    }

    updateData(type, data) {
        switch(type) {
            case 'wajibPajak':
                this.dataWajibPajak = Array.isArray(data) ? data : [];
                break;
            case 'wilayah':
                this.dataWilayah = Array.isArray(data) ? data : [];
                break;
            case 'masterPajak':
                this.dataMasterPajak = Array.isArray(data) ? data : [];
                break;
            case 'ketetapan':
                this.dataKetetapan = Array.isArray(data) ? data : [];
                break;
        }
    }

    getData(type) {
        switch(type) {
            case 'wajibPajak':
                return this.dataWajibPajak;
            case 'wilayah':
                return this.dataWilayah;
            case 'masterPajak':
                return this.dataMasterPajak;
            case 'ketetapan':
                return this.dataKetetapan;
            default:
                return [];
        }
    }
}

// Initialize data manager
const dataManager = new DataManager();

// --- PWA MANAGEMENT ---
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupNetworkDetection();
        this.setupPushNotifications();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                    this.registration = registration;
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('Install prompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        window.addEventListener('appinstalled', (e) => {
            console.log('App installed successfully');
            this.deferredPrompt = null;
        });
    }

    showInstallPrompt() {
        if (!this.deferredPrompt) return;

        // Create install prompt UI
        const installBanner = createSafeElement('div', {
            id: 'install-banner',
            style: {
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                right: '20px',
                background: '#1976d2',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: '1000',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'Arial, sans-serif'
            }
        });

        const textDiv = createSafeElement('div');
        const title = createSafeElement('div', { style: { fontWeight: 'bold', marginBottom: '5px' } }, 'Install Aplikasi Pajak');
        const description = createSafeElement('div', { style: { fontSize: '14px' } }, 'Install aplikasi untuk pengalaman terbaik dan akses offline');

        textDiv.appendChild(title);
        textDiv.appendChild(description);

        const buttonDiv = createSafeElement('div');
        const installBtn = createSafeElement('button', {
            style: {
                background: 'white',
                color: '#1976d2',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginRight: '10px'
            }
        }, 'Install');

        const cancelBtn = createSafeElement('button', {
            style: {
                background: 'transparent',
                color: 'white',
                border: '1px solid white',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
            }
        }, 'Nanti');

        installBtn.addEventListener('click', () => {
            this.installApp();
            installBanner.remove();
        });

        cancelBtn.addEventListener('click', () => {
            installBanner.remove();
        });

        buttonDiv.appendChild(installBtn);
        buttonDiv.appendChild(cancelBtn);

        installBanner.appendChild(textDiv);
        installBanner.appendChild(buttonDiv);

        document.body.appendChild(installBanner);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (installBanner.parentNode) {
                installBanner.remove();
            }
        }, 10000);
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        console.log('Install outcome:', outcome);
        this.deferredPrompt = null;
    }

    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNetworkStatus('Online', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkStatus('Offline - Mode terbatas aktif', 'warning');
        });
    }

    showNetworkStatus(message, type) {
        // Remove existing status
        const existingStatus = document.getElementById('network-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        const statusDiv = createSafeElement('div', {
            id: 'network-status',
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: type === 'success' ? '#28a745' : '#ffc107',
                color: type === 'success' ? 'white' : '#212529',
                padding: '10px 15px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: '1000',
                fontSize: '14px',
                fontWeight: 'bold'
            }
        }, message);

        document.body.appendChild(statusDiv);

        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 3000);
    }

    async syncOfflineData() {
        try {
            // Trigger background sync
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('background-sync-data');
            }
        } catch (error) {
            console.error('Background sync failed:', error);
        }
    }

    setupPushNotifications() {
        if ('Notification' in window) {
            // Request permission for notifications
            if (Notification.permission === 'default') {
                setTimeout(() => {
                    this.requestNotificationPermission();
                }, 5000); // Wait 5 seconds after page load
            }
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);

            if (permission === 'granted') {
                this.showNotification('Notifikasi Diaktifkan', 'Anda akan menerima pembaruan penting dari aplikasi.');
            }
        } catch (error) {
            console.error('Notification permission request failed:', error);
        }
    }

    showNotification(title, body, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: '/images/logo.png',
                badge: '/images/logo.png',
                ...options
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    }

    // Demo push notification (for testing)
    demoNotification() {
        this.showNotification(
            'Aplikasi Pajak Siap Digunakan',
            'Selamat! Aplikasi telah berhasil diinstall dan siap digunakan secara offline.',
            {
                actions: [
                    { action: 'explore', title: 'Jelajahi' },
                    { action: 'close', title: 'Tutup' }
                ]
            }
        );
    }

    // Subscribe to push notifications (requires VAPID keys for production)
    async subscribeToPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
            });

            console.log('Push subscription:', subscription);
            return subscription;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return null;
        }
    }

    // Helper function to convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Method to check if app is installed
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Method to get cache storage info
    async getCacheInfo() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            const cacheInfo = {};

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                cacheInfo[cacheName] = keys.length;
            }

            return cacheInfo;
        }
        return {};
    }

    // Update PWA status indicators
    updateStatusIndicators() {
        const pwaStatusBulb = document.getElementById('pwa-status-bulb');
        const pwaStatusText = document.getElementById('pwa-status-text');
        const networkStatusBulb = document.getElementById('network-status-bulb');
        const networkStatusText = document.getElementById('network-status-text');

        if (pwaStatusBulb && pwaStatusText) {
            const isInstalled = this.isInstalled();
            pwaStatusBulb.className = `status-bulb ${isInstalled ? 'status-green' : 'status-blue'}`;
            pwaStatusText.textContent = isInstalled ? 'PWA terinstall' : 'PWA siap digunakan';
        }

        if (networkStatusBulb && networkStatusText) {
            networkStatusBulb.className = `status-bulb ${this.isOnline ? 'status-green' : 'status-orange'}`;
            networkStatusText.textContent = this.isOnline ? 'Online' : 'Offline';
        }
    }

    // Show PWA install button if not installed
    showInstallButton() {
        if (this.isInstalled() || !this.deferredPrompt) return;

        const installButton = createSafeElement('button', {
            id: 'pwa-install-btn',
            style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: '1000',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }
        });

        const icon = createSafeElement('span', {}, '📱');
        const text = createSafeElement('span', {}, 'Install App');

        installButton.appendChild(icon);
        installButton.appendChild(text);

        installButton.addEventListener('click', () => {
            this.installApp();
            installButton.remove();
        });

        document.body.appendChild(installButton);

        // Auto-hide after 30 seconds
        setTimeout(() => {
            if (installButton.parentNode) {
                installButton.remove();
            }
        }, 30000);
    }
}

// Browser Notification Manager
class BrowserNotificationManager {
    constructor() {
        this.enabled = false;
        this.init();
    }

    async init() {
        if ('Notification' in window) {
            this.enabled = Notification.permission === 'granted';
            if (Notification.permission === 'default') {
                await this.requestPermission();
            }
        }
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.enabled = permission === 'granted';
            return this.enabled;
        } catch (error) {
            console.error('Notification permission request failed:', error);
            return false;
        }
    }

    showNotification(title, body, options = {}) {
        if (!this.enabled) {
            console.log('Browser notifications disabled');
            return null;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '/images/logo.png',
            badge: '/images/logo.png',
            tag: options.tag || 'pajak-notification',
            requireInteraction: options.requireInteraction || false,
            ...options
        });

        // Auto-close after 5 seconds unless it requires interaction
        if (!options.requireInteraction) {
            setTimeout(() => {
                notification.close();
            }, 5000);
        }

        return notification;
    }

    // Specific notification types
    showRegistrationSuccess(data) {
        return this.showNotification(
            '🎉 Pendaftaran Berhasil!',
            `Selamat ${data.namaUsaha}, Anda telah berhasil terdaftar dengan NPWPD: ${data.npwpd}`,
            { requireInteraction: true }
        );
    }

    showPaymentSuccess(data) {
        return this.showNotification(
            '✅ Pembayaran Berhasil!',
            `Pembayaran sebesar Rp ${data.jumlah?.toLocaleString('id-ID')} telah diterima`,
            { requireInteraction: true }
        );
    }

    showKetetapanCreated(data) {
        return this.showNotification(
            '📋 Ketetapan Dibuat',
            `Ketetapan baru telah dibuat untuk ${data.namaUsaha}`,
            { requireInteraction: false }
        );
    }
}

// Initialize managers
const pwaManager = new PWAManager();
const browserNotifications = new BrowserNotificationManager();

// Update PWA status when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Update status indicators after a short delay to ensure DOM is ready
    setTimeout(() => {
        pwaManager.updateStatusIndicators();
        pwaManager.showInstallButton();
    }, 1000);
});

// --- INPUT VALIDATION UTILITIES ---
/**
 * Validates and sanitizes user input
 * @param {string} input - Input to validate
 * @param {Object} options - Validation options
 * @returns {Object} {isValid: boolean, sanitized: string, error: string}
 */
function validateInput(input, options = {}) {
    const {
        required = false,
        minLength = 0,
        maxLength = 1000,
        pattern = null,
        type = 'text'
    } = options;

    let sanitized = String(input || '').trim();

    // Check required
    if (required && !sanitized) {
        return { isValid: false, sanitized: '', error: 'Field ini wajib diisi' };
    }

    // Check length
    if (sanitized.length < minLength) {
        return { isValid: false, sanitized, error: `Minimal ${minLength} karakter` };
    }

    if (sanitized.length > maxLength) {
        return { isValid: false, sanitized: sanitized.substring(0, maxLength), error: `Maksimal ${maxLength} karakter` };
    }

    // Type-specific validation
    switch (type) {
        case 'email':
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(sanitized)) {
                return { isValid: false, sanitized, error: 'Format email tidak valid' };
            }
            break;
        case 'phone':
            const phonePattern = /^[\d\s\-\+\(\)]{8,}$/;
            if (!phonePattern.test(sanitized)) {
                return { isValid: false, sanitized, error: 'Format nomor telepon tidak valid' };
            }
            break;
        case 'number':
            if (isNaN(Number(sanitized))) {
                return { isValid: false, sanitized, error: 'Harus berupa angka' };
            }
            break;
    }

    // Pattern validation
    if (pattern && !pattern.test(sanitized)) {
        return { isValid: false, sanitized, error: 'Format tidak valid' };
    }

    return { isValid: true, sanitized, error: '' };
}

/**
 * Safely populates a select element with options
 * @param {HTMLSelectElement} selectElement - Select element to populate
 * @param {Array} options - Array of option objects {value, text, selected}
 * @param {string} placeholder - Placeholder option text
 */
function safePopulateSelect(selectElement, options, placeholder = '') {
    if (!selectElement) return;

    // Clear existing options
    selectElement.innerHTML = '';

    // Add placeholder if provided
    if (placeholder) {
        const placeholderOption = createSafeElement('option', { value: '' }, placeholder);
        selectElement.appendChild(placeholderOption);
    }

    // Add options safely
    options.forEach(option => {
        const optionElement = createSafeElement('option',
            { value: option.value },
            option.text || option.value
        );
        if (option.selected) {
            optionElement.selected = true;
        }
        selectElement.appendChild(optionElement);
    });
}

// Router utama yang berjalan setelah halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    switch (pageId) {
        case 'page-dashboard': initDashboardPage(); break;
        case 'page-tambah-wp': initTambahWpPage(); break;
        case 'page-lihat-wp': initLihatWpPage(); break;
        case 'page-tambah-ketetapan': initKetetapanPage(); break;
        case 'page-detail-wp': initDetailPage(); break;
    }
});


// =================================================================
// Inisialisasi Halaman
// =================================================================

async function initDashboardPage() {
    try {
        // Gunakan loadDashboardData() yang lengkap dengan fitur target
        await loadDashboardData();
    } catch (error) {
        document.getElementById('totalWp').textContent = 'Error';
        console.error("Error di Dasbor:", error);
    }
}

async function initTambahWpPage() {
    const form = document.getElementById('pajakForm');
    const kelurahanSelect = document.getElementById('kelurahan');
    const kecamatanSelect = document.getElementById('kecamatan');
    const generateCheckbox = document.getElementById('generateNpwpd');
    const npwpdInput = document.getElementById('npwpd');
    const jenisWpGroup = document.getElementById('jenisWpGroup');

    try {
        const data = await fetchAllData();
        dataManager.updateData('wilayah', data.wilayah || []);

        // Isi dropdown kecamatan unik
        const wilayahData = dataManager.getData('wilayah');
        const kecamatanUnik = [...new Set(wilayahData.map(item => item.Kecamatan))];

        safePopulateSelect(kecamatanSelect, kecamatanUnik.map(kec => ({ value: kec, text: kec })), '-- Pilih Kecamatan --');
        safePopulateSelect(kelurahanSelect, [], '-- Pilih Kelurahan --');

        // Saat kecamatan dipilih, isi kelurahan sesuai kecamatan
        kecamatanSelect.addEventListener('change', function() {
            safePopulateSelect(kelurahanSelect, [], '-- Pilih Kelurahan --');
            if (!this.value) return;

            const kelurahanFiltered = wilayahData.filter(item => item.Kecamatan === this.value);
            const kelurahanOptions = kelurahanFiltered.map(item => ({
                value: item.Kelurahan,
                text: item.Kelurahan,
                kodekel: item.KodeKelurahan,
                kodekec: item.KodeKecamatan
            }));

            safePopulateSelect(kelurahanSelect, kelurahanOptions, '-- Pilih Kelurahan --');

            // Set dataset attributes safely
            const options = kelurahanSelect.querySelectorAll('option');
            kelurahanFiltered.forEach((item, index) => {
                if (options[index + 1]) { // Skip placeholder option
                    options[index + 1].dataset.kodekel = item.KodeKelurahan;
                    options[index + 1].dataset.kodekec = item.KodeKecamatan;
                }
            });
        });
    } catch (error) {
        console.error('Error loading wilayah data:', error);
        safePopulateSelect(kecamatanSelect, [], 'Gagal memuat data');
        safePopulateSelect(kelurahanSelect, [], 'Gagal memuat data');
    }

    generateCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        npwpdInput.readOnly = isChecked;
        npwpdInput.style.backgroundColor = isChecked ? '#e9ecef' : 'white';
        npwpdInput.value = isChecked ? '(Akan dibuat otomatis)' : '';
        npwpdInput.required = !isChecked;
        npwpdInput.placeholder = isChecked ? '' : 'Ketik NPWPD manual...';
        jenisWpGroup.style.display = isChecked ? 'block' : 'none';
    });

    kelurahanSelect.addEventListener('change', (e) => {
        const wilayahData = dataManager.getData('wilayah');
        const wilayahCocok = wilayahData.find(w => w.Kelurahan === e.target.value);
        kecamatanSelect.value = wilayahCocok ? wilayahCocok.Kecamatan : '';
    });

    form.addEventListener('submit', handleWpFormSubmit);
}

async function initLihatWpPage() {
    try {
        const data = await fetchAllData();
        dataManager.updateData('wajibPajak', data.wajibPajak || []);
        dataManager.updateData('wilayah', data.wilayah || []);

        const wajibPajakData = dataManager.getData('wajibPajak');
        populateWpDataTable(wajibPajakData);
        setupWpEditModal();

        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = sanitizeHTML(e.target.value.toLowerCase());
            const filteredData = wajibPajakData.filter(item =>
                String(item.NPWPD || '').toLowerCase().includes(searchTerm) ||
                String(item['Nama Usaha'] || '').toLowerCase().includes(searchTerm)
            );
            populateWpDataTable(filteredData);
        });
    } catch (error) {
        console.error('Error loading WP data:', error);
        const tbody = document.querySelector("#dataTable tbody");
        if (tbody) {
            tbody.innerHTML = '';
            const errorRow = createSafeElement('tr');
            const errorCell = createSafeElement('td', { colspan: '12', style: { textAlign: 'center', color: '#dc3545' } }, 'Gagal memuat data');
            errorRow.appendChild(errorCell);
            tbody.appendChild(errorRow);
        }
    }
}

async function initKetetapanPage() {
    const form = document.getElementById('ketetapanForm');
    const layananSelect = document.getElementById('ketetapanLayanan');
    const npwpdInput = document.getElementById('ketetapanNpwpd');

    const params = new URLSearchParams(window.location.search);
    const npwpdFromUrl = params.get('npwpd');
    if (npwpdFromUrl) {
        npwpdInput.value = sanitizeHTML(npwpdFromUrl);
        npwpdInput.readOnly = true;
        npwpdInput.style.backgroundColor = '#e9ecef';
    }

    try {
        const data = await fetchAllData();
        dataManager.updateData('masterPajak', data.masterPajak || []);

        const masterPajakData = dataManager.getData('masterPajak');
        const layananOptions = masterPajakData.map(item => ({
            value: item.KodeLayanan,
            text: `${sanitizeHTML(item.NamaLayanan || '')} (${sanitizeHTML(item.Tipe || '')})`
        }));

        safePopulateSelect(layananSelect, layananOptions, '-- Pilih Layanan --');
    } catch (error) {
        console.error('Error loading master pajak data:', error);
        safePopulateSelect(layananSelect, [], 'Gagal memuat data');
    }
    form.addEventListener('submit', handleKetetapanFormSubmit);
}

async function initDetailPage() {
    const detailContent = document.getElementById('detailContent');
    const fotoContent = document.getElementById('fotoContent');
    const aksiContent = document.getElementById('detailAksi');

    try {
        const params = new URLSearchParams(window.location.search);
        const npwpd = params.get('npwpd');
        if (!npwpd) throw new Error("NPWPD tidak ditemukan di URL.");

        const data = await fetchAllData();
        dataManager.updateData('wajibPajak', data.wajibPajak || []);
        dataManager.updateData('ketetapan', data.ketetapan || []);
        dataManager.updateData('wilayah', data.wilayah || []);
        dataManager.updateData('masterPajak', data.masterPajak || []);

        const wajibPajakData = dataManager.getData('wajibPajak');
        const item = wajibPajakData.find(wp => wp.NPWPD == npwpd);
        if (!item) throw new Error(`Data untuk NPWPD ${sanitizeHTML(npwpd)} tidak ditemukan.`);

        // Create safe action button
        const actionLink = createSafeElement('a', {
            href: `tambah-ketetapan.html?npwpd=${encodeURIComponent(npwpd)}`,
            className: 'btn-primary',
            style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                padding: '12px 24px',
                background: '#1976d2',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '500',
                transition: 'background 0.3s'
            }
        });

        const actionSpan = createSafeElement('span', {}, '📋');
        const actionText = createSafeElement('span', {}, 'Buat Ketetapan Baru');

        actionLink.appendChild(actionSpan);
        actionLink.appendChild(actionText);

        aksiContent.innerHTML = '';
        aksiContent.appendChild(actionLink);

        displayDetailData(item);
        displayPhotos(item);

        // Load riwayat ketetapan
        const ketetapanData = dataManager.getData('ketetapan');
        const riwayatKetetapan = ketetapanData.filter(k => k.NPWPD == npwpd);
        displayKetetapanHistory(riwayatKetetapan, dataManager.getData('masterPajak'));

        // Load riwayat pembayaran
        const riwayatPembayaran = (data.pembayaran || []).filter(p => p.NPWPD == npwpd);
        displayPembayaranHistory(riwayatPembayaran);

        // Load status fiskal
        displayFiskalStatus(npwpd, data);

        setupKetetapanEditModal();
    } catch (error) {
        console.error('Error loading detail page:', error);
        if (detailContent) {
            detailContent.innerHTML = '';
            const errorPara = createSafeElement('p', { style: { color: '#dc3545' } }, sanitizeHTML(error.message));
            detailContent.appendChild(errorPara);
        }
    }
}


// =================================================================
// Fungsi-fungsi Aksi (CRUD Handlers)
// =================================================================

async function handleWpFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Mengirim...'; statusDiv.style.display = 'none';
    
    const generateMode = document.getElementById('generateNpwpd').checked;
    const kelurahanSelect = document.getElementById('kelurahan');
    const kecamatanSelect = document.getElementById('kecamatan');
    const selectedKelurahanOption = kelurahanSelect.options[kelurahanSelect.selectedIndex];

    // --- VALIDASI INPUT ---
    const namaUsaha = document.getElementById('namaUsaha').value.trim();
    const namaPemilik = document.getElementById('namaPemilik').value.trim();
    const nikKtp = document.getElementById('nikKtp').value.trim();
    const alamat = document.getElementById('alamat').value.trim();
    const telephone = document.getElementById('telephone').value.trim();
    const kelurahan = kelurahanSelect.value;
    const kecamatan = kecamatanSelect.value;
    const npwpd = document.getElementById('npwpd').value.trim();
    const jenisWp = document.getElementById('jenisWp').value;

    if (!namaUsaha || !namaPemilik || !nikKtp || !alamat || !telephone || !kelurahan || !kecamatan) {
        showStatus('Semua field wajib diisi!', false);
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
        return;
    }
    if (!/^\d{16}$/.test(nikKtp)) {
        showStatus('NIK harus 16 digit angka!', false);
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
        return;
    }
    if (!/^\d{8,}$/.test(telephone)) {
        showStatus('Nomor telepon harus minimal 8 digit angka!', false);
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
        return;
    }
    if (generateMode) {
        if (!selectedKelurahanOption || !selectedKelurahanOption.dataset.kodekel || !selectedKelurahanOption.dataset.kodekec) {
            showStatus('Pilih kelurahan dan kecamatan yang valid!', false);
            submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
            return;
        }
        if (!jenisWp) {
            showStatus('Jenis WP wajib dipilih!', false);
            submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
            return;
        }
    } else {
        if (!npwpd) {
            showStatus('NPWPD wajib diisi untuk mode manual!', false);
            submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
            return;
        }
    }
    // --- END VALIDASI ---

    try {
        const [fotoPemilik, fotoTempatUsaha, fotoKtp] = await Promise.all([
            fileToBase64(document.getElementById('fotoPemilik').files[0]),
            fileToBase64(document.getElementById('fotoTempatUsaha').files[0]),
            fileToBase64(document.getElementById('fotoKtp').files[0])
        ]);

        let dataToSend = {
            action: 'createWp',
            generate_mode: generateMode,
            namaUsaha, namaPemilik, nikKtp, alamat, telephone, kelurahan, kecamatan, fotoPemilik, fotoTempatUsaha, fotoKtp
        };

        if (generateMode) {
            dataToSend.jenisWp = jenisWp;
            dataToSend.kodeKelurahan = selectedKelurahanOption.dataset.kodekel;
            dataToSend.kodeKecamatan = selectedKelurahanOption.dataset.kodekec;
        } else {
            dataToSend.npwpd = npwpd;
            dataToSend.jenisWp = "Lama";
        }
        
        const result = await postData(dataToSend);
        showStatus(result.message || 'Data WP berhasil dibuat!', true);
        event.target.reset(); 
        document.getElementById('kecamatan').value = '';
        document.getElementById('generateNpwpd').checked = false;
        document.getElementById('npwpd').readOnly = false;
        document.getElementById('npwpd').style.backgroundColor = 'white';
        document.getElementById('npwpd').value = '';
        document.getElementById('jenisWpGroup').style.display = 'none';

    } catch (error) {
        showStatus('Gagal mengirim data: ' + error.message, false);
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
    }
}

async function handleDeleteWpClick(npwpd) {
    if (!confirm(`Anda yakin ingin menghapus data WP dengan NPWPD: ${npwpd}?`)) return;
    try {
        const result = await postData({ action: 'deleteWp', npwpd: npwpd });
        alert(result.message || 'Data berhasil dihapus.');
        initLihatWpPage();
    } catch (error) {
        alert('Gagal menghapus data: ' + error.message);
    }
}

function handleEditWpClick(npwpd) {
    const dataToEdit = dataWajibPajakGlobal.find(item => item.NPWPD == npwpd);
    if (!dataToEdit) { alert('Data tidak ditemukan!'); return; }
    document.getElementById('editNpwd').value = dataToEdit.NPWPD;
    document.getElementById('editNamaUsaha').value = dataToEdit['Nama Usaha'];
    document.getElementById('editNamaPemilik').value = dataToEdit['Nama Pemilik'];
    document.getElementById('editNikKtp').value = dataToEdit['NIK KTP'];
    document.getElementById('editAlamat').value = dataToEdit.Alamat;
    document.getElementById('editTelephone').value = dataToEdit.Telephone;
    const kelurahanEditSelect = document.getElementById('editKelurahan');
    kelurahanEditSelect.innerHTML = '';
    dataWilayahGlobal.forEach(item => {
        const option = document.createElement('option');
        option.value = item.Kelurahan; option.textContent = item.Kelurahan;
        kelurahanEditSelect.appendChild(option);
    });
    kelurahanEditSelect.value = dataToEdit.Kelurahan;
    document.getElementById('editKecamatan').value = dataToEdit.Kecamatan;

    // Set tanggal pendaftaran
    const editTanggalPendaftaran = document.getElementById('editTanggalPendaftaran');
    if (editTanggalPendaftaran && dataToEdit.tanggal_pendaftaran) {
        const date = new Date(dataToEdit.tanggal_pendaftaran);
        editTanggalPendaftaran.value = date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (editTanggalPendaftaran) {
        editTanggalPendaftaran.value = '-';
    }

    document.getElementById('editModal').style.display = 'block';
}

async function handleUpdateWpFormSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    const updatedData = {
        action: 'updateWp', npwpd: document.getElementById('editNpwd').value,
        namaUsaha: document.getElementById('editNamaUsaha').value, namaPemilik: document.getElementById('editNamaPemilik').value,
        nikKtp: document.getElementById('editNikKtp').value, alamat: document.getElementById('editAlamat').value,
        telephone: document.getElementById('editTelephone').value, kelurahan: document.getElementById('editKelurahan').value,
        kecamatan: document.getElementById('editKecamatan').value
    };
    try {
        const result = await postData(updatedData);
        alert(result.message || 'Data berhasil diperbarui!');
        document.getElementById('editModal').style.display = 'none';
        initLihatWpPage();
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}

async function handleKetetapanFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitKetetapanButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Membuat Ketetapan...'; statusDiv.style.display = 'none';
    try {
        const dataToSend = {
            action: 'createKetetapan', npwpd: document.getElementById('ketetapanNpwpd').value,
            kodeLayanan: document.getElementById('ketetapanLayanan').value, masaPajak: document.getElementById('ketetapanMasaPajak').value,
            jumlahPokok: document.getElementById('ketetapanJumlahPokok').value, tglTunggakan: document.getElementById('tglTunggakan').value,
            catatan: document.getElementById('catatan').value
        };
        const result = await postData(dataToSend);
        showStatus(result.message || 'Ketetapan berhasil dibuat!', true, 'status');
        event.target.reset();
        const npwpdFromUrl = new URLSearchParams(window.location.search).get('npwpd');
        if (npwpdFromUrl) document.getElementById('ketetapanNpwpd').value = npwpdFromUrl;
    } catch (error) {
        showStatus('Gagal membuat ketetapan: ' + error.message, false, 'status');
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Buat Ketetapan';
    }
}

async function handleDeleteKetetapanClick(idKetetapan) {
    if (!confirm(`Anda yakin ingin menghapus ketetapan dengan ID: ${idKetetapan}?`)) return;
    try {
        const result = await postData({ action: 'deleteKetetapan', idKetetapan: idKetetapan });
        alert(result.message || 'Ketetapan berhasil dihapus.');
        location.reload();
    } catch (error) {
        alert('Gagal menghapus ketetapan: ' + error.message);
    }
}

function handleEditKetetapanClick(idKetetapan) {
    const dataToEdit = dataKetetapanGlobal.find(item => 
        String(item.ID_Ketetapan).trim() === String(idKetetapan).trim()
    );
    if (!dataToEdit) { 
        console.warn('Data ketetapan tidak ditemukan! ID:', idKetetapan, 'List:', dataKetetapanGlobal.map(d=>d.ID_Ketetapan));
        alert('Data ketetapan tidak ditemukan!'); 
        return; 
    }
    document.getElementById('editKetetapanId').value = dataToEdit.ID_Ketetapan;
    document.getElementById('editKetetapanMasaPajak').value = dataToEdit.MasaPajak;
    document.getElementById('editKetetapanJumlahPokok').value = dataToEdit.JumlahPokok;
    document.getElementById('editKetetapanCatatan').value = dataToEdit.Catatan;
    document.getElementById('editKetetapanModal').style.display = 'block';
}

async function handleUpdateKetetapanSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateKetetapanButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    try {
        const updatedData = {
            action: 'updateKetetapan', idKetetapan: document.getElementById('editKetetapanId').value,
            masaPajak: document.getElementById('editKetetapanMasaPajak').value,
            jumlahPokok: document.getElementById('editKetetapanJumlahPokok').value,
            catatan: document.getElementById('editKetetapanCatatan').value
        };
        const result = await postData(updatedData);
        alert(result.message || 'Ketetapan berhasil diperbarui!');
        document.getElementById('editKetetapanModal').style.display = 'none';
        await loadKetetapanData(); // refresh data setelah edit
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}


// =================================================================
// Fungsi-fungsi Pembantu (Helpers)
// =================================================================

function showStatus(message, isSuccess, elementId = 'status') {
    const statusDiv = document.getElementById(elementId);
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = isSuccess ? 'status-sukses' : 'status-gagal';
    statusDiv.style.display = 'block';
}

async function postData(data) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.status === 'gagal' || !response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error('Post error:', error);
        throw error;
    }
}

function setupWpEditModal() {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-button');
    const editForm = document.getElementById('editForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    editForm.addEventListener('submit', handleUpdateWpFormSubmit);
}

function setupKetetapanEditModal() {
    const modal = document.getElementById('editKetetapanModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('#closeKetetapanModal');
    const editForm = document.getElementById('editKetetapanForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    editForm.addEventListener('submit', handleUpdateKetetapanSubmit);
}

async function fetchAllData() {
    try {
        const response = await fetch(apiUrl);

        // Check if response is HTML (fallback page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            console.warn('Menerima respons HTML dari Service Worker (fallback offline).');
            // Return mock data for development
            return {
                wajibPajak: [],
                wilayah: [],
                masterPajak: [],
                ketetapan: [],
                pembayaran: [],
                fiskal: [],
                targetPajakRetribusi: [],
                status: 'offline'
            };
        }

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`Gagal mengambil data dari server. Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'gagal') throw new Error(result.message);

        return result;

    } catch (error) {
        console.warn('Error mengambil data dari network:', error.message);
        // Return mock data instead of throwing error
        return {
            wajibPajak: [],
            wilayah: [],
            masterPajak: [],
            ketetapan: [],
            pembayaran: [],
            fiskal: [],
            targetPajakRetribusi: [],
            status: 'error',
            error: error.message
        };
    }
}

function populateWpDataTable(wajibPajakData) {
    const tableHead = document.querySelector("#dataTable thead");
    const tableBody = document.querySelector("#dataTable tbody");
    if (!tableHead || !tableBody) return;
    tableHead.innerHTML = ''; tableBody.innerHTML = '';
    if (wajibPajakData.length > 0) {
        // Mapping header: key Google Sheet -> label user-friendly
        const headerMap = {
            'NPWPD': 'NPWPD',
            'JenisWP': 'Jenis WP',
            'Nama Usaha': 'Nama Usaha',
            'Nama Pemilik': 'Nama Pemilik',
            'NIK KTP': 'NIK',
            'Alamat': 'Alamat Usaha',
            'Telephone': 'No. Telepon',
            'Kelurahan': 'Kelurahan',
            'Kecamatan': 'Kecamatan',
            'Foto Pemilik': 'Foto Pemilik',
            'Foto Tempat Usaha': 'Foto Tempat Usaha',
            'Foto KTP': 'Foto KTP',
            'tanggal_pendaftaran': 'Tgl Daftar'
        };
        const headers = Object.keys(wajibPajakData[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => { headerRow.innerHTML += `<th>${headerMap[h] || h}</th>`; });
        headerRow.innerHTML += `<th>Aksi</th>`;
        tableHead.appendChild(headerRow);
        wajibPajakData.forEach(rowData => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                let cellData = rowData[header];
                if (header === 'NPWPD') {
                    cell.innerHTML = `<a href="detail.html?npwpd=${cellData}">${cellData}</a>`;
                } else if (header === 'tanggal_pendaftaran') {
                    // Format tanggal pendaftaran
                    if (cellData) {
                        const date = new Date(cellData);
                        cell.textContent = date.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                    } else {
                        cell.textContent = '-';
                    }
                } else if (typeof cellData === 'string' && cellData.startsWith('http')) {
                    cell.innerHTML = `<a href="${cellData}" target="_blank">Lihat Foto</a>`;
                } else {
                    cell.textContent = cellData || '';
                }
                row.appendChild(cell);
            });
            const npwpd = rowData['NPWPD'];
            const aksiCell = document.createElement('td');
            aksiCell.innerHTML = `<button class="btn-aksi btn-edit" onclick="handleEditWpClick('${npwpd}')">Edit</button> <button class="btn-aksi btn-hapus" onclick="handleDeleteWpClick('${npwpd}')">Hapus</button>`;
            row.appendChild(aksiCell);
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="12">Tidak ada data ditemukan.</td></tr>`;
    }
}

function displayDetailData(item) {
    // Foto pemilik di kiri atas (seperti KTP)
    const fotoSlot = document.getElementById('detailFotoKtpSlot');
    const dataSlot = document.getElementById('detailDataKtpSlot');

    if (fotoSlot && dataSlot) {
        fotoSlot.innerHTML = '';
        dataSlot.innerHTML = '';

        if (item['Foto Pemilik']) {
            const img = createSafeElement('img', {
                src: item['Foto Pemilik'],
                alt: 'Foto Pemilik'
            });
            const p = createSafeElement('p', {}, 'Foto Pemilik');
            fotoSlot.appendChild(img);
            fotoSlot.appendChild(p);
        } else {
            const div = createSafeElement('div', {
                style: {
                    width: '120px',
                    height: '150px',
                    background: '#e3e8ee',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#888'
                }
            }, 'Tidak ada foto');
            const p = createSafeElement('p', {}, 'Foto Pemilik');
            fotoSlot.appendChild(div);
            fotoSlot.appendChild(p);
        }

        // Create safe definition list
        const dl = createSafeElement('dl', { className: 'detail-grid' });

        const fields = [
            { dt: 'NPWPD', dd: item.NPWPD },
            { dt: 'Nama Usaha', dd: item['Nama Usaha'] },
            { dt: 'Nama Pemilik', dd: item['Nama Pemilik'] },
            { dt: 'NIK', dd: item['NIK KTP'] },
            { dt: 'Alamat Usaha', dd: item.Alamat },
            { dt: 'No. Telepon', dd: item.Telephone },
            { dt: 'Kelurahan', dd: item.Kelurahan },
            { dt: 'Kecamatan', dd: item.Kecamatan }
        ];

        fields.forEach(field => {
            const dt = createSafeElement('dt', {}, field.dt);
            const dd = createSafeElement('dd', {}, sanitizeHTML(field.dd || '-'));
            dl.appendChild(dt);
            dl.appendChild(dd);
        });

        dataSlot.appendChild(dl);
    }
}

function displayPhotos(item) {
    const fotoContent = document.getElementById('fotoContent');
    if (!fotoContent) return;

    fotoContent.innerHTML = '';

    const fotoData = [
        { label: 'Foto Pemilik', url: item['Foto Pemilik'] },
        { label: 'Foto Tempat Usaha', url: item['Foto Tempat Usaha'] },
        { label: 'Foto KTP', url: item['Foto KTP'] }
    ];

    fotoData.forEach(foto => {
        if (foto.url) {
            const fotoCard = createSafeElement('div', { className: 'foto-card' });
            const img = createSafeElement('img', {
                src: foto.url,
                alt: sanitizeHTML(foto.label)
            });
            const p = createSafeElement('p', {}, sanitizeHTML(foto.label));

            fotoCard.appendChild(img);
            fotoCard.appendChild(p);
            fotoContent.appendChild(fotoCard);
        }
    });
}


function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(""); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Fungsi untuk menampilkan riwayat ketetapan dengan nama layanan yang benar
function displayKetetapanHistory(riwayatData, masterPajakData) {
    const tbody = document.querySelector('#ketetapanTable tbody');
    if (!tbody) return;

    if (riwayatData.length === 0) {
        tbody.innerHTML = '';
        const emptyRow = createSafeElement('tr');
        const emptyCell = createSafeElement('td', {
            colspan: '10',
            style: { textAlign: 'center', padding: '20px', color: '#666' }
        }, 'Belum ada riwayat ketetapan.');
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
    }

    tbody.innerHTML = '';
    riwayatData.forEach((item, index) => {
        // Cari nama layanan dari master pajak
        const masterPajak = masterPajakData.find(mp => mp.KodeLayanan === item.KodeLayanan);
        const namaLayanan = masterPajak ? masterPajak.NamaLayanan : item.KodeLayanan || '-';

        const tr = createSafeElement('tr');

        // Create table cells safely
        const cells = [
            (index + 1).toString(),
            sanitizeHTML(item.ID_Ketetapan || '-'),
            sanitizeHTML(item.MasaPajak || '-'),
            sanitizeHTML(namaLayanan),
            formatRupiah(item.JumlahPokok),
            formatRupiah(item.Denda),
            formatRupiah(item.TotalTagihan),
            sanitizeHTML(item.Status || 'Aktif'),
            item.TanggalKetetapan ? new Date(item.TanggalKetetapan).toLocaleDateString('id-ID') : '-'
        ];

        cells.forEach(cellData => {
            const td = createSafeElement('td', {}, cellData);
            tr.appendChild(td);
        });

        // Create action cell with safe buttons
        const actionCell = createSafeElement('td');

        const editButton = createSafeElement('button', {
            style: {
                background: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
            },
            onclick: `handleEditKetetapanClick('${sanitizeHTML(item.ID_Ketetapan || '')}')`
        }, 'Edit');

        const deleteButton = createSafeElement('button', {
            style: {
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                marginLeft: '4px'
            },
            onclick: `handleDeleteKetetapanClick('${sanitizeHTML(item.ID_Ketetapan || '')}')`
        }, 'Hapus');

        actionCell.appendChild(editButton);
        actionCell.appendChild(deleteButton);
        tr.appendChild(actionCell);

        tbody.appendChild(tr);
    });
}

// Fungsi untuk menampilkan riwayat pembayaran
function displayPembayaranHistory(riwayatData) {
    const tbody = document.querySelector('#pembayaranTable tbody');
    if (!tbody) return;

    if (riwayatData.length === 0) {
        tbody.innerHTML = '';
        const emptyRow = createSafeElement('tr');
        const emptyCell = createSafeElement('td', {
            colspan: '9',
            style: { textAlign: 'center', padding: '20px', color: '#666' }
        }, 'Belum ada riwayat pembayaran.');
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
    }

    tbody.innerHTML = '';
    riwayatData.forEach((item, index) => {
        const tr = createSafeElement('tr');

        // Create table cells safely
        const cells = [
            (index + 1).toString(),
            sanitizeHTML(item.ID_Pembayaran || '-'),
            sanitizeHTML(item.ID_Ketetapan || '-'),
            item.TanggalBayar ? new Date(item.TanggalBayar).toLocaleDateString('id-ID') : '-',
            formatRupiah(item.JumlahBayar),
            sanitizeHTML(item.MetodeBayar || '-'),
            sanitizeHTML(item.Operator || '-')
        ];

        cells.forEach(cellData => {
            const td = createSafeElement('td', {}, cellData);
            tr.appendChild(td);
        });

        // Status cell with color
        const statusCell = createSafeElement('td');
        const statusSpan = createSafeElement('span', {
            style: {
                color: item.StatusPembayaran === 'Sukses' ? 'green' : 'red',
                fontWeight: 'bold'
            }
        }, sanitizeHTML(item.StatusPembayaran || '-'));
        statusCell.appendChild(statusSpan);
        tr.appendChild(statusCell);

        // Action cell with print button
        const actionCell = createSafeElement('td');
        const printButton = createSafeElement('button', {
            style: {
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
            },
            onclick: `printBuktiBayar('${sanitizeHTML(item.ID_Pembayaran || '')}')`
        }, 'Print');
        actionCell.appendChild(printButton);
        tr.appendChild(actionCell);

        tbody.appendChild(tr);
    });
}

// Fungsi untuk menampilkan status fiskal
function displayFiskalStatus(npwpd, data) {
    const pembayaran = data.pembayaran || [];
    const ketetapan = data.ketetapan || [];
    const masterPajak = data.masterPajak || [];

    // Kelompokkan pembayaran per NPWPD
    const pembayaranWP = pembayaran.filter(p => p.NPWPD === npwpd);

    let lunasReklame = false;
    let lunasSampah = false;

    pembayaranWP.forEach(bayar => {
        const ket = ketetapan.find(k => k.ID_Ketetapan === bayar.ID_Ketetapan);
        if (!ket) return;

        const master = masterPajak.find(m => m.KodeLayanan === ket.KodeLayanan);
        if (!master) return;

        if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('reklame') && bayar.StatusPembayaran === 'Sukses') {
            lunasReklame = true;
        }
        if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('sampah') && bayar.StatusPembayaran === 'Sukses') {
            lunasSampah = true;
        }
    });

    // Update status elements safely
    const statusReklame = document.getElementById('statusReklame');
    const statusSampah = document.getElementById('statusSampah');
    const statusFiskalOverall = document.getElementById('statusFiskalOverall');
    const jatuhTempoFiskal = document.getElementById('jatuhTempoFiskal');

    if (statusReklame) {
        statusReklame.innerHTML = '';
        const span = createSafeElement('span', {
            style: { color: lunasReklame ? 'green' : 'red', fontWeight: 'bold' }
        }, lunasReklame ? '✅ Lunas' : '❌ Belum Lunas');
        statusReklame.appendChild(span);
    }

    if (statusSampah) {
        statusSampah.innerHTML = '';
        const span = createSafeElement('span', {
            style: { color: lunasSampah ? 'green' : 'red', fontWeight: 'bold' }
        }, lunasSampah ? '✅ Lunas' : '❌ Belum Lunas');
        statusSampah.appendChild(span);
    }

    const statusFiskal = lunasReklame && lunasSampah;
    if (statusFiskalOverall) {
        statusFiskalOverall.innerHTML = '';
        const span = createSafeElement('span', {
            style: { color: statusFiskal ? 'green' : 'red', fontWeight: 'bold' }
        }, statusFiskal ? '✅ Memenuhi Syarat' : '❌ Belum Memenuhi Syarat');
        statusFiskalOverall.appendChild(span);
    }

    // Hitung jatuh tempo fiskal (1 tahun dari pembayaran terakhir)
    if (jatuhTempoFiskal) {
        if (statusFiskal && pembayaranWP.length > 0) {
            const pembayaranSukses = pembayaranWP.filter(p => p.StatusPembayaran === 'Sukses');
            if (pembayaranSukses.length > 0) {
                const pembayaranTerakhir = pembayaranSukses.sort((a, b) => new Date(b.TanggalBayar) - new Date(a.TanggalBayar))[0];
                const tanggalBayar = new Date(pembayaranTerakhir.TanggalBayar);
                const jatuhTempo = new Date(tanggalBayar.getFullYear() + 1, tanggalBayar.getMonth(), tanggalBayar.getDate());
                jatuhTempoFiskal.textContent = jatuhTempo.toLocaleDateString('id-ID');
            } else {
                jatuhTempoFiskal.textContent = '-';
            }
        } else {
            jatuhTempoFiskal.textContent = '-';
        }
    }
}

// Fungsi helper untuk format rupiah
function formatRupiah(angka) {
    if (!angka) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(angka);
}

// Fungsi standar untuk tabel yang bisa digunakan di seluruh aplikasi
function createStandardTable(tableId, data, config) {
    const tableHead = document.querySelector(`#${tableId} thead`);
    const tableBody = document.querySelector(`#${tableId} tbody`);
    
    if (!tableHead || !tableBody) return;
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${config.columns.length + (config.showCheckbox ? 1 : 0) + (config.actions ? 1 : 0)}" style="text-align: center; padding: 40px; color: #666;">${config.emptyMessage || 'Tidak ada data ditemukan.'}</td></tr>`;
        return;
    }
    
    // Buat header
    const headerRow = document.createElement('tr');
    // Kolom checkbox jika diaktifkan
    if (config.showCheckbox) {
        const thCheck = document.createElement('th');
        thCheck.innerHTML = '<input type="checkbox" id="checkAllKetetapan">';
        headerRow.appendChild(thCheck);
    }
    config.columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.label;
        headerRow.appendChild(th);
    });
    // Kolom aksi jika ada
    if (config.actions) {
        const actionTh = document.createElement('th');
        actionTh.textContent = 'Aksi';
        headerRow.appendChild(actionTh);
    }
    tableHead.appendChild(headerRow);
    
    // Buat baris data
    data.forEach((rowData, index) => {
        const row = document.createElement('tr');
        // Terapkan class baris jika ada config.rowClass
        if (config.rowClass) {
            const rowClass = config.rowClass(rowData);
            if (rowClass) row.classList.add(rowClass);
        }
        // Kolom checkbox jika diaktifkan
        if (config.showCheckbox) {
            const tdCheck = document.createElement('td');
            const checkboxValue = rowData[config.idKey || 'ID_Ketetapan']; // Gunakan idKey jika ada, default ke ID_Ketetapan
            tdCheck.innerHTML = `<input type="checkbox" class="rowCheckKetetapan" value="${checkboxValue}">`;
            row.appendChild(tdCheck);
        }
        config.columns.forEach(column => {
            const cell = document.createElement('td');
            let cellData = rowData[column.key];
            // Format data berdasarkan tipe
            if (column.type === 'rupiah') {
                cellData = formatRupiah(cellData);
            } else if (column.type === 'date') {
                cellData = cellData ? new Date(cellData).toLocaleDateString('id-ID') : '-';
            } else if (column.type === 'link') {
                cellData = `<a href="${column.linkUrl}${rowData[column.linkKey]}" style="color: #1976d2; text-decoration: none;">${cellData}</a>`;
            } else if (column.type === 'status') {
                const statusColor = column.statusColors[cellData] || '#666';
                cellData = `<span style="color: ${statusColor}; font-weight: bold;">${cellData}</span>`;
            } else if (column.type === 'photo') {
                cellData = cellData && cellData.startsWith('http') ? 
                    `<a href="${cellData}" target="_blank">Lihat Foto</a>` : 
                    (cellData || '');
            }
            if (column.type === 'link' || column.type === 'status' || column.type === 'photo') {
                cell.innerHTML = cellData;
            } else {
                cell.textContent = cellData || '';
            }
            row.appendChild(cell);
        });
        // Kolom aksi jika ada
        if (config.actions) {
            const actionCell = document.createElement('td');
            let actionButtons = '';
            config.actions.forEach(action => {
                const buttonClass = action.class || 'btn-aksi';
                const buttonStyle = action.style || '';
                const icon = action.icon || '';
                if (action.type === 'print') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass}" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 4px;">${icon} Print</button>`;
                } else if (action.type === 'edit') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass} btn-edit" style="margin-right: 4px;">${icon} Edit</button>`;
                } else if (action.type === 'delete') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass} btn-hapus">${icon} Hapus</button>`;
                } else if (action.type === 'custom') {
                    actionButtons += `<button onclick="${action.onClick}('${rowData[action.key]}')" class="${buttonClass}" style="${buttonStyle}">${icon} ${action.label}</button>`;
                }
            });
            actionCell.innerHTML = actionButtons;
            row.appendChild(actionCell);
        }
        tableBody.appendChild(row);
    });
}

// Fungsi untuk membuat search dan filter standar
function setupStandardSearchFilter(searchInputId, filterSelects, data, displayFunction) {
    const searchInput = document.getElementById(searchInputId);
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            performStandardSearch(data, displayFunction);
        });
    }
    
    filterSelects.forEach(filterConfig => {
        const filterSelect = document.getElementById(filterConfig.id);
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                performStandardSearch(data, displayFunction);
            });
        }
    });
}

function performStandardSearch(data, displayFunction) {
    const searchInput = document.querySelector('input[id*="search"]');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filteredData = data;
    
    if (searchTerm) {
        filteredData = data.filter(item => {
            return Object.values(item).some(value => 
                value && value.toString().toLowerCase().includes(searchTerm)
            );
        });
    }
    
    displayFunction(filteredData);
}

// Tambahkan/ubah fungsi loadKetetapanData agar selalu update dataKetetapanGlobal
async function loadKetetapanData() {
    try {
        const data = await fetchAllData();
        dataKetetapanGlobal = data.ketetapan || [];
        wajibPajakDataGlobal = data.wajibPajak || [];
        masterPajakDataGlobal = data.masterPajak || [];
        pembayaranDataGlobal = data.pembayaran || [];
        // Render tabel ketetapan
        displayKetetapanHistory(dataKetetapanGlobal, masterPajakDataGlobal);
    } catch (error) {
        document.querySelector('#ketetapanTable tbody').innerHTML = 
            '<tr><td colspan="12" style="text-align: center; padding: 40px; color: #666;">Gagal memuat data.</td></tr>';
    }
}
// Pastikan loadKetetapanData dipanggil setelah edit/hapus/tambah
async function handleUpdateKetetapanSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateKetetapanButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    try {
        const updatedData = {
            action: 'updateKetetapan', id_ketetapan: document.getElementById('editKetetapanId').value,
            masaPajak: document.getElementById('editKetetapanMasaPajak').value,
            jumlahPokok: document.getElementById('editKetetapanJumlahPokok').value,
            catatan: document.getElementById('editKetetapanCatatan').value
        };
        const result = await postData(updatedData);
        alert(result.message || 'Ketetapan berhasil diperbarui!');
        document.getElementById('editKetetapanModal').style.display = 'none';
        await loadKetetapanData(); // refresh data setelah edit
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}
async function handleDeleteKetetapanClick(idKetetapan) {
    if (!confirm(`Anda yakin ingin menghapus ketetapan dengan ID: ${idKetetapan}?`)) return;
    try {
        const result = await postData({ action: 'deleteKetetapan', idKetetapan: idKetetapan });
        alert(result.message || 'Ketetapan berhasil dihapus.');
        await loadKetetapanData(); // refresh data setelah hapus
    } catch (error) {
        alert('Gagal menghapus ketetapan: ' + error.message);
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch('/.netlify/functions/api');

        // Check if response is HTML (API not available)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            console.warn('API not available, showing offline mode');
            showOfflineDashboard();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Check if data has error status
        if (data.status === 'error' || data.error) {
            console.warn('API returned error:', data.error);
            showOfflineDashboard();
            return;
        }

        // Update statistik
        const wajibPajak = data.wajibPajak || [];
        const ketetapan = data.ketetapan || [];
        const pembayaran = data.pembayaran || [];
        const targetList = data.targetPajakRetribusi || [];
        const tahunBerjalan = new Date().getFullYear();
        
        // Hitung total target tahun berjalan
        const totalTargetTahun = targetList.filter(t => t.Tahun == tahunBerjalan).reduce((sum, t) => sum + (parseFloat(t.Target) || 0), 0);
        
        // Hitung statistik lama
        document.getElementById('totalWp').textContent = wajibPajak.length;
        document.getElementById('totalKetetapan').textContent = ketetapan.length;
        document.getElementById('totalPembayaran').textContent = pembayaran.length;
        
        // Hitung SKPD/SKRD (ketetapan yang sudah lunas)
        const ketetapanLunas = ketetapan.filter(k => {
            const pembayaranKetetapan = pembayaran.filter(p => p.ID_Ketetapan === k.ID_Ketetapan);
            return pembayaranKetetapan.some(p => p.StatusPembayaran === 'Sukses');
        });
        document.getElementById('totalSkpdSkrd').textContent = ketetapanLunas.length;
        
        // Hitung SSPD/SSRD (pembayaran sukses)
        const pembayaranSukses = pembayaran.filter(p => p.StatusPembayaran === 'Sukses');
        document.getElementById('totalSspdSsrd').textContent = pembayaranSukses.length;
        
        // Hitung Fiskal (NPWPD yang sudah lunas reklame dan sampah)
        const npwpdMap = {};
        pembayaran.forEach(row => {
            if (!npwpdMap[row.NPWPD]) npwpdMap[row.NPWPD] = [];
            npwpdMap[row.NPWPD].push(row);
        });
        
        let totalFiskal = 0;
        Object.keys(npwpdMap).forEach(npwpd => {
            let lunasReklame = false;
            let lunasSampah = false;
            npwpdMap[npwpd].forEach(bayar => {
                const ket = ketetapan.find(k => k.ID_Ketetapan === bayar.ID_Ketetapan);
                if (!ket) return;
                const master = data.masterPajak?.find(m => m.KodeLayanan === ket.KodeLayanan);
                if (!master) return;
                if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('reklame') && bayar.StatusPembayaran === 'Sukses') lunasReklame = true;
                if (master.NamaLayanan && master.NamaLayanan.toLowerCase().includes('sampah') && bayar.StatusPembayaran === 'Sukses') lunasSampah = true;
            });
            if (lunasReklame && lunasSampah) totalFiskal++;
        });
        document.getElementById('totalFiskal').textContent = totalFiskal;
        
        // Hitung total nilai ketetapan
        const totalNilaiKetetapan = ketetapan.reduce((sum, k) => {
            return sum + (parseFloat(k.TotalTagihan) || 0);
        }, 0);
        document.getElementById('totalNilaiKetetapan').textContent = `Rp ${totalNilaiKetetapan.toLocaleString('id-ID')}`;
        
        // Hitung total nilai setoran
        const totalNilaiSetoran = pembayaranSukses.reduce((sum, p) => {
            return sum + (parseFloat(p.JumlahBayar) || 0);
        }, 0);
        document.getElementById('totalNilaiSetoran').textContent = `Rp ${totalNilaiSetoran.toLocaleString('id-ID')}`;
        
        // Update grafik per bulan (tambahkan target bulanan)
        updateDashboardChart(ketetapan, pembayaran, totalTargetTahun);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('totalWp').textContent = 'Error';
        document.getElementById('totalKetetapan').textContent = 'Error';
        document.getElementById('totalPembayaran').textContent = 'Error';
        document.getElementById('totalSkpdSkrd').textContent = 'Error';
        document.getElementById('totalSspdSsrd').textContent = 'Error';
        document.getElementById('totalFiskal').textContent = 'Error';
        document.getElementById('totalNilaiKetetapan').textContent = 'Error';
        document.getElementById('totalNilaiSetoran').textContent = 'Error';
    }
}

function updateRevenueReport(data) {
    // Ambil data master pajak/retribusi dan target
    const masterList = data.masterPajak || [];
    const targetList = data.targetPajakRetribusi || [];
    const pembayaranList = data.pembayaran || [];
    const tahunDipilih = (document.getElementById('dateRangeTahun')?.value || new Date().getFullYear()).toString();

    // Siapkan breakdown dinamis
    const breakdownContainer = document.getElementById('revenueBreakdown');
    breakdownContainer.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'revenue-header';
    header.style.display = 'flex';
    header.style.fontWeight = 'bold';
    header.style.gap = '24px';
    header.style.marginBottom = '4px';
    header.innerHTML = `
        <span style="width: 120px;">Jenis Pajak</span>
        <span style="width: 120px;">Realisasi</span>
        <span style="width: 120px;">Target</span>
        <span style="width: 80px;">Kontribusi</span>
        <span style="width: 80px;">Capaian</span>
    `;
    breakdownContainer.appendChild(header);

    // Hitung total realisasi semua jenis
    let totalRealisasi = 0;
    const realisasiByKode = {};
    pembayaranList.forEach(p => {
        if (p.StatusPembayaran !== 'Sukses') return;
        const ketetapan = data.ketetapan.find(k => k.ID_Ketetapan === p.ID_Ketetapan);
        if (!ketetapan) return;
        const kode = ketetapan.KodeLayanan;
        if (!realisasiByKode[kode]) realisasiByKode[kode] = 0;
        realisasiByKode[kode] += parseFloat(p.JumlahBayar) || 0;
        totalRealisasi += parseFloat(p.JumlahBayar) || 0;
    });

    // Render breakdown per jenis pajak/retribusi
    masterList.forEach(row => {
        const kode = row.KodeLayanan;
        const nama = row.NamaLayanan;
        const targetObj = targetList.find(t => t.KodeLayanan === kode && t.Tahun == tahunDipilih);
        const target = targetObj ? (parseFloat(targetObj.Target) || 0) : 0;
        const realisasi = realisasiByKode[kode] || 0;
        const kontribusi = totalRealisasi > 0 ? (realisasi / totalRealisasi * 100).toFixed(1) : 0;
        const capaian = target > 0 ? (realisasi / target * 100).toFixed(1) : 0;

        const item = document.createElement('div');
        item.className = 'revenue-item';
        item.style.display = 'flex';
        item.style.gap = '24px';
        item.innerHTML = `
            <span style="width: 120px;">${nama}</span>
            <span style="width: 120px;">Rp ${realisasi.toLocaleString('id-ID')}</span>
            <span style="width: 120px;">Rp ${target.toLocaleString('id-ID')}</span>
            <span style="width: 80px;">${kontribusi}%</span>
            <span style="width: 80px;">${capaian}%</span>
        `;
        breakdownContainer.appendChild(item);
    });
}

function updateDashboardChart(ketetapan, pembayaran, totalTargetTahun) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    // Data nilai ketetapan per bulan
    const nilaiKetetapanPerBulan = new Array(12).fill(0);
    ketetapan.forEach(k => {
        if (k.TanggalKetetapan) {
            const date = new Date(k.TanggalKetetapan);
            if (date.getFullYear() === currentYear) {
                nilaiKetetapanPerBulan[date.getMonth()] += parseFloat(k.TotalTagihan) || 0;
            }
        }
    });
    // Data nilai pembayaran per bulan
    const nilaiPembayaranPerBulan = new Array(12).fill(0);
    pembayaran.forEach(p => {
        if (p.TanggalBayar && p.StatusPembayaran === 'Sukses') {
            const date = new Date(p.TanggalBayar);
            if (date.getFullYear() === currentYear) {
                nilaiPembayaranPerBulan[date.getMonth()] += parseFloat(p.JumlahBayar) || 0;
            }
        }
    });
    // Data target bulanan (bagi rata)
    const targetBulanan = new Array(12).fill(totalTargetTahun / 12);
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    if (window.dashboardChartInstance) {
        window.dashboardChartInstance.destroy();
    }
    window.dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: `Nilai Ketetapan (${currentYear})`,
                    data: nilaiKetetapanPerBulan,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: false,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: `Nilai Pembayaran (${currentYear})`,
                    data: nilaiPembayaranPerBulan,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: `Target Bulanan (${currentYear})`,
                    data: targetBulanan,
                    borderColor: '#F59E42',
                    backgroundColor: 'rgba(245, 158, 66, 0.1)',
                    borderDash: [8, 4],
                    pointStyle: 'rectRot',
                    tension: 0.1,
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 14 }
                    }
                },
                title: {
                    display: true,
                    text: `Grafik Pendapatan Daerah Tahun ${currentYear}`,
                    font: { size: 18, weight: 'bold' },
                    padding: { top: 10, bottom: 20 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return context.dataset.label + ': Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Bulan', font: { size: 14, weight: 'bold' } },
                    ticks: { font: { size: 12 } }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Nilai (Rupiah)', font: { size: 14, weight: 'bold' } },
                    ticks: {
                        font: { size: 12 },
                        callback: function(value) {
                            if (value >= 1000000000) {
                                return 'Rp ' + (value / 1000000000).toFixed(1) + 'M';
                            } else if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'Jt';
                            } else if (value >= 1000) {
                                return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            }
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            },
            elements: { point: { hoverRadius: 8 } }
        }
    });
}