
import React, { useState } from 'react';
import { i18n } from '../constants';
import * as geminiService from '../services/geminiService';
import { Spinner, CopyIcon } from './Shared';

const PromptGenerator = ({ language }) => {
  const t = i18n[language];
  const [topic, setTopic] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setGeneratedPrompt('');
    try {
      const prompt = await geminiService.generatePrompt(topic, language);
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error("Error generating prompt:", error);
      setGeneratedPrompt(t.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (generatedPrompt) {
        navigator.clipboard.writeText(generatedPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-text">{t.promptTitle}</h2>
        <p className="text-brand-text-light mt-2">{t.promptDescription}</p>
      </div>
      
      <div className="space-y-4">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t.promptPlaceholder}
          className="w-full h-24 p-3 bg-brand-light-dark border border-white/20 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none transition-colors"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !topic.trim()}
          className="w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
        >
          {isLoading ? <Spinner size="6" /> : t.generatePrompt}
        </button>
      </div>

      {generatedPrompt && (
        <div className="mt-8">
            <div className="relative bg-brand-light-dark p-4 border border-white/10 rounded-xl">
                <button
                    onClick={handleCopy}
                    className={`absolute top-2.5 ${language === 'ar' ? 'left-2.5' : 'right-2.5'} flex items-center bg-white/10 hover:bg-white/20 text-xs text-white py-1 px-3 rounded-full transition-colors`}
                >
                    <CopyIcon/> {copied ? t.copied : t.copy}
                </button>
                <p className="whitespace-pre-wrap text-brand-text font-mono text-sm leading-relaxed pt-6">{generatedPrompt}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default PromptGenerator;