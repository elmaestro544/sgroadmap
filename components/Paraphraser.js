


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n, PARAPHRASE_MODES } from '../constants.js';
import { Spinner, CopyIcon, ArrowLeftIcon, SpeakerIcon, StopIcon } from './Shared.js';
import * as apiService from '../services/geminiService.js';

// Helper functions for audio playback
function decode(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data, ctx) {
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}


const Paraphraser = ({ language }) => {
  const t = i18n[language];
  const [sourceText, setSourceText] = useState('');
  const [paraphrasedSuggestions, setParaphrasedSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(PARAPHRASE_MODES[0].id);
  const [currentPage, setCurrentPage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    return () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, []);
  
  const handleParaphrase = useCallback(async () => {
    if (!sourceText.trim() || isLoading) return;
    
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsSpeaking(false);
    }

    setIsLoading(true);
    setParaphrasedSuggestions([]);
    setCurrentPage(0);
    try {
      const result = await apiService.paraphraseText(sourceText, selectedMode, language);
      setParaphrasedSuggestions(result || []);
    } catch (error) {
      console.error("Paraphrasing error:", error);
      setParaphrasedSuggestions([t.errorOccurred]);
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, selectedMode, isLoading, t.errorOccurred, language]);
  
  const handleCopy = () => {
    const currentSuggestion = paraphrasedSuggestions[currentPage];
    if (currentSuggestion) {
      navigator.clipboard.writeText(currentSuggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleListen = async () => {
    const text = paraphrasedSuggestions[currentPage];
    if (!text || isAudioLoading) return;

    if (isSpeaking) {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        setIsSpeaking(false);
        return;
    }

    setIsSpeaking(true);
    setIsAudioLoading(true);

    try {
        const base64Audio = await apiService.generateSpeech(text);
        const audioData = decode(base64Audio);
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        const audioBuffer = await decodeAudioData(audioData, audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
            setIsSpeaking(false);
            audioSourceRef.current = null;
        };
        source.start(0);
        audioSourceRef.current = source;
    } catch (error) {
        console.error("Error playing speech:", error);
        alert(`Could not play audio: ${error.message}`);
        setIsSpeaking(false);
    } finally {
        setIsAudioLoading(false);
    }
  };

  const selectedModeName = PARAPHRASE_MODES.find(m => m.id === selectedMode)?.name(language) || '';

  return React.createElement('div', { className: "max-w-6xl mx-auto" },
    React.createElement('div', { className: "text-center mb-8" },
      React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.paraphraserTitle),
      React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.paraphraserDescription)
    ),

    React.createElement('div', { className: "flex justify-center flex-wrap gap-2 mb-4" },
      PARAPHRASE_MODES.map(mode => (
        React.createElement('button', {
          key: mode.id,
          onClick: () => setSelectedMode(mode.id),
          className: `px-4 py-2 text-sm font-semibold rounded-full transition-colors ${selectedMode === mode.id ? 'bg-brand-red text-white shadow-md' : 'bg-slate-200 dark:bg-card-gradient text-slate-700 dark:text-brand-text-light hover:bg-slate-300 dark:hover:bg-brand-blue/50'}`
        }, mode.name(language))
      ))
    ),

    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
      // Input Panel
      React.createElement('div', { className: "flex flex-col gap-4" },
        React.createElement('textarea', {
          value: sourceText,
          onChange: (e) => setSourceText(e.target.value),
          placeholder: t.enterTextToParaphrase,
          className: "w-full min-h-[20rem] p-3 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none resize-y hover:border-brand-blue/40 transition-all shadow-inner"
        }),
        React.createElement('button', {
          onClick: handleParaphrase,
          disabled: isLoading || !sourceText.trim(),
          className: "w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
        }, isLoading ? React.createElement(Spinner, { size: '6' }) : t.paraphraseButton)
      ),

      // Output Panel
      React.createElement('div', { className: "relative w-full min-h-[20rem] bg-white dark:bg-card-gradient border border-slate-200 dark:border-white/10 rounded-xl flex flex-col resize-y overflow-hidden shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all duration-300" },
        isLoading ? (
          React.createElement('div', { className: "flex items-center justify-center h-full" }, React.createElement(Spinner, null))
        ) : paraphrasedSuggestions.length > 0 ? (
          React.createElement(React.Fragment, null,
            React.createElement('div', { className: "flex justify-between items-center p-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0" },
                React.createElement('h3', { className: "font-bold text-lg text-brand-red" }, selectedModeName),
                React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('button', {
                        onClick: handleListen,
                        disabled: isAudioLoading,
                        className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50 transition-colors'
                    }, isAudioLoading ? React.createElement(Spinner, {size: '4'}) : (isSpeaking ? React.createElement(StopIcon, {className: "h-4 w-4"}) : React.createElement(SpeakerIcon, {className: "h-4 w-4"}))),
                    React.createElement('button', {
                      onClick: handleCopy,
                      className: `flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors`
                    }, React.createElement(CopyIcon, { className: "h-4 w-4 mr-1.5" }), copied ? t.copied : t.copy)
                )
            ),
            React.createElement('div', { className: 'flex-grow p-4 overflow-y-auto flex items-center justify-center' },
                React.createElement('p', { className: 'text-slate-700 dark:text-brand-text text-center' }, paraphrasedSuggestions[currentPage])
            ),
            paraphrasedSuggestions.length > 1 && React.createElement('div', { className: 'flex justify-between items-center p-2 border-t border-slate-200 dark:border-white/10 flex-shrink-0' },
                React.createElement('button', {
                    onClick: () => setCurrentPage(p => p - 1),
                    disabled: currentPage === 0,
                    className: "flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-brand-text-light disabled:opacity-50 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                }, React.createElement(ArrowLeftIcon, { className: `w-4 h-4 mr-1 ${language === 'ar' ? 'transform rotate-180' : ''}` }), t.previous),
                React.createElement('span', { className: 'text-sm font-medium text-slate-500 dark:text-brand-text-light' }, `${currentPage + 1} / ${paraphrasedSuggestions.length}`),
                 React.createElement('button', {
                    onClick: () => setCurrentPage(p => p + 1),
                    disabled: currentPage >= paraphrasedSuggestions.length - 1,
                    className: "flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-brand-text-light disabled:opacity-50 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                }, t.next, React.createElement(ArrowLeftIcon, { className: `w-4 h-4 ml-1 ${language !== 'ar' ? 'transform rotate-180' : ''}` }))
            )
          )
        ) : (
            React.createElement('div', { className: "flex items-center justify-center h-full text-slate-500 dark:text-brand-text-light" }, t.paraphrasedOutput)
        )
      )
    )
  );
};

export default Paraphraser;
