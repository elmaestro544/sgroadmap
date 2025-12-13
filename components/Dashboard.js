
import React, { useState, useEffect } from 'react';
import { AppView, i18n, SERVICES } from '../constants.js';
import SciGeniusChat from './SciGeniusChat.js';
import ResearchCopilot from './ResearchCopilot.js';
import DataAnalysis from './DataAnalysis.js';
import ResearchWriter from './ResearchWriter.js';
import PresentationGenerator from './PresentationGenerator.js';
import PromptGenerator from './PromptGenerator.js';
import Paraphraser from './Paraphraser.js';
import AIHumanizer from './AIHumanizer.js';
import ContentCreator from './ContentCreator.js';
import InteriorDesigner from './InteriorDesigner.js';
import Translator from './Translator.js';
import InfographicVideoGenerator from './InfographicVideoGenerator.js';
import AuthRequired from './AuthRequired.js';
import UpgradeRequired from './UpgradeRequired.js';
import { SidebarToggleIcon } from './Shared.js';
import * as settingsService from '../services/settingsService.js';

// Helper component to render icons with sidebar-specific styles
const SidebarIcon = ({ iconComponent: Icon }) => {
    const originalElement = Icon();
    return React.cloneElement(originalElement, {
        className: 'h-6 w-6 text-brand-red flex-shrink-0'
    });
};

const Dashboard = ({ language, setView, currentUser, theme, activeService, needsAuth, needsUpgrade, onLoginClick }) => {
  const t = i18n[language];
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [disabledServices, setDisabledServices] = useState(settingsService.getSettings().disabledServices);

  useEffect(() => {
      const handleSettingsChange = () => {
          setDisabledServices(settingsService.getSettings().disabledServices);
      };
      window.addEventListener('settingsChanged', handleSettingsChange);
      return () => window.removeEventListener('settingsChanged', handleSettingsChange);
  }, []);

  const handleServiceClick = (serviceId) => {
    setView(serviceId);
    if (window.innerWidth >= 1024) {
      setIsSidebarExpanded(false);
    }
  };

  const renderActiveService = () => {
    if (needsAuth) {
        return React.createElement(AuthRequired, {
            language: language,
            onLoginClick: onLoginClick
        });
    }
    
    if (needsUpgrade) {
        return React.createElement(UpgradeRequired, {
            language: language,
            setView: setView
        });
    }

    const props = { language, setView, currentUser, theme };
    switch (activeService) {
      case AppView.SciGeniusChat: return React.createElement(SciGeniusChat, props);
      case AppView.Research: return React.createElement(ResearchCopilot, props);
      case AppView.DataAnalysis: return React.createElement(DataAnalysis, props);
      case AppView.ResearchWriter: return React.createElement(ResearchWriter, props);
      case AppView.PresentationGenerator: return React.createElement(PresentationGenerator, props);
      case AppView.Prompt: return React.createElement(PromptGenerator, props);
      case AppView.Paraphraser: return React.createElement(Paraphraser, props);
      case AppView.AIHumanizer: return React.createElement(AIHumanizer, props);
      case AppView.ContentCreator: return React.createElement(ContentCreator, props);
      case AppView.Design: return React.createElement(InteriorDesigner, props);
      case AppView.Translator: return React.createElement(Translator, props);
      case AppView.InfographicVideo: return React.createElement(InfographicVideoGenerator, props);
      default: return React.createElement(SciGeniusChat, props);
    }
  };

  const getButtonClasses = (isActive, isAvailable = true) => {
    const baseClasses = `w-full flex items-center gap-2 p-3 text-left rounded-xl transition-all duration-200 ease-in-out`;
    const languageClass = language === 'ar' ? 'flex-row-reverse' : '';
    const collapsedClass = !isSidebarExpanded ? 'lg:w-14 lg:h-14 lg:justify-center lg:rounded-xl' : 'lg:w-full';

    if (isAvailable === false) {
        return `${baseClasses} ${languageClass} ${collapsedClass} bg-slate-100/50 dark:bg-dark-bg/50 opacity-60 cursor-not-allowed border border-slate-200/80 dark:border-white/10 grayscale`;
    }

    const activeStateClasses = isActive
        ? 'bg-brand-red/10 shadow-inner text-brand-red font-semibold border border-brand-red/20'
        : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-dark-card dark:to-dark-bg text-slate-700 dark:text-brand-text shadow-md dark:shadow-card border border-slate-200/80 dark:border-white/10 transform hover:-translate-y-px active:translate-y-0 active:shadow-inner';

    return `${baseClasses} ${languageClass} ${activeStateClasses} ${collapsedClass}`;
  };

  return React.createElement('div', { className: 'container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6' },
    // Sidebar
    React.createElement('aside', { 
        className: `flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-full lg:w-72' : 'w-full lg:w-24'}` 
    },
      React.createElement('div', { 
          className: `lg:sticky lg:top-24 bg-slate-100/50 dark:bg-dark-card/50 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-2` 
      },
        // Services List
        React.createElement('div', { className: 'space-y-2' },
            SERVICES.map((service, index) => {
                const isActive = activeService === service.id;
                const isDisabled = disabledServices.includes(service.id);
                const isAvailable = service.isAvailable !== false && !isDisabled;
                
                const buttonContent = React.createElement(React.Fragment, null,
                    React.createElement(SidebarIcon, { iconComponent: service.icon }),
                    React.createElement('span', { 
                        className: `flex-grow whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${language === 'ar' ? 'text-right' : 'text-left'} ${!isSidebarExpanded ? 'lg:opacity-0 lg:max-w-0' : 'opacity-100 max-w-full lg:ml-2'}` 
                    }, t[service.titleKey]),
                    !isAvailable ? (
                        React.createElement('span', { 
                            className: `text-[10px] font-bold bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${!isSidebarExpanded ? 'lg:hidden' : ''}` 
                        }, isDisabled ? 'Disabled' : t.serviceComingSoon)
                    ) : service.isPremium && (
                        React.createElement('span', { 
                            className: `text-[10px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${!isSidebarExpanded ? 'lg:hidden' : ''}` 
                        }, t.premiumFeature)
                    )
                );
                
                if (index === 0) {
                    return React.createElement('div', { key: service.id, className: "relative group" },
                        React.createElement('button', {
                            onClick: () => isAvailable && handleServiceClick(service.id),
                            className: getButtonClasses(isActive, isAvailable)
                        }, buttonContent),
                        !isSidebarExpanded && React.createElement('div', {
                            className: `absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden lg:block`
                        }, t[service.titleKey]),
                        React.createElement('div', { 
                            className: `hidden lg:flex items-center absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out ${language === 'ar' ? 'left-2' : 'right-2'}` 
                        },
                            React.createElement('button', {
                                onClick: () => setIsSidebarExpanded(!isSidebarExpanded),
                                className: `p-2 rounded-full transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'} hover:bg-slate-200/60 dark:hover:bg-white/10`,
                                'aria-label': isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
                            },
                                React.createElement(SidebarToggleIcon, { isExpanded: isSidebarExpanded })
                            )
                        )
                    );
                }

                return React.createElement('div', { key: service.id, className: "relative group" },
                    React.createElement('button', {
                        key: service.id,
                        onClick: () => isAvailable && handleServiceClick(service.id),
                        className: getButtonClasses(isActive, isAvailable)
                    }, buttonContent),
                    !isSidebarExpanded && React.createElement('div', {
                        className: `absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden lg:block`
                    }, t[service.titleKey], !isAvailable && ` (${isDisabled ? 'Disabled' : t.serviceComingSoon})`)
                )
            })
        )
      )
    ),
    React.createElement('main', { className: 'flex-grow min-w-0' },
      renderActiveService()
    )
  );
};

export default Dashboard;
