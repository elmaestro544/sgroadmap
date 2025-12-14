


import React, { useState, useRef, useEffect } from 'react';
import { i18n, DESIGN_STYLES } from '../constants.js';
import * as apiService from '../services/geminiService.js';
import * as historyService from '../services/historyService.js';
import { Spinner, DownloadIcon, UploadIcon, CopyIcon, HistoryIcon } from './Shared.js';
import HistoryPanel from './HistoryPanel.js';

const InteriorDesigner = ({ language, currentUser }) => {
  const t = i18n[language];
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [roomType, setRoomType] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [generatedOutput, setGeneratedOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const isCurrentModelConfigured = apiService.isModelConfigured('openai-image');
  const SERVICE_ID = 'design';

  useEffect(() => {
    if (currentUser) {
      setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
    }
  }, [currentUser]);
  
  const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  };

  const processFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      fileToBase64(file).then(setImagePreview);
      setGeneratedOutput(null); // Reset on new image upload
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
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
      processFile(droppedFile);
    }
  };
  
  const handleRedesign = async () => {
    const canProceed = imageFile && roomType && selectedStyle && isCurrentModelConfigured;
    if (!canProceed) return;
    
    setIsLoading(true);
    setGeneratedOutput(null);
    try {
        const result = await apiService.redesignImage(imageFile, roomType, selectedStyle.id);
        setGeneratedOutput(result);
        
        if (currentUser) {
            const historyItem = { 
                before: imagePreview,
                output: result, 
                roomType,
                styleId: selectedStyle.id,
            };
            historyService.addHistoryItem(currentUser.email, SERVICE_ID, historyItem);
            setHistory(historyService.getHistory(currentUser.email, SERVICE_ID));
        }
    } catch (error) {
        console.error("Error redesigning image:", error);
        alert(t.errorOccurred);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedOutput?.type === 'image' && generatedOutput.content) {
        const link = document.createElement('a');
        link.href = generatedOutput.content;
        link.download = `scigenius-design-${selectedStyle?.id.toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleCopyText = () => {
    if (generatedOutput?.type === 'text' && generatedOutput.content) {
      navigator.clipboard.writeText(generatedOutput.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleHistoryItemClick = (item) => {
      setImageFile(null); // Can't restore the file object
      setImagePreview(item.before);
      setGeneratedOutput(item.output);
      setRoomType(item.roomType);
      setSelectedStyle(DESIGN_STYLES.find(s => s.id === item.styleId));
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
        className: "p-2 bg-slate-200/50 dark:bg-card-gradient border border-slate-300/50 dark:border-white/10 rounded-lg cursor-pointer hover:bg-brand-blue/10 dark:hover:bg-brand-blue/30 hover:border-brand-blue/30 transition-all duration-300"
      },
        React.createElement('div', { className: "flex gap-2" },
            React.createElement('img', { src: item.before, className: "w-1/2 rounded-md aspect-square object-cover", alt: "Before" }),
            React.createElement('div', { className: "w-1/2 rounded-md aspect-square object-cover bg-slate-300 dark:bg-brand-dark" },
                item.output.type === 'image' ?
                    React.createElement('img', { src: item.output.content, className: "w-full h-full object-cover rounded-md", alt: "After" }) :
                    React.createElement('div', { className: "p-2 text-xs text-slate-700 dark:text-brand-text-light overflow-hidden h-full" }, item.output.content)
            )
        ),
        React.createElement('p', { className: "text-xs text-slate-500 dark:text-brand-text-light mt-1 text-center" }, 
            `${item.roomType} - ${item.styleId}`
        )
    )
  );

  return React.createElement('div', { className: "max-w-7xl mx-auto relative" },
    currentUser && React.createElement('button', {
        onClick: () => setIsHistoryOpen(true),
        'aria-label': t.history,
        className: `absolute top-0 ${language === 'ar' ? 'left-0' : 'right-0'} z-10 p-2 text-slate-500 dark:text-brand-text-light hover:bg-slate-200 dark:hover:bg-white/20 rounded-full transition-colors`
    },
      React.createElement(HistoryIcon, null)
    ),
    isLoading && (
      React.createElement('div', { className: "fixed inset-0 bg-white/90 dark:bg-black/90 z-[200] flex flex-col justify-center items-center backdrop-blur-sm" },
        React.createElement(Spinner, { size: "12" }),
        React.createElement('p', { className: "text-xl text-slate-800 dark:text-white mt-4" }, t.redesigning)
      )
    ),
    React.createElement('div', { className: "text-center mb-8" },
      React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.designTitle),
      React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.designDescription)
    ),
    React.createElement('div', null,
        React.createElement('div', null,
          React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-8" },
            React.createElement('div', { className: "space-y-3" },
                React.createElement('h3', { className: "text-xl font-semibold text-brand-red" }, t.step1),
                React.createElement('div', {
                    onClick: () => fileInputRef.current?.click(),
                    onDragOver: (e) => handleDragEvents(e, true),
                    onDragLeave: (e) => handleDragEvents(e, false),
                    onDrop: handleDrop,
                    className: `aspect-square rounded-xl flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 cursor-pointer ${isDragOver ? 'border-brand-blue bg-slate-200 dark:bg-card-gradient' : 'bg-white dark:bg-card-gradient border-slate-300 dark:border-white/20 hover:border-brand-blue/50 hover:shadow-lg'}`
                },
                    imagePreview ? React.createElement('img', { src: imagePreview, alt: "Room preview", className: "object-contain h-full w-full rounded-lg" })
                                : React.createElement(React.Fragment, null, React.createElement(UploadIcon, null), React.createElement('span', { className: "mt-4 text-slate-500 dark:text-brand-text-light text-center" }, t.uploadArea))
                ),
                React.createElement('input', { type: "file", ref: fileInputRef, onChange: handleImageChange, className: "hidden", accept: "image/*" })
            ),
            React.createElement('div', { className: "space-y-3" },
                React.createElement('h3', { className: "text-xl font-semibold text-brand-red" }, t.step2),
                React.createElement('select', {
                value: roomType,
                onChange: (e) => setRoomType(e.target.value),
                className: "w-full p-3 bg-white dark:bg-input-gradient border border-slate-300 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none"
                },
                React.createElement('option', { value: "" }, t.selectRoomType),
                Object.entries(t.roomTypes).map(([key, value]) => React.createElement('option', { key: key, value: value }, value))
                )
            ),
            React.createElement('div', { className: "space-y-3" },
                React.createElement('h3', { className: "text-xl font-semibold text-brand-red" }, t.step3),
                React.createElement('div', { className: "grid grid-cols-2 gap-2" },
                DESIGN_STYLES.map(style => (
                    React.createElement('div', {
                    key: style.id,
                    onClick: () => setSelectedStyle(style),
                    className: `relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${selectedStyle?.id === style.id ? 'ring-4 ring-brand-red scale-105 shadow-lg' : 'ring-2 ring-transparent hover:scale-105'}`
                    },
                    React.createElement('img', { src: style.imageUrl, alt: style.name(language), className: "w-full h-full object-cover" }),
                    React.createElement('div', { className: "absolute inset-0 bg-black/50 flex items-end p-2" },
                        React.createElement('p', { className: "text-white text-xs font-bold" }, style.name(language))
                    )
                    )
                ))
                )
            )
          ),
          !isCurrentModelConfigured && React.createElement('div', { className: "mt-8 text-center bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-sm text-brand-red font-semibold" },
            t.apiKeyErrorForModel.replace('{modelName}', 'OpenAI')
          ),
          React.createElement('div', { className: "text-center mt-8" },
            React.createElement('button', {
              onClick: handleRedesign,
              disabled: !imageFile || !roomType || !selectedStyle || isLoading || !isCurrentModelConfigured,
              className: "bg-brand-red hover:bg-red-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full text-lg transition-colors shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50"
            }, t.redesign)
          ),
          generatedOutput && (
            React.createElement('div', { className: "mt-12" },
              React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch" },
                React.createElement('div', { className: "text-center" },
                  React.createElement('h3', { className: "text-2xl font-semibold mb-2 text-slate-900 dark:text-brand-text" }, t.before),
                  imagePreview && React.createElement('img', { src: imagePreview, alt: "Original room", className: "rounded-lg w-full shadow-md" })
                ),
                React.createElement('div', { className: "text-center flex flex-col" },
                  React.createElement('h3', { className: "text-2xl font-semibold mb-2 text-slate-900 dark:text-brand-text" }, generatedOutput.type === 'image' ? t.after : t.aiDescription),
                  generatedOutput.type === 'image' ? (
                      React.createElement('div', { className: "relative" },
                          React.createElement('img', { src: generatedOutput.content, alt: "Redesigned room", className: "rounded-lg w-full shadow-md" }),
                          React.createElement('button', {
                              onClick: handleDownload,
                              className: `absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} flex items-center bg-brand-red hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-full transition-colors shadow-lg`
                          }, React.createElement(DownloadIcon, null), ` ${t.download}`)
                      )
                  ) : (
                      React.createElement('div', { className: "relative flex-grow h-full" },
                          React.createElement('div', { className: "h-full min-h-[400px] max-h-[512px] overflow-y-auto p-4 bg-light-input-gradient dark:bg-input-gradient rounded-lg text-left whitespace-pre-wrap shadow-inner" },
                              generatedOutput.content
                          ),
                          React.createElement('button', {
                              onClick: handleCopyText,
                              className: `absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} flex items-center bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs text-slate-700 dark:text-white py-1 px-3 rounded-full transition-colors`
                          }, React.createElement(CopyIcon, { className: "h-4 w-4 mr-1.5" }), copied ? t.copied : t.copy)
                      )
                  )
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

export default InteriorDesigner;
