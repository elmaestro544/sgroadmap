import React, { useState } from 'react';
import { i18n } from '../constants';
import { Language } from '../types';
import { CloseIcon, GoogleIcon } from './Shared';

const AuthModal = ({ isOpen, onClose, onLoginSuccess, language }) => {
  const t = i18n[language];
  const [isLoginView, setIsLoginView] = useState(true);

  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you'd handle form submission to your backend here.
    // For this demo, we'll just simulate a successful login.
    onLoginSuccess();
  };

  const ModalContent = () => (
    <div className="bg-brand-light-dark p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-white/10">
      <button onClick={onClose} className="absolute top-4 right-4 text-brand-text-light hover:text-white transition-colors">
        <CloseIcon />
      </button>
      <h2 className="text-2xl font-bold text-center text-brand-text mb-6">
        {isLoginView ? t.login : t.register}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-brand-text-light mb-1">{t.emailAddress}</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full p-2 bg-black/30 border border-white/20 rounded-full focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-brand-text-light mb-1">{t.password}</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            className="w-full p-2 bg-black/30 border border-white/20 rounded-full focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-brand-red hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-full transition-colors"
        >
          {isLoginView ? t.login : t.createAccount}
        </button>
      </form>
      
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-brand-light-dark text-brand-text-light">OR</span>
        </div>
      </div>
      
      <button
        onClick={onLoginSuccess} // Simulate login for Google as well
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-4 rounded-full transition-colors border border-gray-300"
      >
        <GoogleIcon />
        {t.signInWithGoogle}
      </button>

      <p className="mt-6 text-center text-sm text-brand-text-light">
        {isLoginView ? t.dontHaveAccount : t.alreadyHaveAccount}{' '}
        <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-brand-blue hover:underline">
          {isLoginView ? t.register : t.login}
        </button>
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center backdrop-blur-sm transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div onClick={(e) => e.stopPropagation()} className="transform transition-all">
        <ModalContent />
      </div>
    </div>
  );
};

export default AuthModal;