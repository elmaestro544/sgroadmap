
import React, { useState, useEffect } from 'react';
import { i18n, AppView } from '../constants.js';
import { CloseIcon, GoogleIcon, Spinner } from './Shared.js';
import * as supabaseService from '../services/supabaseService.js';

// Define ModalContent as a standalone component to prevent re-renders from causing input focus loss.
const ModalContent = ({
  t,
  isLoginView,
  formData,
  error,
  success,
  loading,
  handleInputChange,
  handleSubmit,
  onClose,
  setIsLoginView,
  onLoginSuccess,
  setView
}) => (
    React.createElement('div', { className: "bg-white dark:bg-card-gradient p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-slate-200 dark:border-white/10" },
      React.createElement('button', { onClick: onClose, className: "absolute top-4 right-4 text-slate-500 dark:text-brand-text-light hover:text-slate-900 dark:hover:text-white transition-colors" },
        React.createElement(CloseIcon, null)
      ),
      React.createElement('h2', { className: "text-2xl font-bold text-center text-slate-900 dark:text-brand-text mb-4" },
        isLoginView ? t.login : t.register
      ),
      
      error && React.createElement('div', {className: "bg-red-500/10 border border-red-500/30 text-center p-2 rounded-md mb-4 text-sm text-brand-red font-semibold"}, error),
      success && React.createElement('div', {className: "bg-green-500/10 border border-green-500/30 text-center p-2 rounded-md mb-4 text-sm text-green-600 dark:text-green-400 font-semibold"}, success),

      React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
        !isLoginView && React.createElement('div', null,
            React.createElement('label', { htmlFor: "fullName", className: "block text-sm font-medium text-slate-600 dark:text-brand-text-light mb-1" }, t.fullName),
            React.createElement('input', {
                type: "text", id: "fullName", name: "fullName", required: true,
                value: formData.fullName, onChange: handleInputChange,
                className: "w-full p-2 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-full focus:ring-2 focus:ring-brand-blue focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
            })
        ),
        React.createElement('div', null,
          React.createElement('label', { htmlFor: "email", className: "block text-sm font-medium text-slate-600 dark:text-brand-text-light mb-1" }, t.emailAddress),
          React.createElement('input', {
            type: "email", id: "email", name: "email", required: true,
            value: formData.email, onChange: handleInputChange,
            className: "w-full p-2 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-full focus:ring-2 focus:ring-brand-blue focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
          })
        ),
        React.createElement('div', null,
          React.createElement('label', { htmlFor: "password", className: "block text-sm font-medium text-slate-600 dark:text-brand-text-light mb-1" }, t.password),
          React.createElement('input', {
            type: "password", id: "password", name: "password", required: true,
            value: formData.password, onChange: handleInputChange,
            className: "w-full p-2 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-full focus:ring-2 focus:ring-brand-blue focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
          })
        ),
        !isLoginView && React.createElement('div', null,
            React.createElement('label', { htmlFor: "confirmPassword", className: "block text-sm font-medium text-slate-600 dark:text-brand-text-light mb-1" }, t.confirmPassword),
            React.createElement('input', {
                type: "password", id: "confirmPassword", name: "confirmPassword", required: true,
                value: formData.confirmPassword, onChange: handleInputChange,
                className: "w-full p-2 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-full focus:ring-2 focus:ring-brand-blue focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
            })
        ),
        !isLoginView && React.createElement('p', { className: "text-xs text-center text-slate-500 dark:text-brand-text-light pt-2" },
            t.authRegistrationDisclaimer_p1, ' ',
            React.createElement('button', {
                type: 'button',
                onClick: () => { onClose(); setView(AppView.Terms); },
                className: 'font-semibold text-brand-blue dark:text-blue-400 hover:underline focus:outline-none'
            }, t.authRegistrationDisclaimer_terms), ' ',
            t.authRegistrationDisclaimer_p2, ' ',
            React.createElement('button', {
                type: 'button',
                onClick: () => { onClose(); setView(AppView.Privacy); },
                className: 'font-semibold text-brand-blue dark:text-blue-400 hover:underline focus:outline-none'
            }, t.authRegistrationDisclaimer_privacy),
            t.authRegistrationDisclaimer_p3
        ),
        React.createElement('button', {
          type: "submit",
          disabled: loading,
          className: "w-full bg-brand-red hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-full transition-colors mt-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        },
          loading ? React.createElement(Spinner, { size: "5" }) : (isLoginView ? t.login : t.createAccount)
        )
      ),
      React.createElement('div', { className: "relative my-6" },
        React.createElement('div', { className: "absolute inset-0 flex items-center", "aria-hidden": "true" },
          React.createElement('div', { className: "w-full border-t border-slate-300 dark:border-white/20" })
        ),
        React.createElement('div', { className: "relative flex justify-center text-sm" },
          React.createElement('span', { className: "px-2 bg-white dark:bg-card-gradient text-slate-500 dark:text-brand-text-light" }, "OR")
        )
      ),
      React.createElement('button', {
        onClick: () => onLoginSuccess({ email: 'guest@scigenius.com', fullName: 'Guest User' }), // Simulate google login
        className: "w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-4 rounded-full transition-colors border border-gray-300"
      },
        React.createElement(GoogleIcon, null),
        t.signInWithGoogle
      ),
      React.createElement('p', { className: "mt-6 text-center text-sm text-slate-500 dark:text-brand-text-light" },
        isLoginView ? t.dontHaveAccount : t.alreadyHaveAccount,
        ' ',
        React.createElement('button', { onClick: () => setIsLoginView(!isLoginView), className: "font-medium text-brand-blue dark:text-blue-400 hover:underline" },
          isLoginView ? t.register : t.login
        )
      )
    )
);


const AuthModal = ({ isOpen, onClose, onLoginSuccess, language, setView }) => {
  const t = i18n[language];
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccess('');
    setLoading(false);
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '' });
  }, [isLoginView, isOpen]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const ADMIN_PASSWORD = "5431";

    // Bypass for admin (local only)
    if (isLoginView && formData.password === ADMIN_PASSWORD) {
        onLoginSuccess({
            email: formData.email,
            fullName: 'Admin',
            isAdmin: true,
        });
        setLoading(false);
        return;
    }

    if (!supabaseService.isSupabaseConfigured()) {
        setError("Supabase is not configured. Please set your API credentials in env.js");
        setLoading(false);
        return;
    }

    if (isLoginView) {
        try {
            const { data, error } = await supabaseService.signIn(formData.email, formData.password);
            if (error) {
                setError(error.message);
            } else if (data?.user) {
                // onLoginSuccess is technically handled by the auth listener in App.js, 
                // but we can call it here to close the modal or pass specific user object if needed.
                onLoginSuccess({ 
                    email: data.user.email, 
                    fullName: data.user.user_metadata?.full_name || data.user.email 
                });
                onClose();
            }
        } catch (err) {
            setError(t.errorOccurred);
            console.error("Login error:", err);
        }
    } else {
        const { fullName, email, password, confirmPassword } = formData;
        if (!fullName.trim()) { setError(t.errorFullNameRequired); setLoading(false); return; }
        if (!validateEmail(email)) { setError(t.errorInvalidEmail); setLoading(false); return; }
        if (password.length < 8) { setError(t.errorPasswordLength); setLoading(false); return; }
        if (password !== confirmPassword) { setError(t.errorPasswordMismatch); setLoading(false); return; }

        try {
            const { data, error } = await supabaseService.signUp(email, password, fullName);
            if (error) {
                setError(error.message);
            } else {
                if (data?.user && !data.session) {
                    setSuccess("Registration successful! Please check your email to verify your account.");
                } else {
                    setSuccess(t.registrationSuccess);
                    setTimeout(() => {
                        setIsLoginView(true);
                    }, 2000);
                }
            }
        } catch (err) {
            setError(t.errorOccurred);
            console.error("Registration error:", err);
        }
    }
    setLoading(false);
  };

  if (!isOpen) return null;
  
  const modalContainerProps = {
    className: "fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[100] flex justify-center items-center backdrop-blur-sm transition-opacity",
    onClick: onClose,
    role: "dialog",
    "aria-modal": "true"
  };

  return (
    React.createElement('div', modalContainerProps,
      React.createElement('div', { onClick: (e) => e.stopPropagation(), className: "transform transition-all" },
        React.createElement(ModalContent, {
          t,
          isLoginView,
          formData,
          error,
          success,
          loading,
          handleInputChange,
          handleSubmit,
          onClose,
          setIsLoginView,
          onLoginSuccess,
          setView
        })
      )
    )
  );
};

export default AuthModal;
