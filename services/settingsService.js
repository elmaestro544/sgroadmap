
const SETTINGS_KEY = 'scigenius_site_settings';

const defaultSettings = {
    contactEmail: 'info@roadmap.casa',
    contactPhone: '+966 542398764',
    disabledServices: [], // Array of service IDs
    siteName: 'SciGenius',
    maintenanceMode: false,
    allowRegistration: true,
    // Updated to a reliable icon URL
    chatAvatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png',
    teamMembers: [
        { name: 'Dr. Arin', role: 'AI Lead', img: 'https://i.pravatar.cc/150?u=1' },
        { name: 'Noor', role: 'UX Engineer', img: 'https://i.pravatar.cc/150?u=2' },
        { name: 'Zayn', role: 'Lead Researcher', img: 'https://i.pravatar.cc/150?u=3' },
    ]
};

export const getSettings = () => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with default to ensure new keys (like teamMembers) exist if local storage is old
            return { ...defaultSettings, ...parsed };
        }
        return defaultSettings;
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
