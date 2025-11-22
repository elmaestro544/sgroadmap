import React, { useState, useRef, useEffect, useCallback } from 'react';
import { i18n, DATA_ANALYSIS_OUTPUT_TYPES } from '../constants.js';
import * as apiService from '../services/geminiService.js';
import { Spinner, UploadIcon, DownloadIcon, CopyIcon, ResetIcon, ArrowLeftIcon, GridIcon, ListIcon, FocusIcon } from './Shared.js';

// --- Helper Functions ---
const wrapText = (text, maxLength) => {
    if (typeof text !== 'string' || text.length <= maxLength) {
        return text;
    }
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    for (const word of words) {
        if ((currentLine + word).length > maxLength && currentLine.length > 0) {
            lines.push(currentLine.trim());
            currentLine = '';
        }
        currentLine += word + ' ';
    }
    lines.push(currentLine.trim());
    return lines.filter(line => line); // Return array of strings for Chart.js multiline
};


// --- Child Components for Rendering Outputs ---

const ZoomInIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" })
);

const ZoomOutIcon = () => React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" })
);

const VisualizationDisplay = ({ jsonData, theme }) => {
    const [charts, setCharts] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        try {
            const parsedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                setCharts(parsedData);
            } else if (typeof parsedData === 'object' && !Array.isArray(parsedData) && parsedData !== null) { // Handle legacy single-object format
                setCharts([parsedData]);
            } else {
                setCharts([]);
            }
            setCurrentPage(0);
        } catch (e) {
            console.error("Failed to parse chart JSON:", e);
            setCharts([]);
        }
    }, [jsonData]);

    useEffect(() => {
        if (chartRef.current && charts.length > 0 && currentPage < charts.length) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            // Deep copy to avoid mutating state
            const chartData = JSON.parse(JSON.stringify(charts[currentPage]));
            
            const isDark = theme === 'dark';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const textColor = isDark ? '#f8fafc' : '#0f172a';
            
            // --- Enhancements ---
            // 1. Wrap long labels
            const MAX_LABEL_LENGTH = 20; 
            if (chartData.data.labels) {
                chartData.data.labels = chartData.data.labels.map(label => wrapText(label, MAX_LABEL_LENGTH));
            }
            
            // 2. Adjust container height for horizontal bar charts and others
            const isHorizontalBar = chartData.type === 'bar' && chartData.options?.indexAxis === 'y';
            const labelCount = chartData.data?.labels?.length || 0;
            if (isHorizontalBar && labelCount > 5 && containerRef.current) {
                const minHeight = labelCount * 35 + 120; // 35px per bar + 120px padding
                containerRef.current.style.height = `${minHeight}px`;
            } else if (containerRef.current) {
                // For other charts, dynamically set height based on width for a better aspect ratio
                const containerWidth = containerRef.current.offsetWidth;
                // Aim for a 16:10 aspect ratio, but with a minimum height of 400px.
                const desiredHeight = containerWidth > 0 ? containerWidth * 0.625 : 450;
                containerRef.current.style.height = `${Math.max(desiredHeight, 400)}px`;
            }


            const options = {
                ...chartData.options,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    ...(chartData.options?.plugins || {}),
                    // 3. Configure on-chart data labels
                    datalabels: {
                      anchor: chartData.type === 'bar' ? 'end' : 'center',
                      align: chartData.type === 'bar' ? (isHorizontalBar ? 'right' : 'top') : 'center',
                      color: textColor,
                      font: {
                          weight: 'bold',
                          size: 11
                      },
                      formatter: (value, context) => {
                          if (context.chart.config.type === 'pie' || context.chart.config.type === 'doughnut') {
                              const total = context.chart.data.datasets[0].data.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
                              const percentage = total > 0 ? ((value / total) * 100) : 0;
                              return percentage > 5 ? percentage.toFixed(1) + '%' : ''; // Only show if > 5%
                          }
                          return new Intl.NumberFormat().format(value);
                      },
                      display: (context) => {
                          const value = context.dataset.data[context.dataIndex];
                          return value > 0;
                      }
                    },
                    legend: { 
                        ...(chartData.options?.plugins?.legend || {}),
                        labels: { 
                            ...(chartData.options?.plugins?.legend?.labels || {}),
                            color: textColor 
                        } 
                    },
                    tooltip: {
                        ...(chartData.options?.plugins?.tooltip || {}),
                        callbacks: {
                            ...(chartData.options?.plugins?.tooltip?.callbacks || {}),
                            label: function(context) {
                                if (context.chart.config.type === 'pie' || context.chart.config.type === 'doughnut') {
                                    const total = context.chart.data.datasets[0].data.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(2) : 0;
                                    return `${context.label}: ${context.formattedValue} (${percentage}%)`;
                                }
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) label += new Intl.NumberFormat().format(context.parsed.y);
                                return label;
                            }
                        }
                    }
                },
                scales: chartData.options?.scales ? {
                    ...Object.keys(chartData.options.scales).reduce((acc, key) => {
                        acc[key] = {
                            ...(chartData.options.scales[key] || {}),
                            ticks: { ...(chartData.options.scales[key]?.ticks || {}), color: textColor },
                            grid: { ...(chartData.options.scales[key]?.grid || {}), color: gridColor }
                        };
                        return acc;
                    }, {})
                } : undefined
            };

            chartInstance.current = new Chart(ctx, {
                type: chartData.type,
                data: chartData.data,
                options: options,
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [charts, currentPage, theme]);

    if (charts.length === 0) {
        return React.createElement('div', { className: "flex items-center justify-center h-full text-center text-slate-500" }, "No data to visualize or data is in an invalid format.");
    }
    
    const currentChart = charts[currentPage];

    return React.createElement('div', { className: "flex flex-col h-full" },
      React.createElement('div', { ref: containerRef, className: "flex-grow relative" },
        React.createElement('canvas', { ref: chartRef })
      ),
      React.createElement('div', { className: "text-center pt-4" },
          React.createElement('p', { className: "text-sm text-slate-600 dark:text-brand-text-light min-h-[20px]" }, currentChart.description || `Chart ${currentPage + 1} of ${charts.length}`)
      ),
      charts.length > 1 && React.createElement('div', { className: "flex justify-center items-center gap-4 pt-2" },
          React.createElement('button', {
              onClick: () => setCurrentPage(p => Math.max(0, p - 1)),
              disabled: currentPage === 0,
              className: "px-4 py-1 text-sm bg-slate-200 dark:bg-white/10 rounded-md disabled:opacity-50 transition-opacity"
          }, "Previous"),
          React.createElement('span', { className: "text-sm font-medium text-slate-700 dark:text-brand-text" }, `${currentPage + 1} / ${charts.length}`),
          React.createElement('button', {
              onClick: () => setCurrentPage(p => Math.min(charts.length - 1, p + 1)),
              disabled: currentPage === charts.length - 1,
              className: "px-4 py-1 text-sm bg-slate-200 dark:bg-white/10 rounded-md disabled:opacity-50 transition-opacity"
          }, "Next")
      )
    );
};


const MermaidDiagram = ({ syntax, theme, t }) => {
    const mermaidRef = useRef(null);
    const [pages, setPages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (syntax) {
            // Split by a custom delimiter or based on node count
            const MAX_NODES_PER_PAGE = 20;
            const lines = syntax.trim().split('\n');
            const header = lines.shift() || 'graph TD;';
            const definitions = lines.filter(line => !line.includes('-->'));
            const links = lines.filter(line => line.includes('-->'));

            if (links.length > MAX_NODES_PER_PAGE) {
                let chunks = [];
                for (let i = 0; i < links.length; i += MAX_NODES_PER_PAGE) {
                    chunks.push(links.slice(i, i + MAX_NODES_PER_PAGE));
                }
                
                const pagedSyntaxes = chunks.map(chunk => {
                    const nodesInChunk = new Set();
                    chunk.forEach(link => {
                        const parts = link.split('-->');
                        const from = parts[0].trim().split('[')[0].split('{')[0];
                        const to = parts[1].trim().split('[')[0].split('{')[0];
                        nodesInChunk.add(from);
                        nodesInChunk.add(to);
                    });
                    
                    const relevantDefinitions = definitions.filter(def => {
                        const nodeName = def.trim().split('[')[0].split('{')[0];
                        return nodesInChunk.has(nodeName);
                    });

                    return [header, ...relevantDefinitions, ...chunk].join('\n');
                });
                setPages(pagedSyntaxes);
            } else {
                setPages([syntax]);
            }
            setCurrentPage(0);
        }
    }, [syntax]);

    useEffect(() => {
        if (mermaidRef.current && pages.length > 0 && window.mermaid) {
            const currentSyntax = pages[currentPage];
            try {
                window.mermaid.initialize({ 
                    startOnLoad: false, 
                    theme: theme === 'dark' ? 'dark' : 'default',
                    securityLevel: 'loose',
                });
                window.mermaid.render('mermaid-graph-' + Date.now(), currentSyntax, (svgCode) => {
                    if (mermaidRef.current) {
                      mermaidRef.current.innerHTML = svgCode;
                    }
                });
            } catch(e) {
                console.error("Mermaid rendering error:", e);
                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = "Error rendering diagram. Please check the syntax.";
                }
            }
        }
    }, [pages, currentPage, theme]);

    return React.createElement('div', { className: "flex flex-col h-full" },
        React.createElement('div', { ref: mermaidRef, className: "mermaid-container flex-grow flex justify-center items-center h-full w-full" }),
        pages.length > 1 && React.createElement('div', { className: "flex justify-center items-center gap-4 pt-4" },
            React.createElement('button', {
                onClick: () => setCurrentPage(p => Math.max(0, p - 1)),
                disabled: currentPage === 0,
                className: "px-4 py-1 text-sm bg-slate-200 dark:bg-white/10 rounded-md disabled:opacity-50 transition-opacity"
            }, t.previous),
            React.createElement('span', { className: "text-sm font-medium text-slate-700 dark:text-brand-text" }, `${currentPage + 1} / ${pages.length}`),
            React.createElement('button', {
                onClick: () => setCurrentPage(p => Math.min(pages.length - 1, p + 1)),
                disabled: currentPage === pages.length - 1,
                className: "px-4 py-1 text-sm bg-slate-200 dark:bg-white/10 rounded-md disabled:opacity-50 transition-opacity"
            }, t.next)
        )
    );
};

const InfographicDisplay = ({ jsonData, t }) => {
    const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'focus'
    const [currentPage, setCurrentPage] = useState(0);

    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    if (!data || !data.points || !Array.isArray(data.points)) return null;
    
    const totalPoints = data.points.length;

    const InfographicPoint = ({ point, index, viewMode }) => {
        const isFocus = viewMode === 'focus';
        return React.createElement('div', { className: `flex items-start gap-4 p-4 bg-slate-100/50 dark:bg-card-gradient rounded-lg ${isFocus ? 'w-full' : ''}` },
            React.createElement('div', { className: `flex-shrink-0 flex items-center justify-center rounded-full bg-brand-red/20 text-brand-red font-bold ${isFocus ? 'h-12 w-12 text-xl' : 'h-10 w-10 text-lg'}` }, index + 1),
            React.createElement('div', null,
                React.createElement('h4', { className: `font-bold text-slate-900 dark:text-brand-text ${isFocus ? 'text-lg' : ''}` }, point.pointTitle),
                React.createElement('p', { className: `font-light text-slate-800 dark:text-white my-1 ${isFocus ? 'text-3xl' : 'text-2xl'}` }, point.statistic),
                React.createElement('p', { className: `text-sm text-slate-500 dark:text-brand-text-light ${isFocus ? 'text-base' : ''}` }, point.explanation)
            )
        );
    };

    return React.createElement('div', { className: "p-4 flex flex-col h-full" },
        React.createElement('div', { className: "text-center" },
            React.createElement('h3', { className: "text-2xl font-bold mb-2 text-brand-red" }, data.title),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light" }, data.summary)
        ),
        React.createElement('div', { className: "flex justify-center items-center gap-2 my-4" },
            React.createElement('button', { title: t.infographicGridView, onClick: () => setViewMode('grid'), className: `p-2 rounded-md ${viewMode === 'grid' ? 'bg-brand-red/20 text-brand-red' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}, React.createElement(GridIcon, null)),
            React.createElement('button', { title: t.infographicListView, onClick: () => setViewMode('list'), className: `p-2 rounded-md ${viewMode === 'list' ? 'bg-brand-red/20 text-brand-red' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}, React.createElement(ListIcon, null)),
            React.createElement('button', { title: t.infographicFocusView, onClick: () => setViewMode('focus'), className: `p-2 rounded-md ${viewMode === 'focus' ? 'bg-brand-red/20 text-brand-red' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}, React.createElement(FocusIcon, null))
        ),
        React.createElement('div', { className: "flex-grow overflow-y-auto" },
            viewMode === 'grid' && React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                data.points.map((point, index) => React.createElement(InfographicPoint, { key: index, point, index, viewMode }))
            ),
            viewMode === 'list' && React.createElement('div', { className: "space-y-4" },
                data.points.map((point, index) => React.createElement(InfographicPoint, { key: index, point, index, viewMode }))
            ),
            viewMode === 'focus' && React.createElement('div', { className: "flex flex-col items-center justify-center h-full" },
                React.createElement(InfographicPoint, { point: data.points[currentPage], index: currentPage, viewMode })
            )
        ),
        viewMode === 'focus' && totalPoints > 1 && React.createElement('div', { className: "flex justify-center items-center gap-4 pt-4" },
            React.createElement('button', {
                onClick: () => setCurrentPage(p => Math.max(0, p - 1)),
                disabled: currentPage === 0,
                className: "px-4 py-1 text-sm bg-slate-200 dark:bg-white/10 rounded-md disabled:opacity-50 transition-opacity"
            }, t.previous),
            React.createElement('span', { className: "text-sm font-medium text-slate-700 dark:text-brand-text" }, `${currentPage + 1} / ${totalPoints}`),
            React.createElement('button', {
                onClick: () => setCurrentPage(p => Math.min(totalPoints - 1, p + 1)),
                disabled: currentPage === totalPoints - 1,
                className: "px-4 py-1 text-sm bg-slate-200 dark:bg-white/10 rounded-md disabled:opacity-50 transition-opacity"
            }, t.next)
        )
    );
};


// --- Main DataAnalysis Component ---

const DataAnalysis = ({ language, theme }) => {
  const t = i18n[language];
  const [analysisStep, setAnalysisStep] = useState('selectType'); // 'selectType', 'uploadFile', 'showResult'
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // For text extraction
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [outputs, setOutputs] = useState({});
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef(null);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.2));
  const handleZoomReset = () => setZoomLevel(1);

  const handleReset = () => {
    setAnalysisStep('selectType');
    setFile(null);
    setFileContent('');
    setIsProcessing(false);
    setActiveTab(null);
    setOutputs({});
    setZoomLevel(1);
    if(fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleTypeSelect = (typeId) => {
    setActiveTab(typeId);
    setAnalysisStep('uploadFile');
  };

  const processFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalysisStep('showResult');
    setIsProcessing(true);
    setFileContent('');
    setOutputs({});

    try {
      if (selectedFile.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
          }
          setFileContent(text);
          setIsProcessing(false);
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        const text = await selectedFile.text();
        setFileContent(text);
        setIsProcessing(false);
      }
    } catch (error) {
        console.error("Error processing file:", error);
        alert(t.errorOccurred);
        handleReset();
    }
  }, [t.errorOccurred]);

  const generateOutput = useCallback(async (outputType) => {
    if (!fileContent || outputs[outputType]?.data) return;

    setOutputs(prev => ({ ...prev, [outputType]: { ...prev[outputType], loading: true } }));
    try {
        const result = await apiService.analyzeData(fileContent, outputType);
        setOutputs(prev => ({ ...prev, [outputType]: { data: result, loading: false } }));
    } catch (error) {
        console.error(`Error generating ${outputType}:`, error);
        setOutputs(prev => ({ ...prev, [outputType]: { data: t.errorOccurred, loading: false } }));
    }
  }, [fileContent, outputs, t.errorOccurred]);
  
  useEffect(() => {
    if (fileContent && activeTab && !outputs[activeTab]?.data && !outputs[activeTab]?.loading) {
        generateOutput(activeTab);
    }
  }, [fileContent, activeTab, outputs, generateOutput]);

  const handleDragEvents = (e, over) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(over); };
  const handleDrop = (e) => { handleDragEvents(e, false); processFile(e.dataTransfer.files?.[0]); };
  const handleFileChange = (e) => processFile(e.target.files?.[0]);

  const handleExport = (outputType) => {
    const outputData = outputs[outputType]?.data;
    if (!outputData) return;

    switch(outputType) {
        case 'visualization': {
            const canvas = document.querySelector('.output-content canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `${file.name.split('.')[0]}_visualization.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            break;
        }
        case 'flowchart': {
             const svgElement = document.querySelector('.output-content .mermaid-container svg');
            if (svgElement) {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${file.name.split('.')[0]}_${outputType}.svg`;
                link.click();
                URL.revokeObjectURL(url);
            }
            break;
        }
        case 'infographic': {
            const textToCopy = JSON.stringify(JSON.parse(outputData), null, 2);
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            break;
        }
    }
  };

  if (analysisStep === 'selectType') {
    return React.createElement('div', { className: "max-w-4xl mx-auto" },
        React.createElement('div', { className: "text-center mb-8" },
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.dataAnalysisTitle),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, "Select an analysis type to begin.")
        ),
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
            DATA_ANALYSIS_OUTPUT_TYPES.map(type => React.createElement('div', {
                key: type.id,
                onClick: () => handleTypeSelect(type.id),
                className: "flex flex-col items-center text-center bg-white dark:bg-card-gradient p-6 rounded-2xl border border-slate-200 dark:border-white/10 transition-all duration-300 transform hover:scale-105 hover:z-10 cursor-pointer shadow-lg dark:shadow-card hover:border-brand-red hover:shadow-brand-red/20 dark:hover:shadow-glow-red"
            },
                React.createElement(type.icon, null),
                React.createElement('h3', { className: "text-base font-bold text-slate-900 dark:text-brand-text mb-1" }, t[type.nameKey]),
                React.createElement('p', { className: "text-sm text-slate-500 dark:text-brand-text-light" }, t[type.descKey])
            ))
        )
    );
  }

  if (analysisStep === 'uploadFile') {
     return React.createElement('div', { className: "max-w-4xl mx-auto" },
        React.createElement('div', { className: "text-center" },
             React.createElement('button', {
                onClick: () => setAnalysisStep('selectType'),
                className: `inline-flex items-center text-sm font-semibold text-slate-500 dark:text-brand-text-light hover:text-slate-900 dark:hover:text-brand-text transition-colors mb-6 mx-auto ${language === 'ar' ? 'flex-row-reverse' : ''}`
             }, React.createElement(ArrowLeftIcon, { className: language === 'ar' ? 'transform rotate-180' : '' }), t.backToSelection),
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t[DATA_ANALYSIS_OUTPUT_TYPES.find(o => o.id === activeTab).nameKey]),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2 mb-8" }, t.dataAnalysisDescription)
        ),
        React.createElement('div', {
            onClick: () => fileInputRef.current?.click(),
            onDragOver: (e) => handleDragEvents(e, true),
            onDragLeave: (e) => handleDragEvents(e, false),
            onDrop: handleDrop,
            className: `flex-grow h-64 flex flex-col justify-center items-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isDragOver ? 'border-brand-blue bg-slate-200 dark:bg-card-gradient' : 'bg-slate-200/50 dark:bg-card-gradient border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40'}`
        },
            React.createElement(UploadIcon, null),
            React.createElement('p', { className: "mt-4 text-lg text-slate-500 dark:text-brand-text-light" }, t.dataUploadPrompt),
            React.createElement('input', { type: "file", ref: fileInputRef, onChange: handleFileChange, className: "hidden", accept: ".pdf,.csv,.txt" })
        )
    );
  }

  if (analysisStep === 'showResult') {
    return React.createElement('div', { className: "max-w-7xl mx-auto" },
      React.createElement('div', { className: "flex flex-col sm:flex-row justify-between sm:items-center text-center sm:text-left mb-8" },
        React.createElement('div', null,
            React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.dataAnalysisTitle),
            React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, file.name)
        ),
        React.createElement('button', {
            onClick: handleReset,
            className: "mt-4 sm:mt-0 flex items-center justify-center gap-2 text-sm font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-card-gradient dark:hover:bg-white/10 text-slate-700 dark:text-brand-text-light py-2 px-4 rounded-full transition-colors mx-auto sm:mx-0"
        },
          React.createElement(ResetIcon, { className: 'h-4 w-4' }),
          t.resetAndAnalyzeNew
        )
      ),
      isProcessing ? React.createElement('div', { className: "flex justify-center items-center h-64" }, React.createElement(Spinner, null), React.createElement('span', { className: "ml-4" }, t.extractingText)) :
      React.createElement('div', { className: "bg-white dark:bg-brand-light-dark rounded-xl border border-slate-200 dark:border-white/10" },
        React.createElement('div', { className: "border-b border-slate-200 dark:border-white/10" },
          React.createElement('nav', { className: "flex flex-wrap -mb-px px-4" },
              DATA_ANALYSIS_OUTPUT_TYPES.map(type => 
                  React.createElement('button', {
                      key: type.id,
                      onClick: () => setActiveTab(type.id),
                      className: `whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === type.id ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 dark:text-brand-text-light hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-white'}`
                  }, t[type.nameKey])
              )
          )
        ),
        React.createElement('div', { className: "p-4 min-h-[500px] relative flex flex-col" },
          outputs[activeTab]?.loading && React.createElement('div', { className: "absolute inset-0 bg-white/50 dark:bg-black/50 flex flex-col justify-center items-center z-10 rounded-b-xl" },
              React.createElement(Spinner, {}),
              React.createElement('span', { className: "mt-2" }, t.generatingOutput.replace('{outputType}', t[DATA_ANALYSIS_OUTPUT_TYPES.find(o => o.id === activeTab).nameKey]))
          ),
          React.createElement('div', { className: "flex-grow overflow-auto" },
              React.createElement('div', { 
                  className: 'w-full h-full transition-transform duration-200',
                  style: {
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left'
                  }
              },
                  outputs[activeTab]?.data && React.createElement('div', {className: 'output-content h-full'},
                      activeTab === 'visualization' && React.createElement(VisualizationDisplay, { jsonData: outputs[activeTab].data, theme: theme }),
                      activeTab === 'flowchart' && React.createElement(MermaidDiagram, { syntax: outputs[activeTab].data, theme: theme, t:t }),
                      activeTab === 'infographic' && React.createElement(InfographicDisplay, { jsonData: outputs[activeTab].data, t:t })
                  )
              )
          ),
           outputs[activeTab]?.data && React.createElement('button', {
               onClick: () => handleExport(activeTab),
               className: `absolute top-6 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center bg-brand-red hover:bg-red-500 text-white text-xs font-semibold py-1.5 px-3 rounded-full transition-colors z-10`
              }, 
               (activeTab === 'visualization') && React.createElement(React.Fragment, null, React.createElement(DownloadIcon, {className:"h-4 w-4 mr-1.5"}), t.exportPNG),
               (activeTab === 'flowchart') && React.createElement(React.Fragment, null, React.createElement(DownloadIcon, {className:"h-4 w-4 mr-1.5"}), t.exportSVG),
               (activeTab === 'infographic') && React.createElement(React.Fragment, null, React.createElement(CopyIcon, {className:"h-4 w-4 mr-1.5"}), copied ? t.copied : t.copy)
           ),
           outputs[activeTab]?.data && React.createElement('div', {
              className: `absolute bottom-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-10 flex items-center gap-2 bg-white/50 dark:bg-brand-dark p-2 rounded-full shadow-lg border border-slate-200 dark:border-white/20`
           },
              React.createElement('button', { onClick: handleZoomOut, className: 'h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors' }, React.createElement(ZoomOutIcon, null)),
              React.createElement('button', { onClick: handleZoomReset, className: 'text-sm font-semibold cursor-pointer min-w-[40px] text-center px-2' }, `${Math.round(zoomLevel * 100)}%`),
              React.createElement('button', { onClick: handleZoomIn, className: 'h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors' }, React.createElement(ZoomInIcon, null))
          )
        )
      )
    );
  }

  return null; // Fallback
};

export default DataAnalysis;