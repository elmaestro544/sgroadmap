
const SETTINGS_KEY = 'scigenius_site_settings';

const defaultSettings = {
    contactEmail: 'roadmap.casa@gmail.com',
    contactPhone: '+1 234 567 890',
    disabledServices: [], // Array of service IDs
    siteName: 'SciGenius',
    maintenanceMode: false,
    allowRegistration: true
};

export const getSettings = () => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch (e) {
        console.error("Failed to load settings:", e);
        return defaultSettings;
    }
};

export const saveSettings = (settings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        // Dispatch event for components to reactively update
        window.dispatchEvent(new Event('settingsChanged'));
    } catch (e) {
        console.error("Failed to save settings:", e);
    }
};

export const isServiceEnabled = (serviceId) => {
    const settings = getSettings();
    return !settings.disabledServices.includes(serviceId);
};
