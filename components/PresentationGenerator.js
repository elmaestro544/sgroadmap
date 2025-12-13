
import React, { useState, useRef, useEffect } from 'react';
import { i18n, PRESENTATION_THEMES, PRESENTATION_TEXT_AMOUNTS, PRESENTATION_LANGUAGES } from '../constants.js';
import { 
    Spinner, UploadIcon, PencilIcon, ClipboardTextIcon, FileImportIcon, DownloadIcon, PresentationIcon, SpeakerIcon, StopIcon,
    ParagraphIcon, TableCellsIcon, SparklesIcon, RectangleStackIcon, CheckCircleIcon, QuestionMarkCircleIcon, ListIcon, PromptGeneratorIcon, DataAnalysisIcon
} from './Shared.js';
import * as apiService from '../services/geminiService.js';

// --- Audio Helper functions ---
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


// --- Extracted Components ---

const StepCard = ({ title, children, isEnabled }) => {
    return React.createElement('div', { 
        className: `bg-white dark:bg-black border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white transition-opacity ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}` 
    },
        React.createElement('div', {
            className: `w-full flex items-center p-4 text-left font-semibold text-brand-red rounded-t-lg bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:to-black border-b border-slate-200 dark:border-slate-700`
        },
            title
        ),
        React.createElement('div', { className: "p-4" }, children)
    );
};

const AmountSelector = ({ onSelect, selected, t }) => {
    const lineStyles = {
        minimal: ['w-1/2', 'w-1/3'],
        concise: ['w-full', 'w-3/4', 'w-1/2'],
        detailed: ['w-full', 'w-5/6', 'w-full', 'w-3/4'],
        extensive: ['w-full', 'w-5/6', 'w-full', 'w-3/4', 'w-full', 'w-2/3'],
    };

    return React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-center' },
        PRESENTATION_TEXT_AMOUNTS.map(option => (
            React.createElement('button', {
                key: option.id,
                onClick: () => onSelect(option.id),
                className: `p-3 rounded-lg border-2 transition-colors ${selected === option.id ? 'border-brand-red bg-brand-red/10' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600'}`
            },
                React.createElement('div', { className: 'h-12 space-y-1.5 flex flex-col justify-center items-center' },
                    lineStyles[option.id].map((widthClass, i) => React.createElement('div', { key: i, className: `h-1.5 rounded-full ${widthClass} ${selected === option.id ? 'bg-brand-red' : 'bg-slate-300 dark:bg-slate-500'}` }))
                ),
                React.createElement('span', { className: `block text-sm font-semibold mt-2 ${selected === option.id ? 'text-brand-red' : 'text-slate-600 dark:text-slate-300'}` }, t[option.nameKey])
            )
        ))
    );
};

const OutlinePreview = ({ outline, t, selectedTheme, presentationLanguage }) => {
    if (outline.error) return React.createElement('p', { className: 'text-brand-red' }, outline.error);
    
    const SlideTypeIcons = {
        'title_slide': SparklesIcon,
        'introduction': PresentationIcon,
        'agenda': ListIcon,
        'table_of_contents': ListIcon,
        'section_header': RectangleStackIcon,
        'content': PresentationIcon,
        'summary': CheckCircleIcon,
        'q_and_a': QuestionMarkCircleIcon,
        'conclusion': CheckCircleIcon,
        'default': PresentationIcon
    };

    return React.createElement('div', { className: "space-y-4" },
        React.createElement('h3', { className: 'text-xl font-bold text-center mb-4', style: { color: selectedTheme.colors.title, fontFamily: selectedTheme.fonts.title } }, 'Presentation Outline'),
        outline.slides?.map(slide => {
            const Icon = SlideTypeIcons[slide.type] || SlideTypeIcons.default;
            return React.createElement('div', { key: slide.slideNumber, style: { backgroundColor: selectedTheme.colors.cardBg, borderColor: selectedTheme.colors.accent + '30' }, className: "slide-outline-card p-4 rounded-lg border", dir: presentationLanguage === 'ar' ? 'rtl' : 'ltr' },
                React.createElement('div', {className: `flex items-center gap-3 mb-2 ${presentationLanguage === 'ar' ? 'flex-row-reverse' : ''}`},
                    React.createElement('div', {className: 'w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0', style: {backgroundColor: selectedTheme.colors.accent + '20', color: selectedTheme.colors.accent}}, React.createElement(Icon, {className: 'w-5 h-5'})),
                    React.createElement('h4', { className: `font-bold text-lg flex-grow ${presentationLanguage === 'ar' ? 'text-right' : ''}`, style: { color: selectedTheme.colors.title, fontFamily: selectedTheme.fonts.title } }, `Slide ${slide.slideNumber}: ${slide.title}`),
                ),
                React.createElement('ul', { className: `space-y-1 ${presentationLanguage === 'ar' ? 'pr-11' : 'pl-11'}` },
                    slide.content.map((point, i) => React.createElement('li', { key: i, className: `text-sm flex items-start ${presentationLanguage === 'ar' ? 'flex-row-reverse text-right' : ''}`, style: {color: selectedTheme.colors.body} }, 
                        React.createElement('span', { className: `mt-1 ${presentationLanguage === 'ar' ? 'ml-2' : 'mr-2'}`, style: {color: selectedTheme.colors.accent}}, '•'),
                        React.createElement('span', null, point)
                    ))
                )
            )
        })
    );
};

const GenerationProgressView = ({ total, progress, t, selectedTheme }) => {
    return React.createElement('div', { className: "flex flex-col h-full items-center justify-center text-center p-4" },
        React.createElement('h3', { className: "text-xl font-bold mb-4", style: { color: selectedTheme.colors.title } },
            t.generatingFullPresentation
        ),
        React.createElement('p', { className: "text-slate-500 dark:text-slate-400 mb-8", style: { color: selectedTheme.colors.body } },
            `Creating slide ${progress} of ${total}...`
        ),
        React.createElement('div', { className: "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 w-full max-w-2xl" },
            Array.from({ length: total }).map((_, index) => (
                React.createElement('div', {
                    key: index,
                    className: `aspect-[4/3] rounded-md transition-all duration-300 animate-slide-in-up`,
                    style: { animationDelay: `${index * 50}ms` }
                },
                    index < progress ? (
                        React.createElement('div', { className: "w-full h-full bg-green-500/20 border-2 border-green-500 rounded-lg flex items-center justify-center" },
                            React.createElement(CheckCircleIcon, { className: "w-1/2 h-1/2 text-green-400" })
                        )
                    ) : (
                        React.createElement('div', { className: "w-full h-full rounded-lg", style: { backgroundColor: selectedTheme.colors.cardBg, border: `1px solid ${selectedTheme.colors.accent}40` } })
                    )
                )
            ))
        )
    );
};


const FinalPresentationPreview = ({ presentation, onListen, speakingSlideIndex, audioLoadingSlideIndex, t, selectedTheme, presentationLanguage }) => {
    if (presentation.error) return React.createElement('p', { className: 'text-brand-red' }, presentation.error);
    
    const ContentBlockIcons = {
        'paragraph': ParagraphIcon,
        'bullet': ListIcon,
        'table': TableCellsIcon,
        'visual_suggestion': PromptGeneratorIcon,
        'infographic_point': DataAnalysisIcon,
    };

    const renderContentBlock = (block, index) => {
        const Icon = ContentBlockIcons[block.type];
        const iconEl = Icon && React.createElement('div', { className: 'mt-1.5 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg', style: { color: 'var(--slide-accent-color)', backgroundColor: 'var(--slide-accent-color)' + '15' } }, React.createElement(Icon, {className: 'w-5 h-5'}));
        const baseWrapper = (children) => React.createElement('div', { key: index, className: `flex items-start gap-4 my-3 ${presentationLanguage === 'ar' ? 'flex-row-reverse' : ''}` }, iconEl, React.createElement('div', { className: 'flex-grow', style: { color: 'var(--slide-body-color)' } }, children));

        switch (block.type) {
            case 'paragraph':
                return baseWrapper(React.createElement('p', { className: "text-lg leading-relaxed" }, block.text));
            case 'bullet':
                return baseWrapper(React.createElement('p', { className: 'text-lg leading-relaxed' }, block.text));
            case 'table':
                return React.createElement('div', { key: index, className: "my-6" },
                    React.createElement('table', { className: "w-full text-base border-collapse" },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                block.headers.map((header, hIndex) => React.createElement('th', { key: hIndex, className: `p-3 border ${presentationLanguage === 'ar' ? 'text-right' : 'text-left'}`, style: { backgroundColor: 'var(--slide-accent-color)', color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.3)', borderColor: selectedTheme.colors.accent + '50', fontFamily: 'var(--slide-title-font)' } }, header))
                            )
                        ),
                        React.createElement('tbody', null,
                            block.rows.map((row, rIndex) => React.createElement('tr', { key: rIndex, style: { backgroundColor: 'var(--slide-card-bg)' } },
                                row.map((cell, cIndex) => React.createElement('td', { key: cIndex, className: `p-3 border ${presentationLanguage === 'ar' ? 'text-right' : 'text-left'}`, style: { borderColor: selectedTheme.colors.accent + '50', color: 'var(--slide-body-color)' } }, cell))
                            ))
                        )
                    )
                );
            case 'visual_suggestion':
                const isChartSuggestion = /chart|graph|diagram/i.test(block.description);
                const SuggestionIcon = isChartSuggestion ? DataAnalysisIcon : PromptGeneratorIcon;
                return React.createElement('div', { key: index, className: `my-4 p-4 flex items-center gap-4 rounded-lg text-base ${presentationLanguage === 'ar' ? 'flex-row-reverse' : ''}`, style: { backgroundColor: 'var(--slide-card-bg)', color: 'var(--slide-body-color)', borderRight: presentationLanguage === 'ar' ? `4px solid var(--slide-accent-color)` : 'none', borderLeft: presentationLanguage !== 'ar' ? `4px solid var(--slide-accent-color)` : 'none' } },
                    React.createElement(SuggestionIcon, { className: 'w-6 h-6 flex-shrink-0', style: { color: 'var(--slide-accent-color)' } }),
                    React.createElement('p', { className: 'flex-grow italic' }, React.createElement('strong', { className: 'not-italic' }, "Visual Idea: "), block.description)
                );
            case 'infographic_point':
                return React.createElement('div', { key: index, className: "my-6 p-5 rounded-lg", style: { backgroundColor: 'var(--slide-card-bg)', border: `1px solid ${selectedTheme.colors.accent}40` } },
                    React.createElement('div', { className: `flex items-center gap-5 ${presentationLanguage === 'ar' ? 'flex-row-reverse' : ''}` },
                        React.createElement(DataAnalysisIcon, { className: 'w-10 h-10 flex-shrink-0', style: { color: 'var(--slide-accent-color)' } }),
                        React.createElement('div', null,
                            React.createElement('p', { className: "text-5xl font-bold", style: { color: 'var(--slide-accent-color)', fontFamily: 'var(--slide-title-font)' } }, block.value),
                            React.createElement('p', { className: "text-sm uppercase font-semibold tracking-wider", style: { color: 'var(--slide-body-color)', opacity: 0.8 } }, block.title)
                        )
                    ),
                    React.createElement('p', { className: `text-base mt-3 ${presentationLanguage === 'ar' ? 'pr-[60px]' : 'pl-[60px]'}`, style: { color: 'var(--slide-body-color)' } }, block.description)
                );
            default:
                 const text = block.text || (typeof block === 'string' ? block : JSON.stringify(block));
                 return baseWrapper(React.createElement('p', { className: 'text-lg leading-relaxed' }, text));
        }
    };
    
    return React.createElement('div', { className: "space-y-4" },
        presentation.slides?.map(slide => {
            const isTitleSlide = slide.type === 'title_slide';
            const slideStyle = {
                '--slide-bg': selectedTheme.colors.slideBg,
                '--slide-card-bg': selectedTheme.colors.cardBg,
                '--slide-title-color': selectedTheme.colors.title,
                '--slide-body-color': selectedTheme.colors.body,
                '--slide-accent-color': selectedTheme.colors.accent,
                '--slide-title-font': selectedTheme.fonts.title,
                '--slide-body-font': selectedTheme.fonts.body,
                background: 'var(--slide-bg)',
                color: 'var(--slide-body-color)',
                fontFamily: 'var(--slide-body-font)'
            };

            const textBlocks = Array.isArray(slide.content)
                ? slide.content.filter(block => block && (typeof block === 'string' || typeof block.text === 'string'))
                : [];

            if (isTitleSlide) {
                const subtitleText = textBlocks.length > 0
                    ? (typeof textBlocks[0] === 'string' ? textBlocks[0] : textBlocks[0].text)
                    : null;
                
                const detailsTexts = textBlocks.length > 1
                    ? textBlocks.slice(1).map(block => typeof block === 'string' ? block : block.text)
                    : [];

                return React.createElement('div', { 
                    key: slide.slideNumber, 
                    style: slideStyle,
                    dir: presentationLanguage === 'ar' ? 'rtl' : 'ltr',
                    className: "relative slide-preview-item p-8 rounded-lg shadow-lg min-h-[500px] flex flex-col text-center" 
                },
                    React.createElement('div', { className: 'flex-grow flex flex-col justify-center items-center' },
                        React.createElement('h3', { className: 'text-5xl lg:text-6xl font-bold mb-4 leading-tight', style: { color: 'var(--slide-title-color)', fontFamily: 'var(--slide-title-font)' } }, slide.title),
                        subtitleText && React.createElement('p', { className: 'text-2xl mt-2', style: { fontFamily: 'var(--slide-body-font)' } }, subtitleText)
                    ),
                    detailsTexts.length > 0 && React.createElement('div', { className: 'flex-shrink-0 pb-4' },
                        detailsTexts.map((detailText, index) =>
                            React.createElement('p', { key: index, className: 'text-lg', style: { fontFamily: 'var(--slide-body-font)', opacity: 0.8 } }, detailText)
                        )
                    ),
                     React.createElement('div', {className: `absolute bottom-4 ${presentationLanguage === 'ar' ? 'left-4' : 'right-4'} text-xs`, style: {color: 'var(--slide-body-color)', opacity: 0.5}}, slide.slideNumber)
                );
            }

            // Regular slide rendering
            return React.createElement('div', { key: slide.slideNumber, style: slideStyle, className: `relative slide-preview-item p-8 rounded-lg shadow-lg min-h-[500px] flex flex-col ${presentationLanguage === 'ar' ? 'text-right' : ''}`, dir: presentationLanguage === 'ar' ? 'rtl' : 'ltr' },
                slide.speakerNotes && React.createElement('button', {
                    onClick: () => onListen(slide.speakerNotes, slide.slideNumber),
                    disabled: audioLoadingSlideIndex !== null,
                    title: t.presentationListenNotes,
                    className: `absolute top-4 ${presentationLanguage === 'ar' ? 'left-4' : 'right-4'} h-9 w-9 flex items-center justify-center rounded-full disabled:opacity-50 z-10`,
                    style: { backgroundColor: 'var(--slide-card-bg)', color: 'var(--slide-body-color)' }
                },
                    audioLoadingSlideIndex === slide.slideNumber ? React.createElement(Spinner, { size: '5' }) :
                    speakingSlideIndex === slide.slideNumber ? React.createElement(StopIcon, null) :
                    React.createElement(SpeakerIcon, null)
                ),
                React.createElement('h3', { className: `text-3xl lg:text-4xl font-bold mb-8`, style: { color: 'var(--slide-title-color)', fontFamily: 'var(--slide-title-font)' } }, slide.title),
                React.createElement('div', { className: "space-y-4 flex-grow" },
                    Array.isArray(slide.content) ?
                        slide.content.map((block, index) => renderContentBlock(block, index))
                    : (typeof slide.content === 'string' ? React.createElement('p', null, slide.content) : null)
                ),
                React.createElement('div', {className: `absolute bottom-4 ${presentationLanguage === 'ar' ? 'left-4' : 'right-4'} text-xs`, style: {color: 'var(--slide-body-color)', opacity: 0.5}}, slide.slideNumber)
            );
        })
    );
};

const PreviewPanel = React.forwardRef(({ 
    workflowState,
    visualizationProgress,
    generatedOutline,
    finalPresentation,
    t,
    onListen,
    speakingSlideIndex,
    audioLoadingSlideIndex,
    selectedTheme,
    presentationLanguage,
    appTheme
}, ref) => {

    const renderContent = () => {
        if (workflowState === 'visualizing' && generatedOutline) {
            return React.createElement(GenerationProgressView, { total: generatedOutline.slides.length, progress: visualizationProgress, t: t, selectedTheme: selectedTheme });
        }
        if (workflowState === 'ready' && finalPresentation) {
            return React.createElement(FinalPresentationPreview, { 
                presentation: finalPresentation, 
                onListen: onListen,
                speakingSlideIndex: speakingSlideIndex,
                audioLoadingSlideIndex: audioLoadingSlideIndex,
                t: t,
                selectedTheme: selectedTheme,
                presentationLanguage: presentationLanguage,
            });
        }
        if (generatedOutline && (workflowState === 'outline_ready' || workflowState === 'loading_full')) {
            return React.createElement(OutlinePreview, { outline: generatedOutline, t: t, selectedTheme: selectedTheme, presentationLanguage: presentationLanguage });
        }
        return React.createElement('div', { className: "flex flex-col h-full items-center justify-center text-center", style: { color: selectedTheme.colors.body } }, 
            React.createElement(PresentationIcon, {}),
            React.createElement('p', { className: "mt-2 font-semibold" }, t.preview),
            React.createElement('p', { className: "text-sm" }, t.previewPlaceholder)
        );
    };

    return React.createElement('div', { 
        ref: ref, 
        id: 'presentation-preview', 
        style: { backgroundColor: appTheme === 'light' ? '#ffffff' : selectedTheme.colors.previewBg }, 
        className: "h-full rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto" 
    },
        renderContent()
    );
});


// --- Main Component ---

const PresentationGenerator = ({ language, theme: appTheme }) => {
    const t = i18n[language];
    
    // State for workflow & data
    const [workflowState, setWorkflowState] = useState('idle'); // idle, loading_outline, outline_ready, loading_full, visualizing, ready
    const [presentationLanguage, setPresentationLanguage] = useState('en');
    const [creationMethod, setCreationMethod] = useState(null);
    const [userInput, setUserInput] = useState({ prompt: '', text: '', file: null });
    const [slideCount, setSlideCount] = useState(10);
    const [textContentAmount, setTextContentAmount] = useState('concise');
    const [generatedOutline, setGeneratedOutline] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState(PRESENTATION_THEMES[0]);
    const [finalPresentation, setFinalPresentation] = useState(null);
    const [visualizationProgress, setVisualizationProgress] = useState(0);
    
    // UI State
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    // Audio State
    const [speakingSlideIndex, setSpeakingSlideIndex] = useState(null);
    const [audioLoadingSlideIndex, setAudioLoadingSlideIndex] = useState(null);
    
    const fileInputRef = useRef(null);
    const previewRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioSourceRef = useRef(null);
    
    const showLoadingOverlay = workflowState === 'loading_outline' || workflowState === 'loading_full';

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

    useEffect(() => {
        if (workflowState === 'visualizing') {
            const totalSlides = generatedOutline.slides.length;
            const interval = setInterval(() => {
                setVisualizationProgress(prev => {
                    const next = prev + 1;
                    if (next >= totalSlides) {
                        clearInterval(interval);
                        setWorkflowState('ready');
                        return totalSlides;
                    }
                    return next;
                });
            }, 150);

            return () => clearInterval(interval);
        }
    }, [workflowState, generatedOutline]);


    // --- Core Logic ---

    const processFile = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) return resolve('');
            const reader = new FileReader();
            reader.onerror = reject;
            if (file.type === 'application/pdf') {
                reader.onload = async (e) => {
                    try {
                        const typedarray = new Uint8Array(e.target.result);
                        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
                        let text = '';
                        for (let i = 0; i < pdf.numPages; i++) {
                            const page = await pdf.getPage(i + 1);
                            const content = await page.getTextContent();
                            text += content.items.map(item => item.str).join(' ');
                        }
                        resolve(text);
                    } catch (error) { reject(error); }
                };
                reader.readAsArrayBuffer(file);
            } else { // txt, md
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsText(file);
            }
        });
    };

    const handleGenerateOutline = async () => {
        let content = '';
        if (creationMethod === 'prompt') content = userInput.prompt;
        else if (creationMethod === 'text') content = userInput.text;
        else if (creationMethod === 'import' && userInput.file) {
             setWorkflowState('loading_outline');
             setLoadingMessage(t.extractingText);
             try { content = await processFile(userInput.file); } catch (error) {
                 console.error("File processing error:", error);
                 alert(t.errorOccurred);
                 setWorkflowState('idle');
                 return;
             }
        }
        if (!content.trim()) return;

        setWorkflowState('loading_outline');
        setLoadingMessage(t.generatingOutline);
        setFinalPresentation(null); // Clear previous final presentation
        try {
            const resultJson = await apiService.generatePresentationOutline({ 
                method: creationMethod, 
                content, 
                slideCount, 
                language: presentationLanguage,
                amount: textContentAmount
            });
            setGeneratedOutline(JSON.parse(resultJson));
            setWorkflowState('outline_ready');
        } catch (error) {
            console.error("Outline generation error:", error);
            setGeneratedOutline({ error: t.errorOccurred });
            setWorkflowState('outline_ready'); // Show error in preview
        }
    };

    const handleGenerateFullPresentation = async () => {
        if (!generatedOutline || generatedOutline.error) return;
        setWorkflowState('loading_full');
        setLoadingMessage(t.generatingFullPresentation);
        try {
            const resultJson = await apiService.generateFullPresentationContent(
                JSON.stringify(generatedOutline),
                presentationLanguage,
                textContentAmount
            );
            setFinalPresentation(JSON.parse(resultJson));
            setVisualizationProgress(0);
            setWorkflowState('visualizing');
        } catch (error) {
            console.error("Full presentation generation error:", error);
            setFinalPresentation({ error: t.errorOccurred });
            setWorkflowState('ready'); // Show error
        }
    };
    
    const handleDownloadPdf = async () => {
        const previewElement = previewRef.current;
        if (!previewElement || !(finalPresentation || generatedOutline)) return;

        setWorkflowState('loading_full'); // Re-use loading state for downloads
        setLoadingMessage(t.generatingPDF);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
    
        const slideElements = previewElement.querySelectorAll('.slide-preview-item');
    
        for (let i = 0; i < slideElements.length; i++) {
            const slideElement = slideElements[i];
            const originalBackgroundColor = slideElement.style.background;
            slideElement.style.background = selectedTheme.colors.slideBg;

            const canvas = await html2canvas(slideElement, { scale: 2, useCORS: true, allowTaint: true });
            
            slideElement.style.background = originalBackgroundColor;

            const imgData = canvas.toDataURL('image/png');
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
    
        pdf.save('SciGenius-Presentation.pdf');
        setWorkflowState('ready');
    };

    const handleDownloadMarkdown = () => {
        const content = finalPresentation || generatedOutline;
        if (!content?.slides) return;

        let mdContent = `# ${userInput.prompt || userInput.file?.name || 'Presentation'}\n\n`;
        content.slides.forEach(slide => {
            mdContent += `---\n\n## Slide ${slide.slideNumber}: ${slide.title}\n\n`;
            if (Array.isArray(slide.content)) {
                 slide.content.forEach(block => {
                    if (typeof block === 'string') { // Fallback for old outline format
                        mdContent += `* ${block}\n`;
                        return;
                    }
                    switch (block.type) {
                        case 'paragraph':
                            mdContent += `${block.text}\n\n`;
                            break;
                        case 'bullet':
                            mdContent += `* ${block.text}\n`;
                            break;
                        case 'table':
                            mdContent += `| ${block.headers.join(' | ')} |\n`;
                            mdContent += `| ${block.headers.map(() => '---').join(' | ')} |\n`;
                            block.rows.forEach(row => {
                                mdContent += `| ${row.join(' | ')} |\n`;
                            });
                            mdContent += '\n';
                            break;
                        case 'visual_suggestion':
                            mdContent += `> **Visual Idea:** ${block.description}\n\n`;
                            break;
                        case 'infographic_point':
                            mdContent += `**${block.title}**: **${block.value}** - ${block.description}\n\n`;
                            break;
                        default:
                            mdContent += `* ${block.text || JSON.stringify(block)}\n`;
                    }
                });
            }
            if(slide.speakerNotes) {
                mdContent += `\n**Speaker Notes:**\n> ${slide.speakerNotes.replace(/\n/g, '\n> ')}\n`;
            }
            mdContent += `\n`;
        });
        
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'presentation.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPptx = async () => {
        if (!finalPresentation?.slides || !window.PptxGenJS) return;
    
        setWorkflowState('loading_full');
        setLoadingMessage(t.generatingPPTX);
        
        try {
            const pptx = new window.PptxGenJS();
            pptx.author = 'SciGenius';
            pptx.company = 'AI Roadmap Co.';
            pptx.title = finalPresentation.slides[0]?.title || 'SciGenius Presentation';
            
            const styles = {
                titleFont: { fontFace: selectedTheme.fonts.title.split(',')[0].replace(/'/g, '').trim(), fontSize: 32, bold: true, color: selectedTheme.colors.title.replace('#','') },
                bodyFont: { fontFace: selectedTheme.fonts.body.split(',')[0].replace(/'/g, '').trim(), fontSize: 18, color: selectedTheme.colors.body.replace('#','') },
                subtitleFont: { fontFace: selectedTheme.fonts.body.split(',')[0].replace(/'/g, '').trim(), fontSize: 24, color: selectedTheme.colors.body.replace('#','') },
                bgColor: selectedTheme.colors.cardBg.replace('#',''),
                accentColor: selectedTheme.colors.accent.replace('#',''),
            };
    
            pptx.defineSlideMaster({
                title: 'TITLE_SLIDE',
                background: { color: styles.bgColor },
                objects: [
                    { 'placeholder': {
                        options: { name: 'title', type: 'title', x: 0.5, y: 1.5, w: 9, h: 1.5, ...styles.titleFont, fontSize: 44, align: 'center' },
                        text: ''
                    }},
                    { 'placeholder': {
                        options: { name: 'subtitle', type: 'body', x: 1, y: 3.2, w: 8, h: 1, ...styles.subtitleFont, align: 'center' },
                        text: ''
                    }},
                ],
            });
    
            pptx.defineSlideMaster({
                title: 'CONTENT_SLIDE',
                background: { color: styles.bgColor },
                objects: [
                    { 'rect': { x: 0, y: '95%', w: '100%', h: '5%', fill: { color: styles.accentColor } } },
                    { 'placeholder': {
                        options: { name: 'footer', type: 'footer', x: 0.5, y: '96%', w: 9, h: 0.5, align: 'right', color: styles.bgColor, fontSize: 10 },
                        text: ''
                     }},
                    { 'placeholder': {
                        options: { name: 'title', type: 'title', x: 0.5, y: 0.2, w: 9, h: 1, ...styles.titleFont },
                        text: ''
                    }},
                    { 'placeholder': {
                        options: { name: 'body', type: 'body', x: 0.5, y: 1.2, w: 9, h: 5.5, ...styles.bodyFont },
                        text: ''
                    }},
                ],
            });
            
            for (const [index, slideData] of finalPresentation.slides.entries()) {
                let slide;
                let bodyContent = [];
    
                if (slideData.type === 'title_slide') {
                    slide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
                    slide.addText(slideData.title, { placeholder: 'title' });
                    const subtitle = slideData.content?.find(c => c.type === 'paragraph')?.text || '';
                    slide.addText(subtitle, { placeholder: 'subtitle' });
                } else {
                    slide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' });
                    slide.addText(slideData.title, { placeholder: 'title' });
                    slide.addText(String(index + 1), { placeholder: 'footer' });

                    for(const block of slideData.content) {
                         let text = block.text;
                        if (typeof block === 'string') text = block;
    
                        if (block.type === 'bullet' || typeof block === 'string') {
                            bodyContent.push({ text, options: { bullet: true, indentLevel: block.indentLevel || 0 } });
                        } else if (block.type === 'paragraph') {
                             bodyContent.push({ text: block.text });
                        } else if (block.type === 'infographic_point') {
                            bodyContent.push({ text: `${block.title}: ${block.value}`, options: { bold: true, fontSize: 22, color: styles.accentColor } });
                            bodyContent.push({ text: block.description, options: { indentLevel: 1 } });
                        } else if (block.type === 'visual_suggestion') {
                             bodyContent.push({ text: `[Visual Idea: ${block.description}]`, options: { color: '888888', italic: true } });
                        } else if (block.type === 'table') {
                            const tableRows = [block.headers.map(h => ({ text: h, options: { bold: true, fill: { color: styles.accentColor, alpha: 20 } } }))];
                            tableRows.push(...block.rows);
                            slide.addTable(tableRows, { x: 0.5, y: 2.5, w: 9, autoPage: true, ...styles.bodyFont, fontSize: 14, border: { type: 'solid', pt: 1, color: styles.accentColor + '80' } });
                        }
                    }
                    if (bodyContent.length > 0) {
                       slide.addText(bodyContent, { placeholder: 'body' });
                    }
                }
                
                if(slideData.speakerNotes) {
                    slide.addNotes(slideData.speakerNotes);
                }
            }
    
            await pptx.writeFile({ fileName: 'SciGenius-Presentation.pptx' });
    
        } catch (error) {
            console.error("Error generating PPTX:", error);
            alert(t.errorOccurred);
        } finally {
            setWorkflowState('ready');
        }
    };


    const handleListen = async (text, slideIndex) => {
        if (!text || audioLoadingSlideIndex !== null) return;
    
        if (speakingSlideIndex === slideIndex) {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }
            setSpeakingSlideIndex(null);
            return;
        }
    
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
        
        setSpeakingSlideIndex(slideIndex);
        setAudioLoadingSlideIndex(slideIndex);
    
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
                if (speakingSlideIndex === slideIndex) {
                    setSpeakingSlideIndex(null);
                }
                audioSourceRef.current = null;
            };
            
            source.start(0);
            audioSourceRef.current = source;
        } catch (error) {
            console.error("Error playing speech:", error);
            alert(`Could not play audio: ${error.message}`);
            setSpeakingSlideIndex(null);
        } finally {
            setAudioLoadingSlideIndex(null);
        }
    };


    return React.createElement('div', { className: "max-w-7xl mx-auto" },
        showLoadingOverlay && React.createElement('div', { className: "fixed inset-0 bg-white/80 dark:bg-black/80 z-50 flex flex-col justify-center items-center backdrop-blur-sm" },
            React.createElement(Spinner, { size: '12' }),
            React.createElement('p', { className: "text-lg text-slate-700 dark:text-brand-text-light mt-4" }, loadingMessage)
        ),
        React.createElement('div', { className: "text-center mb-8" },
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.presentationGeneratorTitle),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.presentationGeneratorDescription)
        ),

        React.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" },
            // --- Left Panel: Controls ---
            React.createElement('div', { className: "lg:col-span-1 space-y-4" },
                React.createElement(StepCard, { 
                    title: t.presentationStep1,
                    isEnabled: !showLoadingOverlay && workflowState !== 'visualizing'
                },
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                        PRESENTATION_LANGUAGES.map(lang => (
                            React.createElement('button', {
                                key: lang.code,
                                onClick: () => setPresentationLanguage(lang.code),
                                className: `p-3 rounded-lg border-2 font-semibold transition-colors ${presentationLanguage === lang.code ? 'border-brand-red bg-brand-red/10 text-brand-red' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'}`
                            }, language === 'ar' ? lang.arName : lang.name)
                        ))
                    )
                ),
                React.createElement(StepCard, {
                    title: t.presentationStep2,
                    isEnabled: !!presentationLanguage && !showLoadingOverlay && workflowState !== 'visualizing'
                },
                    React.createElement('div', { className: "space-y-4" },
                        React.createElement('div', null,
                            React.createElement('label', { className: "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" }, t.presentationTextAmount),
                            React.createElement(AmountSelector, { onSelect: setTextContentAmount, selected: textContentAmount, t: t })
                        ),
                        React.createElement('div', { className: 'my-4 border-t border-slate-200 dark:border-slate-700' }),
                        React.createElement('div', { className: "flex justify-around gap-2" },
                            React.createElement('button', { onClick: () => setCreationMethod('prompt'), className: `flex flex-col items-center gap-1 p-2 rounded-lg w-1/3 transition-colors ${creationMethod === 'prompt' ? 'bg-brand-red/10 text-brand-red' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}` }, React.createElement(PencilIcon, null), React.createElement('span', {className: 'text-xs'}, t.methodFromPrompt)),
                            React.createElement('button', { onClick: () => setCreationMethod('text'), className: `flex flex-col items-center gap-1 p-2 rounded-lg w-1/3 transition-colors ${creationMethod === 'text' ? 'bg-brand-red/10 text-brand-red' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}` }, React.createElement(ClipboardTextIcon, null), React.createElement('span', {className: 'text-xs'}, t.methodFromText)),
                            React.createElement('button', { onClick: () => setCreationMethod('import'), className: `flex flex-col items-center gap-1 p-2 rounded-lg w-1/3 transition-colors ${creationMethod === 'import' ? 'bg-brand-red/10 text-brand-red' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}` }, React.createElement(FileImportIcon, null), React.createElement('span', {className: 'text-xs'}, t.methodFromFile))
                        ),
                        creationMethod === 'prompt' && React.createElement('input', { type: "text", value: userInput.prompt, onChange: e => setUserInput({...userInput, prompt: e.target.value}), placeholder: t.enterTopicPrompt, dir: presentationLanguage === 'ar' ? 'rtl' : 'ltr', className: "w-full p-2 bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none" }),
                        creationMethod === 'text' && React.createElement('textarea', { value: userInput.text, onChange: e => setUserInput({...userInput, text: e.target.value}), placeholder: t.pasteTextPrompt, dir: presentationLanguage === 'ar' ? 'rtl' : 'ltr', className: "w-full p-2 h-28 bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none resize-none" }),
                        creationMethod === 'import' && React.createElement('div', { onClick: () => fileInputRef.current?.click(), onDragOver: (e) => { e.preventDefault(); setIsDragOver(true); }, onDragLeave: () => setIsDragOver(false), onDrop: (e) => { e.preventDefault(); setIsDragOver(false); setUserInput({...userInput, file: e.dataTransfer.files?.[0]}); }, className: `p-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-brand-red bg-brand-red/10' : 'border-slate-300 dark:border-gray-700 hover:border-slate-400 dark:hover:border-slate-500'}` }, 
                            React.createElement(UploadIcon, { className: "h-6 w-6 mx-auto text-slate-400 dark:text-slate-500" }),
                            React.createElement('p', { className: "text-xs mt-1 text-slate-500 dark:text-slate-400 truncate" }, userInput.file ? userInput.file.name : t.importFilePrompt)
                        ),
                        React.createElement('input', { type: "file", ref: fileInputRef, onChange: (e) => setUserInput({...userInput, file: e.target.files?.[0]}), className: "hidden", accept: ".pdf,.txt,.md" }),
                        React.createElement('div', { className: "flex items-center gap-2" },
                            React.createElement('label', { htmlFor: "slide-count", className: "text-sm font-medium text-slate-600 dark:text-slate-300" }, t.slideCount),
                            React.createElement('input', { type: "range", id: "slide-count", min: "5", max: "25", step: "1", value: slideCount, onChange: e => setSlideCount(e.target.value), className: "w-full" }),
                            React.createElement('span', { className: "font-bold text-slate-800 dark:text-white w-8 text-center" }, slideCount)
                        ),
                        React.createElement('button', { onClick: handleGenerateOutline, disabled: !creationMethod, className: "w-full bg-brand-red hover:bg-red-500 text-white font-bold py-2 px-4 rounded-full transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed" }, t.generateOutline)
                    )
                ),
                React.createElement(StepCard, {
                    title: t.presentationStep3,
                    isEnabled: (workflowState === 'outline_ready' || workflowState === 'ready') && !!generatedOutline && !generatedOutline.error && !showLoadingOverlay && workflowState !== 'visualizing'
                },
                    React.createElement('div', { className: 'space-y-4' },
                         React.createElement('div', { className: "grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2" },
                            PRESENTATION_THEMES.map(theme => React.createElement('button', { 
                                key: theme.id, 
                                onClick: () => setSelectedTheme(theme),
                                className: `text-left rounded-lg overflow-hidden transition-all duration-200 border ${selectedTheme.id === theme.id ? 'ring-2 ring-brand-red shadow-lg border-transparent' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`
                            },
                                React.createElement('div', { style: { background: theme.colors.slideBg, padding: '4px' }, className: 'h-12' }),
                                React.createElement('p', { className: 'p-1 text-xs font-semibold text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-gray-900 truncate' }, theme.name[language])
                            ))
                        ),
                        React.createElement('button', { onClick: handleGenerateFullPresentation, className: "w-full bg-brand-red hover:bg-red-500 text-white font-bold py-2 px-4 rounded-full transition-colors" }, t.generateFullPresentation)
                    )
                ),
                 React.createElement(StepCard, {
                    title: t.presentationStep4,
                    isEnabled: workflowState === 'ready' && !!finalPresentation && !finalPresentation.error
                 },
                    React.createElement('div', { className: 'space-y-3' },
                        React.createElement('p', {className: 'text-sm text-center text-slate-500 dark:text-slate-400'}, 'Your presentation is ready! Download it in your preferred format.'),
                        React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2' },
                            React.createElement('button', { onClick: handleDownloadPdf, className: "flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white font-bold py-2 px-4 rounded-full transition-colors" }, React.createElement(DownloadIcon, null), t.downloadPDF),
                            React.createElement('button', { onClick: handleDownloadPptx, className: "flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white font-bold py-2 px-4 rounded-full transition-colors" }, React.createElement(DownloadIcon, null), t.downloadPPTX),
                            React.createElement('button', { onClick: handleDownloadMarkdown, className: "sm:col-span-2 lg:col-span-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white font-bold py-2 px-4 rounded-full transition-colors" }, React.createElement(DownloadIcon, null), t.downloadMarkdown)
                        )
                    )
                )
            ),

            // --- Right Panel: Preview ---
            React.createElement('div', { className: "lg:col-span-2 h-[80vh]" },
                React.createElement(PreviewPanel, {
                    ref: previewRef,
                    workflowState: workflowState,
                    visualizationProgress: visualizationProgress,
                    generatedOutline: generatedOutline,
                    finalPresentation: finalPresentation,
                    t: t,
                    onListen: handleListen,
                    speakingSlideIndex: speakingSlideIndex,
                    audioLoadingSlideIndex: audioLoadingSlideIndex,
                    selectedTheme: selectedTheme,
                    presentationLanguage: presentationLanguage,
                    appTheme: appTheme // Pass appTheme to override preview background
                })
            )
        )
    );
};

export default PresentationGenerator;
