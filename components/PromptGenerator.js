


import React, { useState, useEffect, useRef } from 'react';
import { i18n } from '../constants.js';
import * as apiService from '../services/geminiService.js';
import * as historyService from '../services/historyService.js';
import { Spinner, CopyIcon, SpeakerIcon, StopIcon, HistoryIcon, ErrorIcon } from './Shared.js';
import HistoryPanel from './HistoryPanel.js';

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


const PromptGenerator = ({ language, currentUser }) => {
  const t = i18n[language];
  const [activeView, setActiveView] = useState('generator'); // 'generator' or 'checker'

  // Generator state
  const [topic, setTopic] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isSimpleLoading, setIsSimpleLoading] = useState(false);
  const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Checker state
  const [promptToCheck, setPromptToCheck] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [enhancedCopied, setEnhancedCopied] = useState(false);

  // Shared state
  const [history, setHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);

  const isCurrentModelConfigured = apiService.isModelConfigured('gemini');
  const SERVICE_ID = 'prompt';
  const isLoading = isSimpleLoading || isAdvancedLoading || isImageLoading || isVideoLoading;

  useEffect(() => {
    if (currentUser) {
      setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
    }
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    return () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, [currentUser]);

  const handleGenerate = async (type) => {
    if (!topic.trim() || isLoading || !isCurrentModelConfigured) return;
    
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsSpeaking(false);
    }

    if (type === 'simple') setIsSimpleLoading(true);
    else if (type === 'advanced') setIsAdvancedLoading(true);
    else if (type === 'image') setIsImageLoading(true);
    else if (type === 'video') setIsVideoLoading(true);
    
    setGeneratedPrompt('');
    try {
      const prompt = await apiService.generatePrompt(topic, language, type);
      setGeneratedPrompt(prompt);
      if (currentUser) {
          const historyItem = { topic, prompt, type };
          historyService.addHistoryItem(currentUser.email, SERVICE_ID, historyItem);
          setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
      setGeneratedPrompt(t.errorOccurred);
    } finally {
      setIsSimpleLoading(false);
      setIsAdvancedLoading(false);
      setIsImageLoading(false);
      setIsVideoLoading(false);
    }
  };

  const handleCheckPrompt = async () => {
    if (!promptToCheck.trim() || isChecking || !isCurrentModelConfigured) return;
    setIsChecking(true);
    setAnalysisResult(null);
    try {
        const result = await apiService.checkPrompt(promptToCheck, language);
        setAnalysisResult(result);
    } catch (error) {
        console.error("Error checking prompt:", error);
        setAnalysisResult({ error: t.errorOccurred });
    } finally {
        setIsChecking(false);
    }
  };
  
  const handleCopy = (textToCopy, setCopiedState) => {
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
    }
  };

  const handleListen = async (textToSpeak) => {
    if (!textToSpeak) return;

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

  const handleHistoryItemClick = (item) => {
    setTopic(item.topic);
    setGeneratedPrompt(item.prompt);
    setActiveView('generator');
    setIsHistoryOpen(false);
  };

  const handleClearHistory = () => {
    if (currentUser) {
        setHistory(historyService.clearHistory(currentUser.email, SERVICE_ID));
    }
  };
  
  const renderHistoryItem = (item) => (
    React.createElement('div', {
        key: item.id,
        onClick: () => handleHistoryItemClick(item),
        className: "p-3 bg-slate-200/50 dark:bg-card-gradient border border-slate-300/50 dark:border-white/10 rounded-lg cursor-pointer hover:bg-brand-blue/10 dark:hover:bg-brand-blue/30 hover:border-brand-blue/30 transition-all duration-300"
      },
        React.createElement('p', { className: "text-sm font-semibold text-slate-600 dark:text-brand-text-light truncate" }, item.topic),
        React.createElement('p', { className: "text-xs text-slate-500 dark:text-brand-text-light mt-1 truncate" }, item.prompt)
    )
  );
  
  const renderGeneratorView = () => {
    const promptTypes = [
        { type: 'simple', label: t.generateSimplePrompt, loading: isSimpleLoading },
        { type: 'advanced', label: t.generateAdvancedPrompt, loading: isAdvancedLoading },
        { type: 'image', label: t.generateImagePrompt, loading: isImageLoading },
        { type: 'video', label: t.generateVideoPrompt, loading: isVideoLoading },
    ];
    
    return React.createElement('div', null,
        React.createElement('div', { className: "text-center mb-8" },
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.promptTitle),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.promptDescription)
        ),
        React.createElement('div', { className: "space-y-4" },
            React.createElement('textarea', {
                value: topic,
                onChange: (e) => setTopic(e.target.value),
                placeholder: t.promptPlaceholder,
                className: "w-full min-h-[8rem] p-3 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-y hover:border-brand-blue/40 shadow-inner",
                disabled: isLoading
            }),
            React.createElement('div', { className: "grid grid-cols-2 sm:grid-cols-4 gap-4" },
                promptTypes.map(({ type, label, loading }) => (
                    React.createElement('button', {
                        key: type,
                        onClick: () => handleGenerate(type),
                        disabled: isLoading || !topic.trim() || !isCurrentModelConfigured,
                        className: "w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-md hover:shadow-lg"
                    }, loading ? React.createElement(Spinner, { size: "6" }) : label)
                ))
            )
        ),
        (isLoading || generatedPrompt) && (
            React.createElement('div', { className: "mt-8" },
                React.createElement('div', { className: "relative bg-white dark:bg-card-gradient p-4 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:border-brand-blue/30" },
                    !generatedPrompt && isLoading ? (
                        React.createElement('div', {className: "flex justify-center items-center min-h-[100px]"}, React.createElement(Spinner, {}))
                    ) : (
                        React.createElement(React.Fragment, null, 
                            React.createElement('div', { className: `absolute top-2.5 ${language === 'ar' ? 'left-2.5' : 'right-2.5'} flex items-center gap-2` },
                                React.createElement('button', { onClick: () => handleListen(generatedPrompt), disabled: isAudioLoading, className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50 transition-colors'}, isAudioLoading ? React.createElement(Spinner, {size: '4'}) : (isSpeaking ? React.createElement(StopIcon, {className: "h-4 w-4"}) : React.createElement(SpeakerIcon, {className: "h-4 w-4"}))),
                                React.createElement('button', { onClick: () => handleCopy(generatedPrompt, setCopied), className: 'flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors' },
                                    React.createElement(CopyIcon, {className: 'h-4 w-4 mr-1'}), copied ? t.copied : t.copy)
                            ),
                            React.createElement('p', { className: "whitespace-pre-wrap text-slate-800 dark:text-brand-text font-mono text-sm leading-relaxed pt-12" }, generatedPrompt)
                        )
                    )
                )
            )
        )
    );
  };

  const renderCheckerView = () => (
    React.createElement('div', null,
        React.createElement('div', { className: "text-center mb-8" },
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.promptCheckerTitle),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.promptCheckerDescription)
        ),
        React.createElement('div', { className: "space-y-4" },
            React.createElement('textarea', {
                value: promptToCheck,
                onChange: (e) => setPromptToCheck(e.target.value),
                placeholder: t.enterPromptToCheck,
                className: "w-full min-h-[10rem] p-3 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-y hover:border-brand-blue/40 shadow-inner",
                disabled: isChecking
            }),
            React.createElement('button', {
                onClick: handleCheckPrompt,
                disabled: isChecking || !promptToCheck.trim() || !isCurrentModelConfigured,
                className: "w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
            }, isChecking ? React.createElement(Spinner, { size: "6" }) : t.checkPromptButton)
        ),

        isChecking && React.createElement('div', { className: "flex justify-center items-center gap-2 mt-8 text-slate-500 dark:text-brand-text-light" },
            React.createElement(Spinner, {}),
            React.createElement('span', null, t.checkingPrompt)
        ),

        analysisResult && !analysisResult.error && (
            React.createElement('div', { className: "mt-8 space-y-6" },
                React.createElement('div', { className: "bg-white dark:bg-card-gradient p-4 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:border-brand-blue/30" },
                    React.createElement('h3', { className: "font-bold text-lg text-brand-red mb-2" }, t.qualityLevelTitle),
                    React.createElement('div', { className: "flex items-center gap-4" },
                        React.createElement('span', { className: "text-2xl font-bold px-4 py-1 bg-brand-red/10 rounded-lg" }, analysisResult.qualityLevel),
                        React.createElement('p', { className: "text-slate-600 dark:text-brand-text-light" }, analysisResult.assessment)
                    )
                ),
                React.createElement('div', { className: "bg-white dark:bg-card-gradient p-4 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:border-brand-blue/30" },
                    React.createElement('h3', { className: "font-bold text-lg text-slate-900 dark:text-brand-text mb-2" }, t.analysisTitle),
                    React.createElement('p', { className: "text-slate-600 dark:text-brand-text-light" }, analysisResult.analysis)
                ),
                analysisResult.issues && analysisResult.issues.length > 0 && (
                    React.createElement('div', { className: "bg-white dark:bg-card-gradient p-4 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:border-brand-blue/30" },
                        React.createElement('h3', { className: "font-bold text-lg text-slate-900 dark:text-brand-text mb-2" }, t.errorsTitle),
                        React.createElement('ul', { className: "space-y-3" },
                            analysisResult.issues.map((issue, index) => (
                                React.createElement('li', { key: index, className: "flex items-start gap-3" },
                                    React.createElement('div', { className: 'mt-1 flex-shrink-0'}, React.createElement(ErrorIcon, { className: "h-5 w-5 text-red-500" })),
                                    React.createElement('div', null,
                                        React.createElement('p', { className: "font-semibold text-slate-800 dark:text-brand-text" }, issue.issue),
                                        React.createElement('p', { className: "text-sm text-slate-500 dark:text-brand-text-light" }, issue.explanation)
                                    )
                                )
                            ))
                        )
                    )
                ),
                React.createElement('div', { className: "relative bg-white dark:bg-card-gradient p-4 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:border-brand-blue/30" },
                    React.createElement('h3', { className: "font-bold text-lg text-slate-900 dark:text-brand-text mb-2" }, t.enhancedPromptTitle),
                     React.createElement('div', { className: `absolute top-2.5 ${language === 'ar' ? 'left-2.5' : 'right-2.5'} flex items-center gap-2` },
                        React.createElement('button', { onClick: () => handleListen(analysisResult.enhancedPrompt), disabled: isAudioLoading, className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50 transition-colors'}, isAudioLoading ? React.createElement(Spinner, {size: '4'}) : (isSpeaking ? React.createElement(StopIcon, {className: "h-4 w-4"}) : React.createElement(SpeakerIcon, {className: "h-4 w-4"}))),
                        React.createElement('button', { onClick: () => handleCopy(analysisResult.enhancedPrompt, setEnhancedCopied), className: 'flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors' },
                            React.createElement(CopyIcon, {className: 'h-4 w-4 mr-1'}), enhancedCopied ? t.copied : t.copy)
                    ),
                    React.createElement('p', { className: "whitespace-pre-wrap text-slate-800 dark:text-brand-text font-mono text-sm leading-relaxed pt-12" }, analysisResult.enhancedPrompt)
                )
            )
        )
    )
  );

  return React.createElement('div', { className: "relative" },
    currentUser && React.createElement('button', {
        onClick: () => setIsHistoryOpen(true),
        'aria-label': t.history,
        className: `absolute top-0 ${language === 'ar' ? 'left-0' : 'right-0'} z-10 p-2 text-slate-500 dark:text-brand-text-light hover:bg-slate-200 dark:hover:bg-white/20 rounded-full transition-colors`
      },
      React.createElement(HistoryIcon, null)
    ),
    React.createElement('div', null,
        React.createElement('div', { className: "flex justify-center mb-8 border-b border-slate-300 dark:border-white/20" },
            React.createElement('button', { 
                onClick: () => setActiveView('generator'), 
                className: `px-6 py-3 font-semibold transition-colors ${activeView === 'generator' ? 'border-b-2 border-brand-red text-brand-red' : 'text-slate-500 dark:text-brand-text-light hover:text-brand-red/80'}`
            }, t.tabGenerate),
            React.createElement('button', { 
                onClick: () => setActiveView('checker'), 
                className: `px-6 py-3 font-semibold transition-colors ${activeView === 'checker' ? 'border-b-2 border-brand-red text-brand-red' : 'text-slate-500 dark:text-brand-text-light hover:text-brand-red/80'}`
            }, t.tabCheck)
        ),
        
        !isCurrentModelConfigured && React.createElement('div', { className: "text-center bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-sm text-brand-red font-semibold mb-4" },
            t.apiKeyErrorForModel.replace('{modelName}', 'Google Gemini')
        ),

        activeView === 'generator' ? renderGeneratorView() : renderCheckerView()
    ),
    currentUser && React.createElement(HistoryPanel, {
        isOpen: isHistoryOpen,
        onClose: () => setIsHistoryOpen(false),
        title: t.history,
        items: history,
        renderItem: renderHistoryItem,
        onClear: handleClearHistory,
        language: language
    })
  );
};

export default PromptGenerator;
