
import React, { useState, useEffect } from 'react';
import { i18n } from '../constants.js';
import * as settingsService from '../services/settingsService.js';
import * as supabaseService from '../services/supabaseService.js';
import { Spinner, CheckIcon } from './Shared.js';

const Contact = ({ language }) => {
    const t = i18n[language];
    const [settings, setSettings] = useState(settingsService.getSettings());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings(settingsService.getSettings());
        };
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault(); // Critical: Stops the browser from sending a POST request (fixing 405 error)
        setIsSubmitting(true);
        setErrorMessage('');

        const formData = new FormData(e.target);
        const data = {
            fullName: formData.get('full-name'),
            email: formData.get('email'),
            company: formData.get('company'),
            message: formData.get('message')
        };
        
        try {
            if (supabaseService.isSupabaseConfigured()) {
                const { error } = await supabaseService.submitContactMessage(data);
                if (error) throw error;
            } else {
                // Fallback simulation if Supabase isn't configured yet (prevents breaking demo)
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.warn("Supabase not configured. Message not saved to database.");
            }

            setSubmitted(true);
            // Reset success message after a few seconds
            setTimeout(() => setSubmitted(false), 5000);
            e.target.reset();
        } catch (error) {
            console.error("Error sending message:", error);
            setErrorMessage(t.errorOccurred || "Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const Illustration = () => (
        React.createElement('div', { className: 'flex items-center justify-center p-8' },
            React.createElement('svg', { viewBox: '0 0 200 200', xmlns: 'http://www.w3.org/2000/svg' },
                React.createElement('path', {
                    fill: '#00205B',
                    d: 'M46.2,-46.2C58.7,-32.7,66.8,-16.3,66.8,0.1C66.8,16.5,58.7,33,46.2,46.2C33.7,59.5,16.8,69.5,0.2,69.4C-16.5,69.3,-33,59.1,-46.4,45.8C-59.8,32.5,-70.1,16.3,-70.1,0.1C-70.1,-16,-59.8,-32.1,-46.4,-45.7C-33,-59.3,-16.5,-70.4,0.3,-70.5C17.1,-70.6,33.7,-59.7,46.2,-46.2Z',
                    transform: 'translate(100 100)',
                    className: 'opacity-20'
                }),
                React.createElement('path', {
                    fill: '#FF2D2D',
                    d: 'M39.8,-39.8C53.1,-27.1,66.4,-13.5,66.4,0.1C66.4,13.7,53.1,27.4,39.8,40.2C26.5,53,13.2,64.9,-0.2,64.9C-13.6,65,-27.3,53.2,-40.3,39.9C-53.3,26.6,-65.7,13.3,-65.7,-0.1C-65.7,-13.4,-53.3,-26.8,-40.3,-40.1C-27.3,-53.4,-13.6,-66.6,0,-66.6C13.7,-66.6,26.5,-52.5,39.8,-39.8Z',
                    transform: 'translate(100 100) scale(0.8)',
                    className: 'opacity-10'
                }),
                // Mail icon
                 React.createElement('g', { transform: 'translate(65 65) scale(0.4)' },
                    React.createElement('path', {
                        d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
                        stroke: '#00205B',
                        strokeWidth: '2',
                        fill: 'none'
                    }),
                    React.createElement('path', {
                        d: 'M22 6l-10 7L2 6',
                        stroke: '#ef4444',
                        strokeWidth: '2',
                        fill: 'none'
                    })
                )
            )
        )
    );

    return React.createElement('div', { className: "container mx-auto px-6 py-16" },
        React.createElement('div', { className: "text-center mb-12" },
            React.createElement('h2', { className: "text-4xl font-bold text-slate-900 dark:text-white" }, t.contactTitle),
            React.createElement('p', { className: "mt-3 text-lg text-slate-500 dark:text-light-gray" }, t.contactDescription)
        ),
        React.createElement('div', { className: 'max-w-4xl mx-auto bg-white dark:bg-dark-card rounded-lg shadow-xl overflow-hidden' },
            React.createElement('div', { className: 'grid md:grid-cols-2' },
                React.createElement('div', { className: 'hidden md:block relative' },
                    React.createElement(Illustration, null),
                    React.createElement('div', { className: "absolute bottom-8 left-0 right-0 text-center px-4" },
                        React.createElement('p', { className: "text-slate-600 dark:text-brand-text font-semibold" }, settings.contactEmail),
                        React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light text-sm mt-1" }, settings.contactPhone)
                    )
                ),
                React.createElement('div', { className: 'p-8' },
                    submitted ? (
                        React.createElement('div', { className: 'h-full flex flex-col items-center justify-center text-center space-y-4 py-12 animate-fade-in-up' },
                            React.createElement('div', { className: 'w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center' },
                                React.createElement(CheckIcon, { className: 'w-8 h-8' })
                            ),
                            React.createElement('h3', { className: 'text-xl font-bold text-slate-900 dark:text-white' }, 'Message Sent!'),
                            React.createElement('p', { className: 'text-slate-500 dark:text-brand-text-light' }, 'Thank you for reaching out. We will get back to you shortly.')
                        )
                    ) : (
                        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-6' },
                            errorMessage && React.createElement('div', { className: 'p-3 bg-red-100 border border-red-400 text-red-700 rounded' }, errorMessage),
                            React.createElement('div', null,
                                React.createElement('label', { htmlFor: 'full-name', className: 'text-sm font-medium text-slate-700 dark:text-light-gray' }, t.fullName),
                                React.createElement('input', { type: 'text', id: 'full-name', name: 'full-name', required: true, className: 'mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-dark-bg border border-slate-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-brand-red focus:border-brand-red' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { htmlFor: 'email', className: 'text-sm font-medium text-slate-700 dark:text-light-gray' }, t.emailAddress),
                                React.createElement('input', { type: 'email', id: 'email', name: 'email', required: true, className: 'mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-dark-bg border border-slate-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-brand-red focus:border-brand-red' })
                            ),
                             React.createElement('div', null,
                                React.createElement('label', { htmlFor: 'company', className: 'text-sm font-medium text-slate-700 dark:text-light-gray' }, 'Company'),
                                React.createElement('input', { type: 'text', id: 'company', name: 'company', className: 'mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-dark-bg border border-slate-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-brand-red focus:border-brand-red' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { htmlFor: 'message', className: 'text-sm font-medium text-slate-700 dark:text-light-gray' }, 'Message'),
                                React.createElement('textarea', { id: 'message', name: 'message', rows: '4', required: true, className: 'mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-dark-bg border border-slate-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-brand-red focus:border-brand-red resize-none' })
                            ),
                            React.createElement('div', null,
                                React.createElement('button', { 
                                    type: 'submit', 
                                    disabled: isSubmitting,
                                    className: 'w-full flex justify-center items-center px-6 py-3 bg-brand-red text-white font-semibold rounded-lg shadow-lg hover:bg-red-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed' 
                                }, 
                                    isSubmitting ? React.createElement(Spinner, { size: '5' }) : 'Send Message'
                                )
                            )
                        )
                    )
                )
            )
        )
    );
};

export default Contact;
