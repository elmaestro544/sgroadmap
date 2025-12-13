
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n, HUMANIZE_MODES } from '../constants.js';
import { Spinner, CopyIcon, SpeakerIcon, StopIcon } from './Shared.js';
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


const AIHumanizer = ({ language }) => {
  const t = i18n[language];
  const [sourceText, setSourceText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(HUMANIZE_MODES[6].id); // Default to 'humanize'
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

  const handleHumanize = useCallback(async () => {
    if (!sourceText.trim() || isLoading) return;

    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsSpeaking(false);
    }

    setIsLoading(true);
    setHumanizedText('');
    try {
      const result = await apiService.humanizeText(sourceText, selectedMode, language);
      setHumanizedText(result);
    } catch (error) {
      console.error("Humanizing error:", error);
      setHumanizedText(t.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, selectedMode, isLoading, t.errorOccurred, language]);
  
  const handleCopy = () => {
    if (humanizedText) {
      navigator.clipboard.writeText(humanizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleListen = async () => {
    if (!humanizedText || isAudioLoading) return;

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
        const base64Audio = await apiService.generateSpeech(humanizedText);
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

  const selectedModeDetails = HUMANIZE_MODES.find(m => m.id === selectedMode);

  return React.createElement('div', { className: "max-w-6xl mx-auto" },
    React.createElement('div', { className: "text-center mb-8" },
      React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.humanizerTitle),
      React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.humanizerDescription)
    ),

    React.createElement('div', { className: "bg-white dark:bg-card-gradient p-3 rounded-xl border border-slate-200 dark:border-white/10 mb-4" },
      React.createElement('div', { className: "flex flex-wrap items-center justify-center gap-2" },
        HUMANIZE_MODES.map(mode => (
          React.createElement('button', {
            key: mode.id,
            onClick: () => setSelectedMode(mode.id),
            className: `px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${selectedMode === mode.id ? 'bg-brand-red text-white' : 'bg-transparent text-slate-500 dark:text-brand-text-light hover:bg-slate-100 dark:hover:bg-white/10'}`
          }, mode.name(language))
        ))
      )
    ),

    React.createElement('p', { className: "text-center text-slate-500 dark:text-brand-text-light mb-6 min-h-[2rem] transition-opacity duration-300" }, 
        selectedModeDetails ? selectedModeDetails.description(language) : ''
    ),

    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
      // Input Panel
      React.createElement('div', { className: "flex flex-col gap-4" },
        React.createElement('textarea', {
          value: sourceText,
          onChange: (e) => setSourceText(e.target.value),
          placeholder: t.enterAIText,
          className: "w-full h-64 md:h-80 p-3 bg-slate-100 dark:bg-input-gradient border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none resize-none"
        }),
        React.createElement('button', {
          onClick: handleHumanize,
          disabled: isLoading || !sourceText.trim(),
          className: "w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
        }, isLoading ? React.createElement(Spinner, { size: '6' }) : (selectedModeDetails ? selectedModeDetails.name(language) : '...'))
      ),

      // Output Panel
      React.createElement('div', { className: "relative w-full h-64 md:h-96 p-3 bg-white dark:bg-card-gradient border border-slate-200 dark:border-white/10 rounded-xl overflow-y-auto" },
        isLoading ? (
          React.createElement('div', { className: "flex items-center justify-center h-full" }, React.createElement(Spinner, null))
        ) : humanizedText ? (
          React.createElement(React.Fragment, null,
            React.createElement('div', {
              className: `absolute top-2.5 ${language === 'ar' ? 'left-2.5' : 'right-2.5'} flex items-center gap-2`
            },
              React.createElement('button', {
                  onClick: handleListen,
                  disabled: isAudioLoading,
                  className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50'
              }, isAudioLoading ? React.createElement(Spinner, {size: '4'}) : (isSpeaking ? React.createElement(StopIcon, {className: "h-4 w-4"}) : React.createElement(SpeakerIcon, {className: "h-4 w-4"}))),
              React.createElement('button', {
                onClick: handleCopy,
                className: 'flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors'
              }, React.createElement(CopyIcon, { className: "h-4 w-4 mr-1.5" }), copied ? t.copied : t.copy)
            ),
            React.createElement('p', { className: "whitespace-pre-wrap pt-12" }, humanizedText)
          )
        ) : (
            React.createElement('div', { className: "flex items-center justify-center h-full text-slate-500 dark:text-brand-text-light" }, t.humanizedOutput)
        )
      )
    )
  );
};

export default AIHumanizer;
