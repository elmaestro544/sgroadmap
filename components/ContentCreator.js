


import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n, CONTENT_TYPES, TONES } from '../constants.js';
import { Spinner, CopyIcon, SpeakerIcon, StopIcon, DownloadIcon } from './Shared.js';
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

const ContentCreator = ({ language }) => {
  const t = i18n[language];
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState(CONTENT_TYPES[0].id);
  const [tone, setTone] = useState(TONES[0].id);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioDownloading, setIsAudioDownloading] = useState(false);

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
    if (!topic.trim() || isLoading) return;
    
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsSpeaking(false);
    }

    setIsLoading(true);
    setGeneratedContent('');
    try {
      const result = await apiService.generateContent(topic, contentType, tone, language);
      setGeneratedContent(result);
    } catch (error) {
      console.error("Content generation error:", error);
      setGeneratedContent(t.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [topic, contentType, tone, isLoading, t.errorOccurred, language]);

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

  const handleDownloadAudio = async () => {
    if (!generatedContent || isAudioDownloading) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generatedContent;
    const textToSpeak = tempDiv.textContent || tempDiv.innerText || "";
    if (!textToSpeak.trim()) return;

    setIsAudioDownloading(true);

    try {
        const base64Audio = await apiService.generateSpeech(textToSpeak);
        const pcmData = decode(base64Audio);

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const dataSize = pcmData.length;
        
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, 'WAVE');
        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); 
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        // "data" sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        for (let i = 0; i < pcmData.length; i++) {
            view.setUint8(44 + i, pcmData[i]);
        }

        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SciGenius_Audio.wav';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error("Error downloading audio:", error);
        alert(`Could not download audio: ${error.message}`);
    } finally {
        setIsAudioDownloading(false);
    }
  };


  const ButtonGroup = ({ label, value, onChange, options }) => (
    React.createElement('div', null,
      React.createElement('label', { className: "block text-sm font-medium text-slate-500 dark:text-brand-text-light mb-2" }, label),
      React.createElement('div', { className: "flex flex-wrap gap-2" },
        options.map(option => React.createElement('button', {
          key: option.id,
          onClick: () => onChange(option.id),
          className: `px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${value === option.id ? 'bg-brand-red text-white shadow-md' : 'bg-slate-200 dark:bg-card-gradient text-slate-700 dark:text-brand-text-light hover:bg-slate-300 dark:hover:bg-brand-blue/50'}`
        }, language === 'ar' ? option.ar : option.en))
      )
    )
  );

  return React.createElement('div', { className: "max-w-6xl mx-auto" },
    React.createElement('div', { className: "text-center mb-8" },
      React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.contentCreatorTitle),
      React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.contentCreatorDescription)
    ),

    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
      // Input Panel
      React.createElement('div', { className: "flex flex-col gap-4" },
        React.createElement('textarea', {
          value: topic,
          onChange: (e) => setTopic(e.target.value),
          placeholder: t.enterTopic,
          className: "w-full min-h-[12rem] p-3 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-blue focus:outline-none resize-y hover:border-brand-blue/40 transition-all shadow-inner"
        }),
        React.createElement(ButtonGroup, {
          label: t.contentType,
          value: contentType,
          onChange: setContentType,
          options: CONTENT_TYPES
        }),
        React.createElement(ButtonGroup, {
          label: t.tone,
          value: tone,
          onChange: setTone,
          options: TONES
        }),
        React.createElement('button', {
          onClick: handleGenerate,
          disabled: isLoading || !topic.trim(),
          className: "w-full flex justify-center items-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50 mt-2"
        }, isLoading ? React.createElement(Spinner, { size: '6' }) : t.generateContentButton)
      ),

      // Output Panel
      React.createElement('div', { className: "relative w-full min-h-[24rem] p-3 bg-white dark:bg-card-gradient border border-slate-200 dark:border-white/10 rounded-xl overflow-y-auto shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all duration-300 resize-y" },
        isLoading ? (
          React.createElement('div', { className: "flex items-center justify-center h-full" }, React.createElement(Spinner, null))
        ) : generatedContent ? (
          React.createElement(React.Fragment, null,
            React.createElement('div', {
              className: `absolute top-2.5 ${language === 'ar' ? 'left-2.5' : 'right-2.5'} flex items-center gap-2`
            },
              React.createElement('button', {
                  onClick: handleListen,
                  disabled: isAudioLoading || isAudioDownloading,
                  className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50 transition-colors'
              }, isAudioLoading ? React.createElement(Spinner, {size: '4'}) : (isSpeaking ? React.createElement(StopIcon, {className: "h-4 w-4"}) : React.createElement(SpeakerIcon, {className: "h-4 w-4"}))),
              React.createElement('button', {
                onClick: handleDownloadAudio,
                disabled: isAudioDownloading || isSpeaking,
                className: 'flex items-center justify-center h-7 w-7 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 p-1.5 rounded-full disabled:opacity-50 transition-colors'
              }, isAudioDownloading ? React.createElement(Spinner, { size: '4' }) : React.createElement(DownloadIcon, { className: 'h-4 w-4' })),
              React.createElement('button', {
                onClick: handleCopy,
                className: 'flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors'
              }, React.createElement(CopyIcon, { className: "h-4 w-4 mr-1.5" }), copied ? t.copied : t.copy)
            ),
            React.createElement('div', { className: "prose prose-slate dark:prose-invert prose-sm max-w-none whitespace-pre-wrap pt-12", dangerouslySetInnerHTML: { __html: generatedContent } })
          )
        ) : (
          React.createElement('div', { className: "flex items-center justify-center h-full text-slate-500 dark:text-brand-text-light" }, t.generatedContentOutput)
        )
      )
    )
  );
};

export default ContentCreator;
