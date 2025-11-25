
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { i18n } from '../constants.js';
import * as apiService from '../services/geminiService.js';
import * as historyService from '../services/historyService.js';
import * as settingsService from '../services/settingsService.js';
import { Spinner, SendIcon, AttachIcon, CloseIcon, SpeakerIcon, StopIcon, MicrophoneIcon, HistoryIcon } from './Shared.js';
import HistoryPanel from './HistoryPanel.js';

// --- Voice Visualizer Component ---
const VoiceVisualizer = ({ analyserNode, isVoiceSessionActive }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isVoiceSessionActive || !analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    let animationFrameId;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    }

    analyserNode.fftSize = 512;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      const barGradient = canvasCtx.createLinearGradient(0, 0, canvasWidth, 0);
      // Updated to Navy/Blue theme
      barGradient.addColorStop(0, '#0f172a'); // Slate 900 (Dark Navy)
      barGradient.addColorStop(0.4, '#1e3a8a'); // Blue 900
      barGradient.addColorStop(0.7, '#3b82f6'); // Blue 500
      barGradient.addColorStop(1, '#60a5fa'); // Blue 400

      canvasCtx.fillStyle = barGradient;

      const barSpacing = 1;
      const barWidth = (canvasWidth / bufferLength) - barSpacing;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255.0) * canvasHeight;
        const y = (canvasHeight - barHeight) / 2;
        
        if (barWidth > 0) {
            canvasCtx.fillRect(x, y, barWidth, barHeight);
        }
        
        x += barWidth + barSpacing;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVoiceSessionActive, analyserNode]);

  return React.createElement('canvas', { ref: canvasRef, className: "w-full h-full" });
};


// --- Audio Helper Functions ---

function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data, ctx, sampleRate, numChannels) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const SciGeniusChat = ({ language, currentUser }) => {
  const t = i18n[language];
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [history, setHistory] = useState([]);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(settingsService.getSettings().chatAvatarUrl);

  // Voice Chat State
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  
  const sessionPromiseRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const outputAudioContextRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioSourceNodeRef = useRef(null); // for mic input
  const analyserRef = useRef(null); // for visualization
  const playbackSourcesRef = useRef(new Set());
  const nextPlaybackStartTimeRef = useRef(0);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioSourceRef = useRef(null); // for TTS
  const SERVICE_ID = 'chat';
  
  const isGeminiConfigured = apiService.isModelConfigured('gemini');

  useEffect(() => {
    setChat(apiService.createChatSession());
    setMessages([{
        sender: 'model',
        text: t.homeDescription,
    }]);
    
    const handleSettingsChange = () => {
        setAvatarUrl(settingsService.getSettings().chatAvatarUrl);
    };
    window.addEventListener('settingsChanged', handleSettingsChange);

    return () => {
        window.removeEventListener('settingsChanged', handleSettingsChange);
        // Cleanup TTS audio
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        // Cleanup Live session
        if (isVoiceSessionActive) {
            stopVoiceSession();
        }
    };
  }, [t.homeDescription]);

  useEffect(() => {
    if (currentUser) {
      setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
    }
  }, [currentUser]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
    }
  };

  const handleSendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isLoading) return;
    
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        setSpeakingMessageIndex(null);
    }

    const firstMessage = messages.length === 1;
    const userMessage = { sender: 'user', text: messageText };
    if (file) {
        userMessage.file = file.name;
    }

    setMessages(prev => firstMessage ? [userMessage] : [...prev, userMessage]);
    setUserInput('');
    const currentFile = file;
    setFile(null); 
    setIsLoading(true);

    try {
      const result = await apiService.sendChatMessage(chat, messageText, currentFile, useWebSearch);

      if (result.isStream) {
        let responseText = '';
        setMessages(prev => [...prev, { sender: 'model', text: '' }]);
        for await (const chunk of result.stream) {
          responseText += chunk.text;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = responseText;
            return newMessages;
          });
        }
        if (currentUser) {
            const historyItem = { user: messageText, model: responseText, file: currentFile ? currentFile.name : null, sources: [] };
            historyService.addHistoryItem(currentUser.email, SERVICE_ID, historyItem);
            setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
        }
      } else {
        const modelMessage = { sender: 'model', text: result.text, sources: result.sources };
        setMessages(prev => [...prev, modelMessage]);
        if (currentUser) {
            const historyItem = { user: messageText, model: result.text, file: currentFile ? currentFile.name : null, sources: result.sources };
            historyService.addHistoryItem(currentUser.email, SERVICE_ID, historyItem);
            setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { sender: 'model', text: t.errorOccurred }]);
    } finally {
      setIsLoading(false);
    }
  }, [chat, file, useWebSearch, isLoading, t.errorOccurred, currentUser, messages.length]);

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
        
        const ttsAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(audioData, ttsAudioContext, 24000, 1);
        const source = ttsAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ttsAudioContext.destination);
        
        source.onended = () => {
            if (speakingMessageIndex === index) {
                setSpeakingMessageIndex(null);
            }
            audioSourceRef.current = null;
            ttsAudioContext.close();
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
  
  const startVoiceSession = async () => {
    if (!isGeminiConfigured) return;
    try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsVoiceSessionActive(true);

        inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        nextPlaybackStartTimeRef.current = 0;

        analyserRef.current = inputAudioContextRef.current.createAnalyser();
        
        const ai = new GoogleGenAI({ apiKey: window.process.env.VITE_API_KEY });
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    audioSourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                    scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    audioSourceNodeRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (message) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        const audioData = decode(base64Audio);
                        nextPlaybackStartTimeRef.current = Math.max(nextPlaybackStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(audioData, outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.addEventListener('ended', () => playbackSourcesRef.current.delete(source));
                        source.start(nextPlaybackStartTimeRef.current);
                        nextPlaybackStartTimeRef.current += audioBuffer.duration;
                        playbackSourcesRef.current.add(source);
                    }
                    
                    if (message.serverContent?.interrupted) {
                        for (const source of playbackSourcesRef.current.values()) {
                            source.stop();
                        }
                        playbackSourcesRef.current.clear();
                        nextPlaybackStartTimeRef.current = 0;
                    }

                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        setLiveTranscription(currentInputTranscriptionRef.current);
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.turnComplete) {
                        const userInputText = currentInputTranscriptionRef.current.trim();
                        const modelOutputText = currentOutputTranscriptionRef.current.trim();
                        if (userInputText || modelOutputText) {
                             if (messages.length === 1 && messages[0].text === t.homeDescription) {
                                setMessages([]); // Clear initial message
                                setTimeout(() => { // Use timeout to ensure state update before adding new messages
                                    setMessages([ 
                                        { sender: 'user', text: userInputText },
                                        { sender: 'model', text: modelOutputText }
                                    ]);
                                }, 0);
                            } else {
                                setMessages(prev => [...prev, 
                                    { sender: 'user', text: userInputText },
                                    { sender: 'model', text: modelOutputText }
                                ]);
                            }
                        }
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                        setLiveTranscription('');
                    }
                },
                onerror: (e) => console.error('Live session error:', e),
                onclose: () => console.log('Live session closed.'),
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: 'You are SciGenius, a helpful and friendly AI assistant.',
            },
        });

    } catch (error) {
        console.error("Failed to start voice session:", error);
        alert("Could not start voice session. Please ensure microphone access is granted.");
        setIsVoiceSessionActive(false);
    }
  };

  const stopVoiceSession = () => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (audioSourceNodeRef.current) {
        audioSourceNodeRef.current.disconnect();
        audioSourceNodeRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    playbackSourcesRef.current.clear();
    setIsVoiceSessionActive(false);
    setLiveTranscription('');
  };

  const handleHistoryItemClick = (item) => {
      setChat(apiService.createChatSession());
      const newMessages = [
        { sender: 'user', text: item.user, file: item.file },
        { sender: 'model', text: item.model, sources: item.sources }
      ];
      setMessages(newMessages);
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
        className: "p-3 bg-slate-200/50 dark:bg-card-gradient border border-slate-300/50 dark:border-white/10 rounded-lg cursor-pointer hover:bg-brand-blue/10 dark:hover:bg-brand-blue/30 transition-all duration-300 hover:border-brand-blue/30"
      },
        React.createElement('p', { className: "text-sm font-semibold text-slate-600 dark:text-brand-text-light truncate" }, item.user),
        React.createElement('p', { className: "text-xs text-slate-500 dark:text-brand-text-light mt-1 truncate" }, item.model)
    )
  );

  const userInitial = currentUser ? currentUser.fullName.charAt(0).toUpperCase() : 'U';

  return React.createElement('div', { className: "max-w-4xl mx-auto" },
    React.createElement('div', { className: "text-center mb-6" },
      React.createElement('h2', { className: "text-3xl font-extrabold text-slate-900 dark:text-brand-text" }, t.chatTitle),
      React.createElement('p', { className: "text-lg text-slate-500 dark:text-brand-text-light mt-2" }, t.chatDescription)
    ),
    React.createElement('div', { className: "relative" },
        currentUser && React.createElement('button', {
            onClick: () => setIsHistoryOpen(true),
            'aria-label': t.history,
            className: `absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} z-20 p-2 text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors`
        }, React.createElement(HistoryIcon, null)),

        React.createElement('div', {
            className: "flex flex-col bg-white dark:bg-card-gradient rounded-2xl shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)] border border-slate-200 dark:border-white/10 overflow-hidden hover:shadow-[0_0_50px_-10px_rgba(59,130,246,0.3)] hover:border-brand-blue/40 transition-all duration-500"
        },
            React.createElement('div', { ref: chatContainerRef, className: "flex-grow p-4 space-y-4 overflow-y-auto h-[calc(100vh-450px)] min-h-[300px]" },
                messages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
        
                    const avatarElement = React.createElement('div', { className: 'w-10 h-10 rounded-full flex-shrink-0' },
                        isUser ?
                        React.createElement('div', { className: 'w-full h-full rounded-full bg-brand-blue flex items-center justify-center' },
                            React.createElement('span', { className: 'text-white font-bold text-lg' }, userInitial)
                        ) :
                        React.createElement('img', { src: avatarUrl, alt: 'SciGenius Avatar', className: 'w-full h-full rounded-full object-cover' })
                    );
        
                    const bubbleElement = React.createElement('div', { className: `relative max-w-xl p-3 rounded-2xl shadow-md ${isUser ? 'bg-brand-blue text-white' : 'bg-slate-200 dark:bg-dark-bg text-slate-800 dark:text-brand-text'}` },
                        !isUser && msg.text && React.createElement('button', {
                            onClick: () => handleListen(msg.text, index),
                            className: `absolute top-2 ${language === 'ar' ? 'left-2' : 'right-2'} h-7 w-7 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20`
                        }, isAudioLoading === index
                            ? React.createElement(Spinner, { size: "4" })
                            : speakingMessageIndex === index
                            ? React.createElement(StopIcon, { className: "h-4 w-4" })
                            : React.createElement(SpeakerIcon, { className: "h-4 w-4" })
                        ),
                        msg.file && React.createElement('div', { className: "text-xs italic opacity-80 mb-1 border-b border-slate-300 dark:border-white/20 pb-1" }, `Attached: ${msg.file}`),
                        React.createElement('p', { className: `whitespace-pre-wrap ${!isUser ? (language === 'ar' ? 'pl-10' : 'pr-10') : ''}` }, msg.text),
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
                    );
        
                    return React.createElement('div', {
                        key: index,
                        className: `flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`
                    },
                        isUser ? [bubbleElement, avatarElement] : [avatarElement, bubbleElement]
                    );
                }),
                isLoading && (
                React.createElement('div', { className: "flex justify-start" },
                    React.createElement('div', { className: "flex items-start gap-3" },
                        React.createElement('div', { className: "w-10 h-10 rounded-full flex-shrink-0" },
                            React.createElement('img', { src: avatarUrl, alt: 'SciGenius Avatar', className: 'w-full h-full rounded-full object-cover' })
                        ),
                        React.createElement('div', { className: "bg-slate-200 dark:bg-dark-bg p-3 rounded-2xl flex items-center space-x-2" },
                            React.createElement(Spinner, { size: "5" }),
                            React.createElement('span', { className: "text-slate-500 dark:text-brand-text-light" }, t.thinking)
                        )
                    )
                )
                )
            )
        ),
        React.createElement('div', { className: "mt-4" },
            React.createElement('div', { className: 'bg-white dark:bg-dark-bg p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-white/10' },
                isVoiceSessionActive ? 
                React.createElement('div', { className: "flex items-center justify-between bg-slate-100 dark:bg-black/20 rounded-full p-2 h-14" },
                    React.createElement('div', { className: 'flex-grow flex items-center gap-4 px-2'},
                        React.createElement('div', { className: 'w-2/5 h-full' }, 
                            React.createElement(VoiceVisualizer, { analyserNode: analyserRef.current, isVoiceSessionActive: isVoiceSessionActive })
                        ),
                        React.createElement('div', { className: 'text-sm text-slate-600 dark:text-brand-text-light flex-grow truncate'},
                            liveTranscription ? React.createElement('span', { className: 'italic' }, liveTranscription) : "Listening..."
                        )
                    ),
                    React.createElement('button', {
                        onClick: stopVoiceSession,
                        className: "h-10 w-10 rounded-full flex items-center justify-center bg-brand-red hover:bg-red-500 text-white animate-pulse flex-shrink-0"
                    }, React.createElement(StopIcon, { className: "h-5 w-5" }))
                )
                :
                React.createElement(React.Fragment, null,
                    !isGeminiConfigured && React.createElement('div', { className: "text-center bg-red-500/10 p-2 rounded-md mb-2 text-xs text-brand-red font-semibold" },
                        t.apiKeyErrorForModel.replace('{modelName}', 'Google Gemini')
                    ),
                    React.createElement('div', { className: `relative flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}` },
                        React.createElement('button', {
                            onClick: startVoiceSession,
                            disabled: !isGeminiConfigured,
                            className: 'p-2 text-slate-500 dark:text-brand-text-light disabled:opacity-50 hover:text-brand-blue transition-colors'
                        }, React.createElement(MicrophoneIcon, null)),
                        React.createElement('input', {
                            type: "text", value: userInput, onChange: (e) => setUserInput(e.target.value),
                            onKeyDown: (e) => e.key === 'Enter' && handleSendMessage(userInput), placeholder: t.askPlaceholder,
                            className: "w-full bg-transparent p-2 text-slate-900 dark:text-white focus:outline-none placeholder-slate-500",
                            disabled: isLoading || !isGeminiConfigured
                        }),
                        React.createElement('button', {
                            onClick: () => handleSendMessage(userInput), disabled: !userInput.trim() || isLoading || !isGeminiConfigured,
                            className: `h-10 w-10 rounded-full flex items-center justify-center bg-slate-800 dark:bg-brand-blue hover:bg-slate-900 dark:hover:bg-blue-800 disabled:bg-slate-400 text-white transition-colors`
                        }, React.createElement(SendIcon, null))
                    ),
                    file && React.createElement('div', { className: "flex items-center justify-between bg-slate-100 dark:bg-black/20 text-sm py-1 px-3 rounded-md mt-2 mx-2" },
                        React.createElement('span', { className: "truncate" }, file.name),
                        React.createElement('button', { onClick: () => setFile(null) }, React.createElement(CloseIcon, { className: "h-4 w-4" }))
                    ),
                    React.createElement('div', { className: `flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-white/10 px-2 ${language === 'ar' ? 'flex-row-reverse' : ''}` },
                        React.createElement('button', { onClick: () => fileInputRef.current?.click(), className: "flex items-center gap-2 text-sm text-slate-500 dark:text-brand-text-light hover:text-slate-900 dark:hover:text-white transition-colors"},
                            React.createElement(AttachIcon, { className: "h-5 w-5" }), t.attachFile
                        ),
                        React.createElement('input', { type: "file", ref: fileInputRef, onChange: handleFileChange, className: "hidden" }),
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('label', { htmlFor: "web-search", className: 'text-sm text-slate-500 dark:text-brand-text-light cursor-pointer' }, t.searchWeb),
                            React.createElement('input', { type: "checkbox", id: "web-search", checked: useWebSearch, onChange: (e) => setUseWebSearch(e.target.checked),
                                className: "w-4 h-4 rounded text-brand-red bg-slate-200 dark:bg-brand-light-dark border-slate-300 dark:border-white/20 focus:ring-brand-red"
                            })
                        )
                    )
                )
            )
        )
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

export default SciGeniusChat;
