import React, { useState, useEffect } from 'react';
import { AppView, Language } from './types';
import { i18n } from './constants';
import ResearchCopilot from './components/ResearchCopilot';
import PromptGenerator from './components/PromptGenerator';
import InteriorDesigner from './components/InteriorDesigner';
import { GithubIcon, UserIcon, Logo, LinkedinIcon, FacebookIcon, TelegramIcon } from './components/Shared';
import { isApiKeyConfigured } from './services/geminiService';
import AuthModal from './components/AuthModal';

// Header Component
const Header = ({ currentView, setView, language, setLanguage, isAuthenticated, onLoginClick, onLogout }) => {
  const t = i18n[language];
  const navItems = [
    { view: AppView.Research, label: t.navResearch },
    { view: AppView.Prompt, label: t.navPrompt },
    { view: AppView.Design, label: t.navDesign },
  ];

  return (
    <header className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-white/10">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-bold text-brand-text">
            {t.title}
          </h1>
        </div>
        <div className={`hidden md:flex items-center gap-4 md:gap-6 ${language === Language.AR ? 'flex-row-reverse' : ''}`}>
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`text-base font-medium transition-colors duration-300 ${
                currentView === item.view ? 'text-brand-red' : 'text-brand-text-light hover:text-brand-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={() => setLanguage(language === Language.EN ? Language.AR : Language.EN)}
                className="text-sm font-semibold bg-brand-light-dark px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
                {language === Language.EN ? 'العربية' : 'English'}
            </button>
            {isAuthenticated ? (
                <div className="relative group">
                    <button className="text-brand-text-light hover:text-white">
                        <UserIcon />
                    </button>
                    <div className="absolute top-full right-0 mt-2 w-32 bg-brand-light-dark border border-white/10 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity invisible group-hover:visible z-10">
                        <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-brand-text-light hover:bg-brand-red hover:text-white rounded-md">
                            {t.logout}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={onLoginClick}
                    className="text-sm font-semibold bg-brand-blue hover:brightness-125 px-4 py-1.5 rounded-full transition-all"
                >
                    {t.loginRegister}
                </button>
            )}
        </div>
      </nav>
    </header>
  );
};

// Footer Component
const Footer = ({ language }) => {
  const t = i18n[language];
  return (
    <footer className="bg-transparent mt-auto">
      <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-white/10">
        <p className={`text-sm text-brand-text-light ${language === Language.AR ? 'sm:text-right' : 'sm:text-left'}`}>
          &copy; {new Date().getFullYear()} SciGenius. All Rights Reserved.
        </p>
        <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
            <p className="text-sm text-brand-text-light mb-2">{t.connectWithUs}</p>
            <div className="flex items-center gap-4">
                <a href="https://www.linkedin.com/company/ai-roadmap-co" target="_blank" rel="noopener noreferrer" className="text-brand-text-light hover:text-brand-red transition-colors">
                    <LinkedinIcon />
                </a>
                <a href="https://www.facebook.com/people/AI-Roadmap/61580962796113" target="_blank" rel="noopener noreferrer" className="text-brand-text-light hover:text-brand-red transition-colors">
                    <FacebookIcon />
                </a>
                <a href="https://t.me/AI_Roadmap_bot" target="_blank" rel="noopener noreferrer" className="text-brand-text-light hover:text-brand-red transition-colors">
                    <TelegramIcon />
                </a>
                <a href="#" className="text-brand-text-light hover:text-brand-red transition-colors">
                    <GithubIcon />
                </a>
            </div>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
const App = () => {
  const [view, setView] = useState(AppView.Research);
  const [language, setLanguage] = useState(Language.EN);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === Language.AR ? 'rtl' : 'ltr';
  }, [language]);
  
  useEffect(() => {
    if (!isApiKeyConfigured) {
        setApiKeyError(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const renderView = () => {
    switch (view) {
      case AppView.Research:
        return <ResearchCopilot language={language} />;
      case AppView.Prompt:
        return <PromptGenerator language={language} />;
      case AppView.Design:
        return <InteriorDesigner language={language} />;
      default:
        return <ResearchCopilot language={language} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative isolate">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_-20%,rgba(0,32,91,0.25),transparent)] -z-10" />
      <Header 
        currentView={view} 
        setView={setView} 
        language={language} 
        setLanguage={setLanguage}
        isAuthenticated={isAuthenticated}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {apiKeyError ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-brand-light-dark border border-brand-red/50 p-8 rounded-2xl max-w-md shadow-lg shadow-brand-red/20">
                    <h2 className="text-2xl font-bold text-brand-red mb-4">API Key Error</h2>
                    <p className="text-brand-text-light">{i18n[language].apiKeyError}</p>
                </div>
            </div>
        ) : (
            renderView()
        )}
      </main>
      <Footer language={language} />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        language={language}
      />
    </div>
  );
};

export default App;