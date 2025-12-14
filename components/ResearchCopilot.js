


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language, i18n } from '../constants.js';
import * as apiService from '../services/geminiService.js';
import { Spinner, UploadIcon, SendIcon, SpeakerIcon, StopIcon } from './Shared.js';

// PaperCard Component defined within ResearchCopilot
const PaperCard = ({ paper, language }) => (
  React.createElement('div', { className: "bg-white dark:bg-card-gradient p-4 rounded-xl border border-slate-200 dark:border-white/10 transition-all duration-300 hover:border-brand-blue/30 hover:shadow-md transform hover:-translate-y-1" },
    React.createElement('a', { href: paper.link, target: "_blank", rel: "noopener noreferrer", className: "text-brand-blue font-bold text-lg hover:underline" }, paper.title),
    React.createElement('p', { className: "text-sm text-slate-500 dark:text-brand-text-light mt-1" }, `${paper.authors.join(', ')} (${paper.year})`),
    React.createElement('p', { className: "text-base text-slate-800 dark:text-brand-text mt-2" }, paper.summary)
  )
);

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
    const sampleRate = 24000; // Gemini TTS sample rate
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

const ResearchCopilot = ({ language }) => {
  const t = i18n[language];
  const [file, setFile] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);

  useEffect(() => {
      setChat(apiService.createChatSession());
      setMessages([]);
      setFile(null);
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      setIsUploading(true);
      setFile(selectedFile);
      setMessages([]);
      // Simulate upload time
      setTimeout(() => setIsUploading(false), 500);
    }
  };

  const handleDragEvents = (e, over) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(over);
  };
  
  const handleDrop = (e) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
        handleFileChange(droppedFile);
    }
  };

  const handleSendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setSpeakingMessageIndex(null);
    }
    
    const isFirstMessageWithFile = file && messages.length === 0;
    const userMessage = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
        if (messageText === t.suggestion3) {
            const topic = file ? `related to the document "${file.name}"` : 'the latest advancements in AI';
            const { papers, sources } = await apiService.findRelatedPapers(topic);
            const modelMessage = { sender: 'model', text: t.relatedPapers, papers, sources };
            setMessages(prev => [...prev, modelMessage]);
        } else if (chat) {
            const stream = await apiService.sendMessageStream(chat, messageText, isFirstMessageWithFile ? file : undefined);
            let responseText = '';
            setMessages(prev => [...prev, { sender: 'model', text: '' }]);
            for await (const chunk of stream) {
                responseText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = responseText;
                    return newMessages;
                });
            }
        }
    } catch (error) {
        console.error("Error sending message:", error);
        setMessages(prev => [...prev, { sender: 'model', text: t.errorOccurred }]);
    } finally {
        setIsLoading(false);
    }
  }, [chat, file, isLoading, messages.length, t]);
  
  const handleListen = async (text, index) => {
    if (!text) return;

    if (speakingMessageIndex === index) {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        setSpeakingMessageIndex(null);
        return;
    }

    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
    }

    setSpeakingMessageIndex(index);
    setIsAudioLoading(index);

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
            if (speakingMessageIndex === index) {
                setSpeakingMessageIndex(null);
            }
            audioSourceRef.current = null;
        };
        
        source.start(0);
        audioSourceRef.current = source;
    } catch (error) {
        console.error("Error playing speech:", error);
        alert(`Could not play audio: ${error.message}`);
        setSpeakingMessageIndex(null);
    } finally {
        setIsAudioLoading(null);
    }
  };

  return React.createElement('div', { className: "flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto" },
    React.createElement('div', { className: "text-center mb-6" },
      React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.researchTitle),
      React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.researchDescription)
    ),
    !file && (
      React.createElement('div', {
        onClick: () => fileInputRef.current?.click(),
        onDragOver: (e) => handleDragEvents(e, true),
        onDragLeave: (e) => handleDragEvents(e, false),
        onDrop: handleDrop,
        className: `flex-grow flex flex-col justify-center items-center border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${isDragOver ? 'border-brand-blue bg-slate-200 dark:bg-card-gradient' : 'bg-white dark:bg-card-gradient border-slate-300 dark:border-white/20 hover:border-brand-blue/50 hover:shadow-lg'}`
      },
        React.createElement(UploadIcon, null),
        React.createElement('p', { className: "mt-4 text-lg text-slate-500 dark:text-brand-text-light" }, t.uploadArea),
        React.createElement('input', { type: "file", ref: fileInputRef, onChange: (e) => handleFileChange(e.target.files?.[0] || null), className: "hidden", accept: ".pdf,.txt,.md,image/*" })
      )
    ),
    file && (
      React.createElement('div', { className: "flex flex-col flex-grow bg-white dark:bg-card-gradient rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl hover:shadow-2xl hover:border-brand-blue/20 transition-all duration-300" },
        React.createElement('div', { ref: chatContainerRef, className: "flex-grow p-4 space-y-4 overflow-y-auto" },
          messages.length === 0 && !isUploading && (
            React.createElement('div', { className: "text-center p-4 bg-slate-50 dark:bg-black/20 rounded-lg" },
              React.createElement('p', { className: "text-slate-800 dark:text-brand-text" }, React.createElement('strong', null, file.name), ` ${t.fileReady}`),
              React.createElement('div', { className: `grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 ${language === Language.AR ? 'sm:grid-flow-col-dense' : ''}` },
                [t.suggestion1, t.suggestion2, t.suggestion3].map(suggestion => {
                  const buttonProps = {
                    key: suggestion,
                    onClick: () => handleSendMessage(suggestion),
                    className: "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-brand-text py-2 px-3 rounded-full text-sm transition-colors shadow-sm hover:shadow-md"
                  };
                  return React.createElement('button', buttonProps, suggestion);
                })
              )
            )
          ),
          messages.map((msg, index) => (
            React.createElement('div', { key: index, className: `flex ${msg.sender === 'user' ? (language === Language.AR ? 'justify-start' : 'justify-end') : (language === Language.AR ? 'justify-end' : 'justify-start')}` },
              React.createElement('div', { className: `relative max-w-lg p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-card-gradient text-slate-800 dark:text-brand-text border border-slate-200 dark:border-white/5'}` },
                msg.sender === 'model' && msg.text && React.createElement('button', {
                    onClick: () => handleListen(msg.text, index),
                    className: `absolute top-2 ${language === 'ar' ? 'left-2' : 'right-2'} h-7 w-7 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors`
                }, isAudioLoading === index 
                    ? React.createElement(Spinner, { size: "4" }) 
                    : speakingMessageIndex === index 
                        ? React.createElement(StopIcon, {className: "h-4 w-4"}) 
                        : React.createElement(SpeakerIcon, {className: "h-4 w-4"})
                ),
                React.createElement('p', { className: `whitespace-pre-wrap ${language === 'ar' ? 'pl-10' : 'pr-10'}` }, msg.text),
                msg.papers && (
                  React.createElement('div', { className: "grid grid-cols-1 gap-3 mt-4" },
                    msg.papers.map((paper, i) => React.createElement(PaperCard, { key: i, paper: paper, language: language }))
                  )
                ),
                msg.sources && msg.sources.length > 0 && (
                  React.createElement('div', { className: "mt-3 pt-2 border-t border-slate-300 dark:border-white/20" },
                    React.createElement('h4', { className: "font-semibold text-sm mb-1" }, t.sources),
                    React.createElement('div', { className: "flex flex-wrap gap-2" },
                      msg.sources.map((source, i) => (
                        React.createElement('a', { key: i, href: source.web?.uri, target: "_blank", rel: "noopener noreferrer", className: "text-xs bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 py-1 px-2 rounded-full transition-colors truncate" },
                          source.web?.title || new URL(source.web?.uri || '').hostname
                        )
                      ))
                    )
                  )
                )
              )
            )
          )),
          isLoading && (
            React.createElement('div', { className: "flex justify-start" },
              React.createElement('div', { className: "bg-slate-100 dark:bg-card-gradient p-3 rounded-2xl flex items-center space-x-2 border border-slate-200 dark:border-white/10" },
                React.createElement(Spinner, { size: "5" }),
                React.createElement('span', { className: "text-slate-500 dark:text-brand-text-light" }, t.thinking)
              )
            )
          )
        ),
        React.createElement('div', { className: "p-4 border-t border-slate-200 dark:border-white/10" },
          React.createElement('div', { className: `relative flex items-center ${language === Language.AR ? 'flex-row-reverse' : ''}` },
            React.createElement('input', {
              type: "text",
              value: userInput,
              onChange: (e) => setUserInput(e.target.value),
              onKeyDown: (e) => e.key === 'Enter' && handleSendMessage(userInput),
              placeholder: t.askPlaceholder,
              className: "w-full bg-slate-50 dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-full py-2.5 focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-inner",
              style: language === Language.AR ? { paddingRight: '1rem', paddingLeft: '3.5rem' } : { paddingLeft: '1rem', paddingRight: '3.5rem' },
              disabled: isLoading
            }),
            React.createElement('button', {
              onClick: () => handleSendMessage(userInput),
              disabled: !userInput.trim() || isLoading,
              className: `absolute h-8 w-8 rounded-full flex items-center justify-center bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all ${language === Language.AR ? 'left-2' : 'right-2'}`
            },
              React.createElement(SendIcon, null)
            )
          )
        )
      )
    )
  );
};

export default ResearchCopilot;
