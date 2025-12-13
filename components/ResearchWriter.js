


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n, RESEARCH_WRITER_TEMPLATES } from '../constants.js';
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


const ResearchWriter = ({ language }) => {
  const t = i18n[language];
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleGenerate = useCallback(async () => {
    if (!userInput.trim() || isLoading || !selectedTemplate) return;
    
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsSpeaking(false);
    }

    setIsLoading(true);
    setGeneratedContent('');
    try {
      const stream = await apiService.generateResearchContent(userInput, selectedTemplate.id, language);
      let responseText = '';
      for await (const chunk of stream) {
        responseText += chunk.text;
        setGeneratedContent(responseText);
      }
    } catch (error) {
      console.error("Research content generation error:", error);
      setGeneratedContent(t.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, selectedTemplate, isLoading, t.errorOccurred, language]);

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleListen = async () => {
    if (!generatedContent || isAudioLoading) return;

    if (isSpeaking) {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        setIsSpeaking(false);
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generatedContent;
    const textToSpeak = tempDiv.textContent || tempDiv.innerText || "";
    if (!textToSpeak.trim()) return;

    setIsSpeaking(true);
    setIsAudioLoading(true);

    try {
        const base64Audio = await apiService.generateSpeech(textToSpeak);
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
  
  const handleSelectTemplate = (template) => {
      setSelectedTemplate(template);
      setUserInput('');
      setGeneratedContent('');
  };

  const handleBack = () => {
      setSelectedTemplate(null);
  };
  
  if (!selectedTemplate) {
    return React.createElement('div', { className: "max-w-4xl mx-auto" },
      React.createElement('div', { className: "text-center mb-8" },
        React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.researchWriterTitle),
        React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.researchWriterDescription)
      ),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        RESEARCH_WRITER_TEMPLATES.map(template => React.createElement('div', {
          key: template.id,
          onClick: () => handleSelectTemplate(template),
          className: `relative bg-white dark:bg-card-gradient p-6 rounded-2xl border border-slate-200 dark:border-white/10 transition-all duration-300 transform hover:scale-105 hover:z-10 cursor-pointer shadow-lg dark:shadow-card hover:border-brand-red hover:shadow-brand-red/20 dark:hover:shadow-glow-red ${language === 'ar' ? 'text-right' : 'text-left'}`
        },
          React.createElement('h3', { className: "text-lg font-bold text-slate-900 dark:text-brand-text mb-2" }, template.title(language)),
          React.createElement('p', { className: "text-sm text-slate-500 dark:text-brand-text-light" }, template.description(language))
        ))
      )
    );
  }

  return React.createElement('div', { className: "max-w-6xl mx-auto" },
    React.createElement('div', { className: "mb-6" },
        React.createElement('button', {
            onClick: handleBack,
            className: `flex items-center text-sm font-semibold text-slate-500 dark:text-brand-text-light hover:text-slate-900 dark:hover:text-brand-text transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`
        }, React.createElement(ArrowLeftIcon, { className: language === 'ar' ? 'transform rotate-180' : '' }), t.backToTemplates),
        React.createElement('div', { className: "text-center" },
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, selectedTemplate.title(language)),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, selectedTemplate.description(language))
        )
    ),

    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
      // Input Panel
      React.createElement('div', { className: "flex flex-col gap-4" },
        React.createElement('textarea', {
          value: userInput,
          onChange: (e) => setUserInput(e.target.value),
          placeholder: `${t.enterTopicFor} ${selectedTemplate.title(language)}...`,
          className: "w-full min-h-[20rem] p-3 bg-slate-100 dark:bg-input-gradient border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none resize-y hover:border-brand-blue/40 transition-all shadow-inner"
        }),
        React.createElement('button', {
          onClick: handleGenerate,
          disabled: isLoading || !userInput.trim(),
          className: "w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
        }, isLoading ? React.createElement(Spinner, { size: '6' }) : t.generate)
      ),

      // Output Panel
      React.createElement('div', { className: "relative w-full min-h-[24rem] p-3 bg-white dark:bg-card-gradient border border-slate-200 dark:border-white/10 rounded-xl overflow-y-auto resize-y shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all duration-300" },
        isLoading && !generatedContent ? (
          React.createElement('div', { className: "flex items-center justify-center h-full" }, React.createElement(Spinner, null))
        ) : (
          React.createElement(React.Fragment, null,
            generatedContent && React.createElement('div', {
              className: `absolute top-2.5 ${language === 'ar' ? 'left-2.5' : 'right-2.5'} flex items-center gap-2 z-10`
            },
              React.createElement('button', {
                  onClick: handleListen,
                  disabled: isAudioLoading,
                  className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50 transition-colors'
              }, isAudioLoading ? React.createElement(Spinner, {size: '4'}) : (isSpeaking ? React.createElement(StopIcon, {className: "h-4 w-4"}) : React.createElement(SpeakerIcon, {className: "h-4 w-4"}))),
              React.createElement('button', {
                onClick: handleCopy,
                className: 'flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors'
              }, React.createElement(CopyIcon, { className: "h-4 w-4 mr-1.5" }), copied ? t.copied : t.copy)
            ),
            React.createElement('div', { className: "prose prose-slate dark:prose-invert prose-sm max-w-none whitespace-pre-wrap pt-12", dangerouslySetInnerHTML: { __html: generatedContent } })
          )
        )
      )
    )
  );
};

export default ResearchWriter;
