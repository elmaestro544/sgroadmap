import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language } from '../types';
import { i18n } from '../constants';
import * as geminiService from '../services/geminiService';
import { Spinner, UploadIcon, SendIcon } from './Shared';

// PaperCard Component defined within ResearchCopilot
const PaperCard = ({ paper, language }) => (
  <div className="bg-brand-light-dark p-4 rounded-xl border border-white/10 transition-all duration-300 hover:border-brand-blue/50 hover:shadow-glow-blue">
    <a href={paper.link} target="_blank" rel="noopener noreferrer" className="text-brand-blue font-bold text-lg hover:underline">{paper.title}</a>
    <p className="text-sm text-brand-text-light mt-1">{paper.authors.join(', ')} ({paper.year})</p>
    <p className="text-base text-brand-text mt-2">{paper.summary}</p>
  </div>
);

const ResearchCopilot = ({ language }) => {
  const t = i18n[language];
  const [file, setFile] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
      setChat(geminiService.createChatSession());
      setMessages([]);
      setFile(null);
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
    
    const isFirstMessageWithFile = file && messages.length === 0;
    const userMessage = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
        if (messageText === t.suggestion3) {
            const topic = file ? `related to the document "${file.name}"` : 'the latest advancements in AI';
            const { papers, sources } = await geminiService.findRelatedPapers(topic);
            const modelMessage = { sender: 'model', text: t.relatedPapers, papers, sources };
            setMessages(prev => [...prev, modelMessage]);
        } else if (chat) {
            const stream = await geminiService.sendMessageStream(chat, messageText, isFirstMessageWithFile ? file : undefined);
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

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-brand-text">{t.researchTitle}</h2>
        <p className="text-brand-text-light mt-2">{t.researchDescription}</p>
      </div>
      
      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => handleDragEvents(e, true)}
          onDragLeave={(e) => handleDragEvents(e, false)}
          onDrop={handleDrop}
          className={`flex-grow flex flex-col justify-center items-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isDragOver ? 'border-brand-blue bg-brand-light-dark' : 'bg-brand-light-dark/50 border-white/20 hover:border-white/40'}`}
        >
          <UploadIcon />
          <p className="mt-4 text-lg text-brand-text-light">{t.uploadArea}</p>
          <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.txt,.md,image/*" />
        </div>
      )}

      {file && (
        <div className="flex flex-col flex-grow bg-brand-light-dark/50 rounded-2xl overflow-hidden border border-white/10">
          <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
            {messages.length === 0 && !isUploading && (
                <div className="text-center p-4 bg-black/20 rounded-lg">
                    <p className="text-brand-text"><strong>{file.name}</strong> {t.fileReady}</p>
                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 ${language === Language.AR ? 'sm:grid-flow-col-dense' : ''}`}>
                        {[t.suggestion1, t.suggestion2, t.suggestion3].map(suggestion => (
                            <button key={suggestion} onClick={() => handleSendMessage(suggestion)} className="bg-white/5 hover:bg-white/10 text-brand-text py-2 px-3 rounded-full text-sm transition-colors">
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? (language === Language.AR ? 'justify-start' : 'justify-end') : (language === Language.AR ? 'justify-end' : 'justify-start')}`}>
                    <div className={`max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-brand-blue text-white' : 'bg-brand-light-dark text-brand-text'}`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.papers && (
                            <div className="grid grid-cols-1 gap-3 mt-4">
                                {msg.papers.map((paper, i) => <PaperCard key={i} paper={paper} language={language} />)}
                            </div>
                        )}
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-white/20">
                                <h4 className="font-semibold text-sm mb-1">{t.sources}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {msg.sources.map((source, i) => (
                                        <a key={i} href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-white/10 hover:bg-white/20 py-1 px-2 rounded-full transition-colors truncate">
                                            {source.web?.title || new URL(source.web?.uri || '').hostname}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="bg-brand-light-dark p-3 rounded-2xl flex items-center space-x-2">
                      <Spinner size="5" />
                      <span className="text-brand-text-light">{t.thinking}</span>
                  </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/10">
            <div className={`relative flex items-center ${language === Language.AR ? 'flex-row-reverse' : ''}`}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(userInput)}
                placeholder={t.askPlaceholder}
                className="w-full bg-black/30 border border-white/20 rounded-full py-2.5 focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all"
                style={language === Language.AR ? { paddingRight: '1rem', paddingLeft: '3.5rem' } : { paddingLeft: '1rem', paddingRight: '3.5rem' }}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage(userInput)}
                disabled={!userInput.trim() || isLoading}
                className={`absolute h-8 w-8 rounded-full flex items-center justify-center bg-brand-blue hover:brightness-125 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all ${language === Language.AR ? 'left-2' : 'right-2'}`}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchCopilot;