import React, { useState, useEffect } from 'react';
import { i18n } from '../constants.js';
import { CloseIcon, CreditCardIcon, Spinner, CheckIcon } from './Shared.js';

const PaymentModal = ({ isOpen, onClose, plan, language }) => {
  const t = i18n[language];
  const [paymentStep, setPaymentStep] = useState('form'); // 'form', 'loading', 'success'

  // Reset step when modal is opened
  useEffect(() => {
    if (isOpen) {
      setPaymentStep('form');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setPaymentStep('loading');
    setTimeout(() => {
      setPaymentStep('success');
      setTimeout(() => {
        onClose();
      }, 2500); // Close modal after success message
    }, 2000); // Simulate API call
  };

  const planName = language === 'ar' ? plan.name_ar : plan.name(language);
  const planPrice = language === 'ar' ? plan.price_ar : plan.price(language);
  const planPeriod = language === 'ar' ? plan.period_ar : plan.period(language);

  const ModalContent = () => {
    switch (paymentStep) {
      case 'loading':
        return React.createElement('div', { className: "flex flex-col items-center justify-center p-8 h-64" },
          React.createElement(Spinner, { size: '12' }),
          React.createElement('p', { className: "mt-4 text-slate-500 dark:text-brand-text-light" }, t.processingPayment)
        );
      case 'success':
        return React.createElement('div', { className: "flex flex-col items-center justify-center p-8 h-64 text-center" },
          React.createElement('div', { className: "w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500" },
            React.createElement(CheckIcon, { className: "w-8 h-8 text-green-400" })
          ),
          React.createElement('h3', { className: "text-2xl font-bold mt-4 text-slate-900 dark:text-brand-text" }, t.paymentSuccess),
          React.createElement('p', { className: "mt-2 text-slate-500 dark:text-brand-text-light" }, t.welcomeAboard)
        );
      case 'form':
      default:
        return React.createElement(React.Fragment, null,
          React.createElement('div', { className: "flex justify-between items-start p-4 border-b border-slate-200 dark:border-white/10" },
            React.createElement('div', null,
              React.createElement('h3', { className: "text-lg font-bold text-slate-900 dark:text-brand-text" }, t.paymentTitle),
              React.createElement('p', { className: "text-sm text-slate-500 dark:text-brand-text-light" }, `${t.paymentFor} ${planName} (${planPrice}${planPeriod})`)
            ),
            React.createElement('button', { onClick: onClose, className: "text-slate-500 dark:text-brand-text-light hover:text-slate-900 dark:hover:text-white transition-colors" },
              React.createElement(CloseIcon, null)
            )
          ),
          React.createElement('form', { onSubmit: handleSubmit, className: "p-6 space-y-4" },
            React.createElement('div', null,
              React.createElement('label', { htmlFor: "cardNumber", className: "block text-sm font-medium text-slate-500 dark:text-brand-text-light mb-1" }, t.cardNumber),
              React.createElement('div', { className: "relative" },
                React.createElement('input', { type: "text", id: "cardNumber", required: true, placeholder: "0000 0000 0000 0000", className: "w-full p-2 pl-10 bg-slate-100 dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-md focus:ring-2 focus:ring-brand-blue focus:outline-none" }),
                React.createElement('div', { className: "absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none" }, React.createElement(CreditCardIcon, { className: "w-5 h-5 text-slate-400 dark:text-brand-text-light" }))
              )
            ),
            React.createElement('div', { className: "grid grid-cols-2 gap-4" },
              React.createElement('div', null,
                React.createElement('label', { htmlFor: "expiryDate", className: "block text-sm font-medium text-slate-500 dark:text-brand-text-light mb-1" }, t.expiryDate),
                React.createElement('input', { type: "text", id: "expiryDate", required: true, placeholder: "MM/YY", className: "w-full p-2 bg-slate-100 dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-md focus:ring-2 focus:ring-brand-blue focus:outline-none" })
              ),
              React.createElement('div', null,
                React.createElement('label', { htmlFor: "cvc", className: "block text-sm font-medium text-slate-500 dark:text-brand-text-light mb-1" }, t.cvc),
                React.createElement('input', { type: "text", id: "cvc", required: true, placeholder: "123", className: "w-full p-2 bg-slate-100 dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-md focus:ring-2 focus:ring-brand-blue focus:outline-none" })
              )
            ),
            React.createElement('button', { type: "submit", className: "w-full bg-brand-red hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-full transition-colors" }, `${t.payNow} ${planPrice}`)
          )
        );
    }
  };

  return React.createElement('div', {
    className: `fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[100] flex justify-center items-center backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`,
    onClick: onClose,
    role: "dialog",
    "aria-modal": "true"
  },
    React.createElement('div', {
      onClick: (e) => e.stopPropagation(),
      className: `bg-white dark:bg-card-gradient rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/10 transform transition-all ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`
    },
      React.createElement(ModalContent, null)
    )
  );
};

export default PaymentModal;