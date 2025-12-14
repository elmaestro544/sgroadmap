import React, { useEffect } from 'react';
import { i18n } from '../constants.js';
import { TrashIcon, HistoryIcon, CloseIcon } from './Shared.js';

const HistoryPanel = ({ isOpen, onClose, title, items, renderItem, onClear, language }) => {
    const t = i18n[language];

    useEffect(() => {
        const handleEsc = (event) => {
           if (event.key === 'Escape') {
            onClose();
          }
        };
        window.addEventListener('keydown', handleEsc);
    
        return () => {
          window.removeEventListener('keydown', handleEsc);
        };
      }, [onClose]);

    const panelDirectionClass = language === 'ar' ? '-translate-x-full' : 'translate-x-full';
    const panelPositionClass = language === 'ar' ? 'left-0' : 'right-0';
    
    return React.createElement('div', { 
        className: `fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${isOpen ? '' : 'pointer-events-none'}`
    },
        // Backdrop
        React.createElement('div', { 
            className: `absolute inset-0 bg-gray-500/50 dark:bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`,
            onClick: onClose,
            'aria-hidden': 'true'
        }),
        // Panel
        React.createElement('div', { 
            className: `fixed inset-y-0 ${panelPositionClass} w-full max-w-sm bg-white dark:bg-card-gradient shadow-xl transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : panelDirectionClass}` 
        },
            React.createElement('div', { className: 'h-full flex flex-col' },
                React.createElement('div', { className: "p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center flex-shrink-0" },
                    React.createElement('h3', { className: "text-lg font-semibold text-slate-900 dark:text-brand-text flex items-center gap-2" },
                        React.createElement(HistoryIcon, null),
                        title
                    ),
                    React.createElement('button', { onClick: onClose, className: 'p-1 rounded-full text-slate-500 dark:text-brand-text-light hover:bg-slate-200 dark:hover:bg-white/10' },
                        React.createElement(CloseIcon, null)
                    )
                ),
                React.createElement('div', { className: "flex-grow overflow-y-auto space-y-2 p-4" },
                    items && items.length > 0 ? (
                        items.map(item => renderItem(item))
                    ) : (
                        React.createElement('p', { className: "text-sm text-slate-500 dark:text-brand-text-light text-center py-4" }, t.noHistory)
                    )
                ),
                items && items.length > 0 && onClear && React.createElement('div', { className: 'p-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0' },
                    React.createElement('button', {
                        onClick: () => { onClear(); onClose(); },
                        className: "w-full text-sm flex items-center justify-center gap-2 text-slate-500 dark:text-brand-text-light hover:text-brand-red dark:hover:text-brand-red transition-colors bg-slate-100 dark:bg-brand-blue py-2 rounded-lg"
                    }, React.createElement(TrashIcon, null), t.clearHistory)
                )
            )
        )
    );
};

export default HistoryPanel;
