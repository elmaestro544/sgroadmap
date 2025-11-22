
import React, { useState, useEffect, useRef } from 'react';
import { i18n, SERVICES } from '../constants.js';
import { UsersIcon, ChartBarIcon, CogIcon, TrendingUpIcon, CurrencyDollarIcon, SearchIcon, GridIcon, PhoneIcon, EnvelopeIcon } from './Shared.js';
import * as settingsService from '../services/settingsService.js';

// --- Mock Data ---
const MOCK_USERS = Array.from({ length: 25 }).map((_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i === 0 ? 'Admin' : (i % 5 === 0 ? 'Premium' : 'Free'),
    status: i % 3 === 0 ? 'Active' : 'Offline',
    joined: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toLocaleDateString()
}));

// --- Sub-Components defined OUTSIDE to prevent re-renders ---

const StatCard = ({ title, value, icon: Icon, trend }) => (
    React.createElement('div', { className: "bg-white dark:bg-card-gradient p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300" },
        React.createElement('div', { className: "flex items-center justify-between mb-4" },
            React.createElement('div', { className: "p-3 bg-brand-red/10 rounded-xl text-brand-red" }, React.createElement(Icon, { className: "h-6 w-6" })),
            React.createElement('span', { className: `text-sm font-bold ${trend >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1` },
                trend >= 0 ? '+' : '', `${trend}%`, React.createElement(TrendingUpIcon, { className: `h-4 w-4 ${trend < 0 ? 'transform rotate-180' : ''}` })
            )
        ),
        React.createElement('h3', { className: "text-slate-500 dark:text-brand-text-light text-sm font-medium uppercase tracking-wider" }, title),
        React.createElement('p', { className: "text-2xl font-extrabold text-slate-900 dark:text-white mt-1" }, value)
    )
);

const SidebarItem = ({ id, label, icon: Icon, activeTab, setActiveTab }) => (
    React.createElement('button', {
        onClick: () => setActiveTab(id),
        className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'text-slate-600 dark:text-brand-text-light hover:bg-slate-100 dark:hover:bg-white/5'}`
    },
        React.createElement(Icon, { className: "h-5 w-5" }),
        React.createElement('span', { className: "font-semibold" }, label)
    )
);

const OverviewTab = ({ t, theme }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartRef.current && window.Chart) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); // brand-red
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

            chartInstance.current = new window.Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'New Users',
                        data: [65, 59, 80, 81, 56, 120],
                        borderColor: '#ef4444',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        x: { 
                            grid: { display: false, drawBorder: false },
                            ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }
                        },
                        y: { 
                            grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderDash: [5, 5] },
                            ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }
                        }
                    }
                }
            });
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [theme]);

    return React.createElement('div', { className: "space-y-6" },
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
            React.createElement(StatCard, { title: t.adminStatsTotalUsers, value: "1,234", icon: UsersIcon, trend: 12 }),
            React.createElement(StatCard, { title: t.adminStatsRevenue, value: "$45,678", icon: CurrencyDollarIcon, trend: 8 }),
            React.createElement(StatCard, { title: t.adminStatsActiveSessions, value: "567", icon: ChartBarIcon, trend: -2 })
        ),
        React.createElement('div', { className: "bg-white dark:bg-card-gradient p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm" },
            React.createElement('h3', { className: "text-lg font-bold text-slate-900 dark:text-white mb-6" }, "User Growth"),
            React.createElement('div', { className: "relative h-80 w-full" },
                React.createElement('canvas', { ref: chartRef })
            )
        )
    );
};

const ServicesTab = ({ t, siteSettings, toggleService }) => (
    React.createElement('div', { className: "bg-white dark:bg-card-gradient rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden" },
        React.createElement('div', { className: "p-6 border-b border-slate-200 dark:border-white/10" },
            React.createElement('h3', { className: "text-lg font-bold text-slate-900 dark:text-white" }, "Services Management"),
            React.createElement('p', { className: "text-sm text-slate-500 mt-1" }, "Activate or deactivate services for all users.")
        ),
        React.createElement('div', { className: "p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" },
            SERVICES.map(service => {
                const isEnabled = !siteSettings.disabledServices.includes(service.id);
                const ServiceIcon = service.icon;
                return React.createElement('div', { key: service.id, className: "flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5" },
                    React.createElement('div', { className: "flex items-center gap-3" },
                        React.createElement('div', { className: `p-2 rounded-lg ${isEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}` },
                            React.createElement(ServiceIcon, { className: "h-6 w-6" })
                        ),
                        React.createElement('span', { className: "font-semibold text-slate-700 dark:text-brand-text" }, t[service.titleKey])
                    ),
                    React.createElement('button', {
                        onClick: () => toggleService(service.id),
                        className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${isEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`
                    },
                        React.createElement('span', {
                            className: `${isEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`
                        })
                    )
                );
            })
        )
    )
);

const UsersTab = ({ t, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return React.createElement('div', { className: "bg-white dark:bg-card-gradient rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden" },
        React.createElement('div', { className: "p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4" },
            React.createElement('h3', { className: "text-lg font-bold text-slate-900 dark:text-white" }, t.adminUsers),
            React.createElement('div', { className: "relative w-full sm:w-64" },
                React.createElement(SearchIcon, { className: "absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-slate-400" }),
                React.createElement('input', {
                    type: "text",
                    placeholder: t.adminUserSearch,
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    className: "w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/50 text-sm"
                })
            )
        ),
        React.createElement('div', { className: "overflow-x-auto" },
            React.createElement('table', { className: "w-full text-sm text-left" },
                React.createElement('thead', { className: "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-brand-text-light uppercase text-xs" },
                    React.createElement('tr', null,
                        React.createElement('th', { className: "px-6 py-3 font-medium" }, t.adminTableName),
                        React.createElement('th', { className: "px-6 py-3 font-medium hidden md:table-cell" }, t.adminTableEmail),
                        React.createElement('th', { className: "px-6 py-3 font-medium" }, t.adminTableRole),
                        React.createElement('th', { className: "px-6 py-3 font-medium" }, t.adminTableStatus),
                        React.createElement('th', { className: "px-6 py-3 font-medium text-right" }, t.adminTableActions)
                    )
                ),
                React.createElement('tbody', { className: "divide-y divide-slate-200 dark:divide-white/10" },
                    filteredUsers.map(user => (
                        React.createElement('tr', { key: user.id, className: "hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" },
                            React.createElement('td', { className: "px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3" },
                                React.createElement('div', { className: "h-8 w-8 rounded-full bg-gradient-to-tr from-brand-red to-brand-blue flex items-center justify-center text-white font-bold text-xs" }, user.name.charAt(0)),
                                user.name
                            ),
                            React.createElement('td', { className: "px-6 py-4 text-slate-500 dark:text-brand-text-light hidden md:table-cell" }, user.email),
                            React.createElement('td', { className: "px-6 py-4" },
                                React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : (user.role === 'Premium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300')}` }, user.role)
                            ),
                            React.createElement('td', { className: "px-6 py-4" },
                                React.createElement('span', { className: `flex items-center gap-2 ${user.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}` },
                                    React.createElement('span', { className: `h-2 w-2 rounded-full ${user.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}` }),
                                    user.status
                                )
                            ),
                            React.createElement('td', { className: "px-6 py-4 text-right" },
                                React.createElement('button', { className: "text-slate-400 hover:text-brand-red transition-colors" }, "Edit")
                            )
                        )
                    ))
                )
            )
        )
    );
};

const SettingsTab = ({ siteSettings, handleSettingChange, saveSettings }) => (
    React.createElement('div', { className: "max-w-2xl mx-auto space-y-8" },
        React.createElement('div', { className: "bg-white dark:bg-card-gradient p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm" },
            React.createElement('h3', { className: "text-lg font-bold text-slate-900 dark:text-white mb-4" }, "General Settings"),
            React.createElement('div', { className: "space-y-4" },
                React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-slate-700 dark:text-brand-text-light mb-1" }, "Site Name"),
                    React.createElement('input', { 
                        type: "text", 
                        name: "siteName",
                        value: siteSettings.siteName,
                        onChange: handleSettingChange,
                        className: "w-full p-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none" 
                    })
                ),
                React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-slate-700 dark:text-brand-text-light mb-1" }, "Contact Email"),
                    React.createElement('div', { className: "relative" },
                        React.createElement(EnvelopeIcon, { className: "absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-slate-400" }),
                        React.createElement('input', { 
                            type: "email", 
                            name: "contactEmail",
                            value: siteSettings.contactEmail,
                            onChange: handleSettingChange,
                            className: "w-full pl-10 p-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none" 
                        })
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { className: "block text-sm font-medium text-slate-700 dark:text-brand-text-light mb-1" }, "Contact Phone"),
                    React.createElement('div', { className: "relative" },
                        React.createElement(PhoneIcon, { className: "absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-slate-400" }),
                        React.createElement('input', { 
                            type: "text", 
                            name: "contactPhone",
                            value: siteSettings.contactPhone,
                            onChange: handleSettingChange,
                            className: "w-full pl-10 p-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none" 
                        })
                    )
                ),
                React.createElement('button', {
                    onClick: saveSettings,
                    className: "w-full bg-brand-red hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors mt-4"
                }, "Save Changes")
            )
        )
    )
);

const AdminDashboard = ({ language, theme }) => {
    const t = i18n[language];
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState(MOCK_USERS);
    const [siteSettings, setSiteSettings] = useState(settingsService.getSettings());

    const handleSettingChange = (e) => {
        const { name, value } = e.target;
        const newSettings = { ...siteSettings, [name]: value };
        setSiteSettings(newSettings);
    };

    const saveSettings = () => {
        settingsService.saveSettings(siteSettings);
        alert("Settings saved successfully!");
    };

    const toggleService = (serviceId) => {
        const isDisabled = siteSettings.disabledServices.includes(serviceId);
        let newDisabledServices;
        if (isDisabled) {
            newDisabledServices = siteSettings.disabledServices.filter(id => id !== serviceId);
        } else {
            newDisabledServices = [...siteSettings.disabledServices, serviceId];
        }
        const newSettings = { ...siteSettings, disabledServices: newDisabledServices };
        setSiteSettings(newSettings);
        settingsService.saveSettings(newSettings);
    };

    return React.createElement('div', { className: "container mx-auto p-6 flex flex-col lg:flex-row gap-8 min-h-screen" },
        // Sidebar
        React.createElement('div', { className: "lg:w-64 flex-shrink-0 space-y-2" },
            React.createElement('div', { className: "mb-8 px-4" },
                React.createElement('h2', { className: "text-2xl font-bold text-slate-900 dark:text-white" }, t.adminTitle),
                React.createElement('p', { className: "text-sm text-slate-500" }, "v1.2.0")
            ),
            React.createElement(SidebarItem, { id: 'overview', label: t.adminOverview, icon: ChartBarIcon, activeTab, setActiveTab }),
            React.createElement(SidebarItem, { id: 'services', label: "Services", icon: GridIcon, activeTab, setActiveTab }),
            React.createElement(SidebarItem, { id: 'users', label: t.adminUsers, icon: UsersIcon, activeTab, setActiveTab }),
            React.createElement(SidebarItem, { id: 'settings', label: t.adminSettings, icon: CogIcon, activeTab, setActiveTab })
        ),
        
        // Content Area
        React.createElement('div', { className: "flex-grow" },
            activeTab === 'overview' && React.createElement(OverviewTab, { t, theme }),
            activeTab === 'services' && React.createElement(ServicesTab, { t, siteSettings, toggleService }),
            activeTab === 'users' && React.createElement(UsersTab, { t, users }),
            activeTab === 'settings' && React.createElement(SettingsTab, { siteSettings, handleSettingChange, saveSettings })
        )
    );
};

export default AdminDashboard;
