

import React, { useState, useEffect } from 'react';
import { AppView, Language, i18n, SERVICE_VIEW_IDS } from './constants.js';
import Home from './components/Home.js';
import Dashboard from './components/Dashboard.js';
import About from './components/About.js';
import Contact from './components/Contact.js';
import Pricing from './components/Pricing.js';
import Terms from './components/Terms.js';
import Privacy from './components/Privacy.js';
import AdminDashboard from './components/AdminDashboard.js';
import { UserIcon, Logo, SunIcon, MoonIcon, MenuIcon, CloseIcon, FacebookIcon, LinkedinIcon, TelegramIcon } from './components/Shared.js';
import { isAnyModelConfigured } from './services/geminiService.js';
import * as supabaseService from './services/supabaseService.js';
import AuthModal from './components/AuthModal.js';

// Welcome Modal Component
const WelcomeModal = ({ isOpen, onClose, onAuthClick, language }) => {
    const t = i18n[language];
    if (!isOpen) return null;

    const WelcomeArt = () => (
         React.createElement('div', { className: "relative w-full aspect-video rounded-t-xl overflow-hidden" },
            // Background with spinning gradient
            React.createElement('div', { className: 'absolute inset-0 bg-dark-bg' }),
            React.createElement('div', { className: 'absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.3)_0%,_rgba(24,25,42,0)_60%)]', style: { animation: 'spin 10s linear infinite' } }),
             // SVG Content
            React.createElement('svg', { 
                viewBox: "0 0 400 200", 
                className: "absolute inset-0 w-full h-full",
                preserveAspectRatio: "xMidYMid slice"
            },
                React.createElement('defs', null,
                    React.createElement('filter', { id: "glow-filter" },
                        React.createElement('feGaussianBlur', { in: "SourceAlpha", stdDeviation: "3", result: "blur" }),
                        React.createElement('feFlood', { floodColor: "#ef4444", result: "flood" }),
                        React.createElement('feComposite', { in: "flood", in2: "blur", operator: "in", result: "glow" }),
                        React.createElement('feMerge', null, 
                            React.createElement('feMergeNode', { in: "glow" }),
                            React.createElement('feMergeNode', { in: "SourceGraphic" })
                        )
                    )
                ),
                // Central Core
                React.createElement('circle', { cx: "200", cy: "100", r: "8", fill: "#ef4444", filter:"url(#glow-filter)" }),
                // Orbits
                React.createElement('ellipse', { cx: "200", cy: "100", rx: "80", ry: "30", fill: "none", stroke: "rgba(255,255,255,0.2)" }),
                React.createElement('ellipse', { cx: "200", cy: "100", rx: "80", ry: "30", transform: "rotate(60 200 100)", fill: "none", stroke: "rgba(255,255,255,0.2)" }),
                React.createElement('ellipse', { cx: "200", cy: "100", rx: "80", ry: "30", transform: "rotate(120 200 100)", fill: "none", stroke: "rgba(255,255,255,0.2)" }),
                // Icons representing services
                React.createElement('path', { d: "M 265 82 L 275 82 M 265 86 L 275 86 M 265 90 L 275 90", fill: 'none', stroke: 'rgba(255,255,255,0.7)', strokeWidth: '1.5', 'aria-label': 'Research' }), // Research
                React.createElement('path', { d: "M 130 120 L 140 125 L 130 130 Z", fill: 'rgba(255,255,255,0.7)', 'aria-label': 'Video' }), // Video
                React.createElement('path', { d: "M 230 125 A 10 10 0 0 1 210 125 Z M 215 125 L 225 125", fill: 'none', stroke: 'rgba(255,255,255,0.7)', strokeWidth: '1.5', 'aria-label': 'Design' }), // Design
                React.createElement('path', { d: "M 160 70 L 160 80 M 165 65 L 165 80 M 170 75 L 170 80", fill: 'none', stroke: 'rgba(255,255,255,0.7)', strokeWidth: '1.5', 'aria-label': 'Data' }) // Data
            )
        )
    );

    return React.createElement('div', { 
        className: "fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[200] flex justify-center items-center backdrop-blur-sm p-4",
        onClick: onClose,
    },
        React.createElement('div', { 
            className: "bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-white/10 transform transition-all animate-fade-in-up",
            onClick: e => e.stopPropagation(),
        },
            React.createElement(WelcomeArt, null),
            React.createElement('div', { className: 'p-6 text-center' },
                React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.welcomeTitle),
                React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2 mb-6" }, t.welcomeDescription),
                React.createElement('div', { className: 'flex flex-col sm:flex-row gap-4' },
                    React.createElement('button', { 
                        onClick: onClose, 
                        className: "w-full bg-brand-red hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50" 
                    }, t.welcomeStart),
                    React.createElement('button', { 
                        onClick: onAuthClick, 
                        className: "w-full bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-dark-bg dark:hover:bg-dark-card dark:text-brand-text font-bold py-3 px-4 rounded-lg transition-colors" 
                    }, t.welcomeAuth)
                )
            )
        )
    );
};


// Header Component
const Header = ({ currentView, setView, language, setLanguage, isAuthenticated, currentUser, onLoginClick, onLogout, theme, toggleTheme, onMenuToggle }) => {
  const t = i18n[language];
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navLinks = [
    { view: AppView.Home, label: t.navHome },
    { view: AppView.About, label: t.navAbout },
    { view: AppView.SciGeniusChat, label: t.navServices }, // Services link goes to dashboard
    { view: AppView.Contact, label: t.navContact },
  ];

  return React.createElement('header', { className: "sticky top-0 z-50 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10" },
    React.createElement('nav', { className: "container mx-auto px-6 py-4 flex justify-between items-center" },
      // Left: Logo
      React.createElement('button', { onClick: () => setView(AppView.Home), className: "flex items-center gap-3" },
          React.createElement(Logo, null),
          React.createElement('h1', { className: "text-2xl font-bold text-slate-900 dark:text-brand-text" }, t.title)
      ),
      // Center: Nav Links
      React.createElement('div', { className: 'hidden md:flex items-center gap-8' },
        navLinks.map(link => 
          React.createElement('button', {
            key: link.view,
            onClick: () => setView(link.view),
            className: `text-base font-medium transition-colors duration-300 ${ (currentView === link.view || (link.view === AppView.SciGeniusChat && SERVICE_VIEW_IDS.includes(currentView))) ? 'text-brand-red' : 'text-slate-500 dark:text-light-gray hover:text-slate-900 dark:hover:text-white'}`
          }, link.label)
        )
      ),
      // Right: Controls
      React.createElement('div', { className: 'hidden md:flex items-center gap-4' },
        React.createElement('button', {
            onClick: toggleTheme,
            'aria-label': 'Toggle theme',
            className: 'text-slate-500 dark:text-light-gray hover:text-brand-red dark:hover:text-brand-red p-2 rounded-full transition-colors'
        }, theme === 'light' ? React.createElement(MoonIcon, null) : React.createElement(SunIcon, null)),
        React.createElement('button', {
          onClick: () => setLanguage(language === Language.EN ? Language.AR : Language.EN),
          className: "text-sm font-semibold text-slate-700 dark:text-white px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-dark-card transition-colors"
        }, language === Language.EN ? 'العربية' : 'English'),
        isAuthenticated ? (
          React.createElement('div', { className: "relative" },
            React.createElement('button', { className: "p-2 text-slate-500 dark:text-light-gray rounded-full", onClick: () => setIsUserMenuOpen(!isUserMenuOpen), onBlur: () => setTimeout(() => setIsUserMenuOpen(false), 200) }, React.createElement(UserIcon, null)),
            isUserMenuOpen && React.createElement('div', { className: "absolute top-full right-0 mt-2 w-48 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-md shadow-lg z-20" },
              currentUser && currentUser.isAdmin && React.createElement('button', { onClick: () => { setView(AppView.Admin); setIsUserMenuOpen(false); }, className: "block w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-light-gray hover:bg-secondary hover:text-white border-b border-slate-100 dark:border-white/5" }, t.navAdmin),
              React.createElement('button', { onClick: () => { onLogout(); setIsUserMenuOpen(false); }, className: "block w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-light-gray hover:bg-secondary hover:text-white rounded-md" }, t.logout)
            )
          )
        ) : (
          React.createElement('button', { onClick: onLoginClick, className: "font-semibold bg-brand-red hover:bg-red-500 text-white px-6 py-2 rounded-lg transition-all" }, t.loginRegister)
        )
      ),
      // Mobile Menu Button
      React.createElement('div', { className: "md:hidden" },
        React.createElement('button', { onClick: onMenuToggle, className: "p-2 text-slate-600 dark:text-light-gray rounded-md" }, React.createElement(MenuIcon, null))
      )
    )
  );
};

// Mobile Menu Component
const MobileMenu = ({ isOpen, onClose, currentView, setView, language, setLanguage, isAuthenticated, onLoginClick, onLogout, theme, toggleTheme }) => {
    if (!isOpen) return null;
    const t = i18n[language];
    
    const handleNavigate = (view) => {
        setView(view);
        onClose();
    };

    const navLinks = [
      { view: AppView.Home, label: t.navHome },
      { view: AppView.About, label: t.navAbout },
      { view: AppView.SciGeniusChat, label: t.navServices },
      { view: AppView.Contact, label: t.navContact },
    ];

    return React.createElement('div', { className: "fixed inset-0 z-[100] bg-white dark:bg-dark-bg" },
        React.createElement('div', { className: 'flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-white/10' },
            React.createElement('button', { onClick: () => handleNavigate(AppView.Home), className: "flex items-center gap-3" },
                React.createElement(Logo, null),
                React.createElement('h1', { className: "text-2xl font-bold text-slate-900 dark:text-brand-text" }, t.title)
            ),
            React.createElement('button', { onClick: onClose, className: "p-2 text-slate-600 dark:text-light-gray" }, React.createElement(CloseIcon, null))
        ),
        React.createElement('div', { className: 'p-6 flex flex-col h-[calc(100vh-77px)]' },
            React.createElement('div', { className: 'flex-grow space-y-2 text-center' },
                navLinks.map(link => 
                    React.createElement('button', { 
                        key: link.view, 
                        onClick: () => handleNavigate(link.view), 
                        className: `w-full text-lg py-3 rounded-md hover:bg-slate-100 dark:hover:bg-dark-card ${ (currentView === link.view || (link.view === AppView.SciGeniusChat && SERVICE_VIEW_IDS.includes(currentView))) ? 'text-brand-red' : 'text-slate-800 dark:text-white'}` 
                    }, link.label)
                )
            ),
            React.createElement('div', { className: 'mt-auto pt-6 border-t border-slate-200 dark:border-white/10 space-y-4' },
                isAuthenticated 
                    ? React.createElement('button', { onClick: () => {onLogout(); onClose();}, className: "w-full text-lg py-3 rounded-lg bg-secondary/10 text-secondary font-bold" }, t.logout)
                    : React.createElement('button', { onClick: () => {onLoginClick(); onClose();}, className: "w-full text-lg py-3 rounded-lg bg-brand-red text-white font-bold" }, t.loginRegister)
            )
        )
    );
};


// Footer Component
const Footer = ({ language, setView }) => {
  const t = i18n[language];
  const SocialIcon = ({ href, children }) => React.createElement('a', { href, target: "_blank", rel: "noopener noreferrer", className: "w-10 h-10 flex items-center justify-center rounded-full bg-dark-card hover:bg-brand-red text-white transition-colors" }, children);

  return React.createElement('footer', { className: "bg-white dark:bg-dark-bg border-t border-slate-200 dark:border-white/10" },
    React.createElement('div', { className: "container mx-auto px-6 py-12" },
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-4 gap-8" },
        // Column 1: Brand
        React.createElement('div', { className: "md:col-span-1" },
          React.createElement('button', { onClick: () => setView(AppView.Home), className: "flex items-center gap-3 mb-4" },
            React.createElement(Logo, null),
            React.createElement('h1', { className: "text-2xl font-bold text-slate-900 dark:text-brand-text" }, t.title)
          ),
          React.createElement('p', { className: "text-slate-500 dark:text-light-gray text-sm" }, t.homeDescription)
        ),
        // Column 2: Links
        React.createElement('div', null,
          React.createElement('h3', { className: "font-bold text-lg text-slate-900 dark:text-white mb-4" }, "Links"),
          React.createElement('ul', { className: "space-y-3" },
            React.createElement('li', null, React.createElement('button', { onClick: () => setView(AppView.About), className: "text-slate-500 dark:text-light-gray hover:text-brand-red transition-colors" }, t.navAbout)),
            React.createElement('li', null, React.createElement('button', { onClick: () => setView(AppView.SciGeniusChat), className: "text-slate-500 dark:text-light-gray hover:text-brand-red transition-colors" }, t.navServices)),
            React.createElement('li', null, React.createElement('button', { onClick: () => setView(AppView.Contact), className: "text-slate-500 dark:text-light-gray hover:text-brand-red transition-colors" }, t.navContact))
          )
        ),
        // Column 3: Help
        React.createElement('div', null,
          React.createElement('h3', { className: "font-bold text-lg text-slate-900 dark:text-white mb-4" }, "Help"),
          React.createElement('ul', { className: "space-y-3" },
            React.createElement('li', null, React.createElement('button', { onClick: () => setView(AppView.Pricing), className: "text-slate-500 dark:text-light-gray hover:text-brand-red transition-colors" }, t.navPricing)),
            React.createElement('li', null, React.createElement('button', { onClick: () => setView(AppView.Terms), className: "text-slate-500 dark:text-light-gray hover:text-brand-red transition-colors" }, t.navTerms)),
            React.createElement('li', null, React.createElement('button', { onClick: () => setView(AppView.Privacy), className: "text-slate-500 dark:text-light-gray hover:text-brand-red transition-colors" }, t.navPrivacy))
          )
        ),
        // Column 4: Contact
        React.createElement('div', null,
          React.createElement('h3', { className: "font-bold text-lg text-slate-900 dark:text-white mb-4" }, t.navContact),
          React.createElement('p', { className: "text-slate-500 dark:text-light-gray" }, t.contactEmailAddress)
        )
      ),
      React.createElement('div', { className: "mt-12 border-t border-slate-200 dark:border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center" },
        React.createElement('p', { className: "text-sm text-slate-500 dark:text-light-gray" }, `© ${new Date().getFullYear()} SciGenius. All Rights Reserved.`),
        React.createElement('div', { className: "flex items-center gap-4 mt-4 md:mt-0" },
           React.createElement(SocialIcon, { href: "https://www.facebook.com/people/AI-Roadmap/61580962796113" }, React.createElement(FacebookIcon, null)),
           React.createElement(SocialIcon, { href: "https://www.linkedin.com/company/ai-roadmap-co" }, React.createElement(LinkedinIcon, null)),
           React.createElement(SocialIcon, { href: "https://t.me/SciGenius" }, React.createElement(TelegramIcon, null))
        )
      )
    )
  );
};

// Main App Component
const App = () => {
  const [view, setView] = useState(AppView.Home);
  const [language, setLanguage] = useState(Language.EN);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme');
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === Language.AR ? 'rtl' : 'ltr';
  }, [language]);
  
  useEffect(() => {
    if (!isAnyModelConfigured()) {
        setApiKeyError(true);
    }

    // Initial Check for Supabase Session
    const checkSession = async () => {
        if (supabaseService.isSupabaseConfigured()) {
            const session = await supabaseService.getSession();
            if (session?.user) {
                setCurrentUser({
                    email: session.user.email,
                    fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    id: session.user.id
                });
            }
        }
    };
    checkSession();

    // Supabase Auth Listener
    const { data: { subscription } } = supabaseService.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            setCurrentUser({
                email: session.user.email,
                fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                id: session.user.id
            });
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
        }
    });

    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcomeModal');
    if (!hasSeenWelcome) {
        setIsWelcomeModalOpen(true);
        sessionStorage.setItem('hasSeenWelcomeModal', 'true');
    }

    return () => {
        subscription?.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user) => {
    // For Supabase, this is handled by onAuthStateChange, 
    // but we might need this for the manual/admin bypass or Google Login simulation
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };
  
  const handleLogout = async () => {
    if (supabaseService.isSupabaseConfigured()) {
        await supabaseService.signOut();
    } else {
        // Fallback for manual admin bypass
        setCurrentUser(null);
    }
    setView(AppView.Home); // Redirect to home on logout
  };

  const renderView = () => {
    const props = { language, setView, currentUser, theme };

    const isDashboardView = SERVICE_VIEW_IDS.includes(view);
    
    if (isDashboardView) {
        const activeService = view;
        
        const protectedViews = SERVICE_VIEW_IDS.filter(id => id !== AppView.SciGeniusChat);
        const needsAuth = protectedViews.includes(activeService) && !currentUser;
        
        const premiumViews = [
            AppView.PresentationGenerator, AppView.Design, AppView.AIHumanizer, AppView.DataAnalysis, AppView.InfographicVideo
        ];
        const needsUpgrade = premiumViews.includes(activeService) && currentUser && !currentUser.isAdmin;
        
        return React.createElement(Dashboard, { 
            ...props,
            activeService,
            needsAuth,
            needsUpgrade,
            onLoginClick: () => setIsAuthModalOpen(true) 
        });
    }

    switch (view) {
      case AppView.Home: return React.createElement(Home, { ...props, onNavigateToServices: () => setView(AppView.SciGeniusChat) });
      case AppView.About: return React.createElement(About, props);
      case AppView.Contact: return React.createElement(Contact, props);
      case AppView.Pricing: return React.createElement(Pricing, { ...props, onLoginClick: () => setIsAuthModalOpen(true) });
      case AppView.Terms: return React.createElement(Terms, props);
      case AppView.Privacy: return React.createElement(Privacy, props);
      case AppView.Admin: return currentUser && currentUser.isAdmin ? React.createElement(AdminDashboard, props) : React.createElement(Home, { ...props, onNavigateToServices: () => setView(AppView.SciGeniusChat) });
      default: 
        return React.createElement(Home, { ...props, onNavigateToServices: () => setView(AppView.SciGeniusChat) });
    }
  };

  return React.createElement('div', { className: "min-h-screen flex flex-col font-sans" },
    React.createElement(Header, {
      currentView: view,
      setView: setView,
      language: language,
      setLanguage: setLanguage,
      isAuthenticated: !!currentUser,
      currentUser: currentUser,
      onLoginClick: () => setIsAuthModalOpen(true),
      onLogout: handleLogout,
      theme: theme,
      toggleTheme: toggleTheme,
      onMenuToggle: () => setIsMobileMenuOpen(true)
    }),
    React.createElement(MobileMenu, {
      isOpen: isMobileMenuOpen,
      onClose: () => setIsMobileMenuOpen(false),
      currentView: view,
      setView: setView,
      language: language,
      setLanguage: setLanguage,
      isAuthenticated: !!currentUser,
      onLoginClick: () => setIsAuthModalOpen(true),
      onLogout: handleLogout,
      theme: theme,
      toggleTheme: toggleTheme
    }),
    React.createElement('main', { className: "flex-grow" }, // Removed container and padding for full-width pages
      apiKeyError ? (
        React.createElement('div', { className: "container mx-auto p-4 md:p-8 flex flex-col items-center justify-center h-full text-center" },
          React.createElement('div', { className: "bg-white dark:bg-dark-card border border-brand-red/50 p-8 rounded-2xl max-w-md shadow-lg shadow-brand-red/20" },
            React.createElement('h2', { className: "text-2xl font-bold text-brand-red mb-4" }, "API Key Error"),
            React.createElement('p', { className: "text-slate-600 dark:text-brand-text-light" }, i18n[language].apiKeyError)
          )
        )
      ) : (
        renderView()
      )
    ),
    React.createElement(Footer, { language: language, setView: setView }),
    React.createElement(AuthModal, {
      isOpen: isAuthModalOpen,
      onClose: () => setIsAuthModalOpen(false),
      onLoginSuccess: handleLoginSuccess,
      language: language,
      setView: setView
    }),
    React.createElement(WelcomeModal, {
      isOpen: isWelcomeModalOpen,
      onClose: () => setIsWelcomeModalOpen(false),
      onAuthClick: () => {
        setIsWelcomeModalOpen(false);
        setIsAuthModalOpen(true);
      },
      language: language
    })
  );
};

export default App;
