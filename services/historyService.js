const HISTORY_KEY = 'scigenius_history';
const MAX_HISTORY_ITEMS = 20;

const getFullHistory = () => {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : {};
    } catch (e) {
        console.error("Failed to parse history from localStorage", e);
        return {};
    }
};

const saveFullHistory = (history) => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save history to localStorage", e);
    }
};

export const getHistory = (userEmail, serviceId) => {
    if (!userEmail) return [];
    const fullHistory = getFullHistory();
    return fullHistory[userEmail]?.[serviceId] || [];
};

export const addHistoryItem = (userEmail, serviceId, item) => {
    if (!userEmail) return;
    const fullHistory = getFullHistory();
    
    if (!fullHistory[userEmail]) {
        fullHistory[userEmail] = {};
    }
    if (!fullHistory[userEmail][serviceId]) {
        fullHistory[userEmail][serviceId] = [];
    }
    
    const newItem = { ...item, id: Date.now(), timestamp: new Date().toISOString() };
    
    // Add new item to the front
    fullHistory[userEmail][serviceId].unshift(newItem);
    
    // Keep history to a reasonable size
    fullHistory[userEmail][serviceId] = fullHistory[userEmail][serviceId].slice(0, MAX_HISTORY_ITEMS);
    
    saveFullHistory(fullHistory);
};

export const clearHistory = (userEmail, serviceId) => {
    if (!userEmail) return;
    const fullHistory = getFullHistory();
    if (fullHistory[userEmail]?.[serviceId]) {
        fullHistory[userEmail][serviceId] = [];
        saveFullHistory(fullHistory);
    }
    return []; // Return empty array for immediate state update
};
