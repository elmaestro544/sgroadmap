


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { i18n } from '../constants.js';
import * as apiService from '../services/geminiService.js';
import { Spinner, UploadIcon, DownloadIcon, VideoIcon, FullscreenIcon, ExitFullscreenIcon, ShareIcon } from './Shared.js';

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

const InfographicVideoGenerator = ({ language, theme }) => {
    const t = i18n[language];

    // Core State
    const [step, setStep] = useState('input'); // 'input', 'loading', 'preview'
    const [textInput, setTextInput] = useState('');
    const [fileInput, setFileInput] = useState(null);
    const [config, setConfig] = useState({
        duration: '60',
        voice: 'Female',
        orientation: 'Landscape (16:9)',
        style: 'Modern',
        language: 'en',
    });
    const [scenes, setScenes] = useState([]);
    
    // UI/Loading State
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [encodingProgress, setEncodingProgress] = useState({ active: false, message: '', progress: 0 });
    
    // Player State
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReplay, setIsReplay] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const fileInputRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioSourceRef = useRef(null);
    const playerRef = useRef(null);
    const isGeneratingRef = useRef(false);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.onended = null;
                audioSourceRef.current.stop();
            }
            audioContextRef.current?.close();
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleGenerate = async () => {
        if (isGeneratingRef.current) return;
        const hasInput = textInput.trim() || fileInput;
        if (!hasInput) {
            setError('Please provide text or upload a document to begin.');
            return;
        }

        isGeneratingRef.current = true;
        setError('');
        setStep('loading');
        setLoadingMessage(t.videoGenLoaderAnalyzing);

        try {
            let content = textInput;
            if (fileInput) {
                content = await apiService.extractTextFromFile(fileInput);
            }

            const scriptResult = await apiService.generateVideoScript(content, config, config.language);
            const scriptData = JSON.parse(scriptResult);
            
            if (!scriptData.scenes || scriptData.scenes.length === 0) {
                throw new Error("AI failed to generate a valid video script.");
            }

            setLoadingMessage(t.videoGenLoaderGeneratingAssets.replace('{sceneCount}', scriptData.scenes.length));
            
            let scenesWithAssets = [];
            for (const [index, scene] of scriptData.scenes.entries()) {
                setLoadingMessage(t.videoGenLoaderProcessingScene
                    .replace('{currentScene}', index + 1)
                    .replace('{totalScenes}', scriptData.scenes.length)
                    .replace('{sceneTitle}', scene.title)
                );
                
                const [imageBase64, audioBase64] = await Promise.all([
                    apiService.generateInfographicImage(scene.visualPrompt, config.style),
                    apiService.generateSpeech(scene.script, config.voice)
                ]);

                scenesWithAssets.push({
                    ...scene,
                    imageUrl: `data:image/png;base64,${imageBase64}`,
                    audioBase64: audioBase64
                });
            }

            // Post-processing for durations and animations
            setLoadingMessage(t.videoGenLoaderCalculatingDurations);
            const kenBurnsAnimations = ['animate-ken-burns-in', 'animate-ken-burns-left', 'animate-ken-burns-out', 'animate-ken-burns-right'];
            const tempAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

            const processedScenes = await Promise.all(scenesWithAssets.map(async (scene, index) => {
                const audioData = decode(scene.audioBase64);
                const audioBuffer = await decodeAudioData(audioData, tempAudioCtx);
                return {
                    ...scene,
                    duration: audioBuffer.duration,
                    animationClass: kenBurnsAnimations[index % kenBurnsAnimations.length]
                };
            }));
            await tempAudioCtx.close();

            setScenes(processedScenes);
            setStep('preview');
            setCurrentSceneIndex(0);
            setIsPlaying(true);
            setIsReplay(false);

        } catch (err) {
            console.error("Video Generation Error:", err);
            setError(err.message || t.errorOccurred);
            setStep('input');
        } finally {
            isGeneratingRef.current = false;
        }
    };

    const handleReset = () => {
        setStep('input');
        setTextInput('');
        setFileInput(null);
        setScenes([]);
        setError('');
        setCurrentSceneIndex(0);
        setIsPlaying(false);
        if(fileInputRef.current) fileInputRef.current.value = null;
    };
    
    const handleDownloadAssets = async () => {
        if (scenes.length === 0 || !window.JSZip) return;

        const zip = new window.JSZip();
        const assetsFolder = zip.folder("infographic_video_assets");

        let scriptMarkdown = `# Video Script\n\n`;

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        for (const [index, scene] of scenes.entries()) {
            const sceneNum = index + 1;
            scriptMarkdown += `## Scene ${sceneNum}: ${scene.title}\n\n`;
            scriptMarkdown += `**Takeaway:** ${scene.keyTakeaway}\n\n`;
            scriptMarkdown += `**Script:**\n${scene.script}\n\n`;
            scriptMarkdown += `**Visual Prompt:**\n\`\`\`\n${scene.visualPrompt}\n\`\`\`\n\n---\n\n`;

            const imageResponse = await fetch(scene.imageUrl);
            const imageBlob = await imageResponse.blob();
            assetsFolder.file(`scene_${sceneNum}_image.png`, imageBlob);

            // Correctly create a WAV file from raw PCM data
            const pcmData = decode(scene.audioBase64);
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

            // Write PCM data
            for (let i = 0; i < pcmData.length; i++) {
                view.setUint8(44 + i, pcmData[i]);
            }

            const audioBlob = new Blob([view], { type: 'audio/wav' });
            assetsFolder.file(`scene_${sceneNum}_audio.wav`, audioBlob);
        }

        zip.file("script.md", scriptMarkdown);

        zip.generateAsync({ type: "blob" }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "SciGenius_Video_Assets.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const handleDownloadVideo = async () => {
        if (scenes.length === 0 || !window.FFmpeg || !window.FFmpegUtil) return;

        setEncodingProgress({ active: true, message: 'Initializing encoder...', progress: 0 });

        const { FFmpeg } = window.FFmpeg;
        const ffmpeg = new FFmpeg();
        
        ffmpeg.on('log', ({ message }) => console.log(message));
        ffmpeg.on('progress', ({ progress }) => {
            setEncodingProgress(prev => ({ ...prev, progress: Math.max(prev.progress, progress) }));
        });
        
        try {
            const { toBlobURL } = window.FFmpegUtil;
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            setEncodingProgress(prev => ({ ...prev, message: 'Preparing assets...' }));

            const durations = scenes.map(s => s.duration);
            
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const imageName = `scene_${i}.png`;
                const audioName = `scene_${i}.pcm`;

                await ffmpeg.writeFile(imageName, await window.FFmpegUtil.fetchFile(scene.imageUrl));
                await ffmpeg.writeFile(audioName, decode(scene.audioBase64));
            }
            
            setEncodingProgress(prev => ({ ...prev, message: 'Building video command...' }));

            const command = [];
            let filterComplex_video_processing = '';
            let videoConcatInputs = '';
            let filterComplex_audio_processing = '';
            let audioConcatInputs = '';
            
            const outputWidth = config.orientation.startsWith('Landscape') ? 1920 : 1080;
            const outputHeight = config.orientation.startsWith('Landscape') ? 1080 : 1920;

            scenes.forEach((scene, i) => {
                command.push('-i', `scene_${i}.png`);
                
                const durationFrames = Math.floor(durations[i] * 25); // fps=25
                let zoompanFilter;
                const animation = scene.animationClass;

                if (animation === 'animate-ken-burns-in') {
                    zoompanFilter = `zoompan=z='min(zoom+0.001,1.1)':d=${durationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                } else if (animation === 'animate-ken-burns-out') {
                    zoompanFilter = `zoompan=z='if(eq(on,0),1.1,max(1.0,zoom-0.0004))':d=${durationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                } else if (animation === 'animate-ken-burns-left') {
                    zoompanFilter = `zoompan=z=1.1:d=${durationFrames}:x='iw-(iw/zoom)-((on/${durationFrames})*(iw-(iw/zoom)))':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                } else { // 'animate-ken-burns-right'
                    zoompanFilter = `zoompan=z=1.1:d=${durationFrames}:x='(on/${durationFrames})*(iw-(iw/zoom))':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                }

                filterComplex_video_processing += `[${i}:v]${zoompanFilter},settb=AVTB,fps=25,setsar=1,setpts=PTS-STARTPTS[v${i}];`;
                videoConcatInputs += `[v${i}]`;
            });
            
            scenes.forEach((_, i) => {
                command.push('-f', 's16le', '-ar', '24000', '-ac', '1', '-i', `scene_${i}.pcm`);
                filterComplex_audio_processing += `[${i + scenes.length}:a]asetpts=PTS-STARTPTS[a${i}];`;
                audioConcatInputs += `[a${i}]`;
            });

            const filterComplex = 
                filterComplex_video_processing + 
                filterComplex_audio_processing +
                `${videoConcatInputs}concat=n=${scenes.length}:v=1:a=0[v];` +
                `${audioConcatInputs}concat=n=${scenes.length}:v=0:a=1[a]`;

            command.push(
                '-filter_complex', filterComplex,
                '-map', '[v]',
                '-map', '[a]',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-t', durations.reduce((a, b) => a + b, 0).toString(),
                'output.mp4'
            );
            
            setEncodingProgress(prev => ({ ...prev, message: 'Encoding video... This may take a while.' }));
            await ffmpeg.exec(...command);
            
            setEncodingProgress(prev => ({ ...prev, message: 'Finalizing download...' }));
            const data = await ffmpeg.readFile('output.mp4');
            
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'SciGenius_Infographic_Video.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error('FFmpeg error:', err);
            setError(`Video encoding failed: ${err.message}`);
        } finally {
            try { await ffmpeg.terminate(); } catch(e) { console.error("Could not terminate ffmpeg", e); }
            setEncodingProgress({ active: false, message: '', progress: 0 });
        }
    };

    const handleShareVideo = async () => {
        if (!navigator.share || !navigator.canShare) {
            alert("Web Share API is not supported in your browser.");
            return;
        }

        if (scenes.length === 0 || !window.FFmpeg || !window.FFmpegUtil) return;

        setEncodingProgress({ active: true, message: 'Initializing encoder...', progress: 0 });

        const { FFmpeg } = window.FFmpeg;
        const ffmpeg = new FFmpeg();
        
        ffmpeg.on('log', ({ message }) => console.log(message));
        ffmpeg.on('progress', ({ progress }) => {
            setEncodingProgress(prev => ({ ...prev, progress: Math.max(prev.progress, progress) }));
        });
        
        try {
            const { toBlobURL } = window.FFmpegUtil;
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            setEncodingProgress(prev => ({ ...prev, message: 'Preparing assets for sharing...' }));

            const durations = scenes.map(s => s.duration);
            
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const imageName = `scene_${i}.png`;
                const audioName = `scene_${i}.pcm`;

                await ffmpeg.writeFile(imageName, await window.FFmpegUtil.fetchFile(scene.imageUrl));
                await ffmpeg.writeFile(audioName, decode(scene.audioBase64));
            }
            
            setEncodingProgress(prev => ({ ...prev, message: 'Building video command...' }));
            
            const command = [];
            let filterComplex_video_processing = '';
            let videoConcatInputs = '';
            let filterComplex_audio_processing = '';
            let audioConcatInputs = '';
            
            const outputWidth = config.orientation.startsWith('Landscape') ? 1920 : 1080;
            const outputHeight = config.orientation.startsWith('Landscape') ? 1080 : 1920;

            scenes.forEach((scene, i) => {
                command.push('-i', `scene_${i}.png`);
                
                const durationFrames = Math.floor(durations[i] * 25); // fps=25
                let zoompanFilter;
                const animation = scene.animationClass;

                if (animation === 'animate-ken-burns-in') {
                    zoompanFilter = `zoompan=z='min(zoom+0.001,1.1)':d=${durationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                } else if (animation === 'animate-ken-burns-out') {
                    zoompanFilter = `zoompan=z='if(eq(on,0),1.1,max(1.0,zoom-0.0004))':d=${durationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                } else if (animation === 'animate-ken-burns-left') {
                    zoompanFilter = `zoompan=z=1.1:d=${durationFrames}:x='iw-(iw/zoom)-((on/${durationFrames})*(iw-(iw/zoom)))':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                } else { // 'animate-ken-burns-right'
                    zoompanFilter = `zoompan=z=1.1:d=${durationFrames}:x='(on/${durationFrames})*(iw-(iw/zoom))':y='ih/2-(ih/zoom/2)':s=${outputWidth}x${outputHeight}`;
                }

                filterComplex_video_processing += `[${i}:v]${zoompanFilter},settb=AVTB,fps=25,setsar=1,setpts=PTS-STARTPTS[v${i}];`;
                videoConcatInputs += `[v${i}]`;
            });
            
            scenes.forEach((_, i) => {
                command.push('-f', 's16le', '-ar', '24000', '-ac', '1', '-i', `scene_${i}.pcm`);
                filterComplex_audio_processing += `[${i + scenes.length}:a]asetpts=PTS-STARTPTS[a${i}];`;
                audioConcatInputs += `[a${i}]`;
            });

            const filterComplex = 
                filterComplex_video_processing + 
                filterComplex_audio_processing +
                `${videoConcatInputs}concat=n=${scenes.length}:v=1:a=0[v];` +
                `${audioConcatInputs}concat=n=${scenes.length}:v=0:a=1[a]`;
            
            command.push(
                '-filter_complex', filterComplex,
                '-map', '[v]',
                '-map', '[a]',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-t', durations.reduce((a, b) => a + b, 0).toString(),
                'output.mp4'
            );
            
            setEncodingProgress(prev => ({ ...prev, message: 'Encoding video for sharing...' }));
            await ffmpeg.exec(...command);
            
            setEncodingProgress(prev => ({ ...prev, message: 'Preparing share data...' }));
            const data = await ffmpeg.readFile('output.mp4');
            
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const file = new File([blob], "SciGenius_Infographic_Video.mp4", { type: "video/mp4" });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: "Video from SciGenius",
                    text: "Check out this infographic video I created with SciGenius!",
                    files: [file],
                });
            } else {
                alert("Your browser cannot share video files.");
            }
            
        } catch (err) {
            console.error('Sharing error:', err);
             if (err.name !== 'AbortError') {
                setError(`Sharing failed: ${err.message}`);
             }
        } finally {
            try { await ffmpeg.terminate(); } catch(e) { console.error("Could not terminate ffmpeg", e); }
            setEncodingProgress({ active: false, message: '', progress: 0 });
        }
    };


    const handleNextScene = useCallback(() => {
        if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
            setIsReplay(true);
        }
    }, [currentSceneIndex, scenes.length]);

    useEffect(() => {
        const playCurrentSceneAudio = async () => {
            const currentScene = scenes[currentSceneIndex];
            if (!currentScene || !currentScene.audioBase64 || !audioContextRef.current) {
                setTimeout(handleNextScene, currentScene?.duration * 1000 || 4000);
                return;
            }
            
            if (audioSourceRef.current) audioSourceRef.current.stop();
            
            try {
                const audioData = decode(currentScene.audioBase64);
                if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
                
                const audioBuffer = await decodeAudioData(audioData, audioContextRef.current);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.onended = () => { if (audioSourceRef.current === source) handleNextScene(); };
                source.start(0);
                audioSourceRef.current = source;
            } catch (e) {
                console.error("Audio play failed:", e);
                handleNextScene();
            }
        };
    
        if (step === 'preview' && isPlaying) {
            playCurrentSceneAudio();
        } else if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
    
        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.onended = null;
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            }
        };
    }, [isPlaying, currentSceneIndex, step, scenes, handleNextScene]);

    const handlePrevScene = () => {
        setIsReplay(false);
        setCurrentSceneIndex(prev => Math.max(0, prev - 1));
    };

    const handlePlayPause = () => {
        if (isReplay) {
            setIsReplay(false);
            setCurrentSceneIndex(0);
        }
        setIsPlaying(prev => !prev);
    };

    const toggleFullscreen = () => {
        if (!playerRef.current) return;
        if (!document.fullscreenElement) {
            playerRef.current.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    const renderInputScreen = () => (
        React.createElement('div', { className: 'w-full max-w-4xl mx-auto' },
            React.createElement('div', { className: 'text-center mb-8' },
                 React.createElement('h2', { className: "text-3xl font-bold text-slate-900 dark:text-brand-text" }, t.videoGenTitle),
                 React.createElement('p', { className: "text-slate-500 dark:text-brand-text-light mt-2" }, t.videoGenDescription)
            ),
            React.createElement('div', { className: 'bg-white dark:bg-card-gradient border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300' },
                React.createElement('div', { className: 'space-y-4' },
                    React.createElement('textarea', {
                        value: textInput,
                        onChange: e => setTextInput(e.target.value),
                        placeholder: t.videoGenInputPlaceholder,
                        className: 'w-full min-h-[10rem] p-3 bg-slate-100 dark:bg-input-gradient border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none resize-y hover:border-brand-blue/40 transition-all shadow-inner'
                    }),
                    React.createElement('div', null,
                        React.createElement('button', { onClick: () => fileInputRef.current?.click(), className: 'flex items-center gap-2 text-sm text-slate-500 dark:text-brand-text-light hover:text-slate-800 dark:hover:text-white transition-colors' },
                            React.createElement(UploadIcon, { className: "h-5 w-5" }),
                            fileInput ? fileInput.name : t.attachFile
                        ),
                        React.createElement('input', { type: 'file', ref: fileInputRef, onChange: e => setFileInput(e.target.files?.[0]), className: 'hidden', accept: '.pdf,.txt,.md' })
                    ),
                    React.createElement('div', null,
                        React.createElement('h3', { className: 'font-semibold text-lg mb-2 text-slate-800 dark:text-brand-text' }, t.videoGenOptionsTitle),
                        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4' },
                            ['duration', 'voice', 'orientation', 'style', 'language'].map(opt => 
                                React.createElement('select', { 
                                    key: opt,
                                    name: opt,
                                    value: config[opt],
                                    onChange: e => setConfig({...config, [e.target.name]: e.target.value }),
                                    className: 'w-full p-2 bg-slate-100 dark:bg-input-gradient border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-blue focus:outline-none transition-all hover:border-brand-blue/30'
                                },
                                    opt === 'duration' && [React.createElement('option', { key: 30, value: 30 }, '30s'), React.createElement('option', { key: 60, value: 60 }, '60s'), React.createElement('option', { key: 90, value: 90 }, '90s')],
                                    opt === 'voice' && [React.createElement('option', { key: 'Female' }, 'Female'), React.createElement('option', { key: 'Male' }, 'Male'), React.createElement('option', { key: 'Neutral' }, 'Neutral')],
                                    opt === 'orientation' && [React.createElement('option', { key: 'Landscape (16:9)' }, 'Landscape (16:9)'), React.createElement('option', { key: 'Portrait (9:16)' }, 'Portrait (9:16)')],
                                    opt === 'style' && [React.createElement('option', { key: 'Modern' }, 'Modern'), React.createElement('option', { key: 'Minimalist' }, 'Minimalist'), React.createElement('option', { key: 'Futuristic' }, 'Futuristic')],
                                    opt === 'language' && [
                                        React.createElement('option', { key: 'en', value: 'en' }, 'English'),
                                        React.createElement('option', { key: 'ar', value: 'ar' }, 'Arabic'),
                                        React.createElement('option', { key: 'fr', value: 'fr' }, 'French'),
                                        React.createElement('option', { key: 'de', value: 'de' }, 'German')
                                    ]
                                )
                            )
                        )
                    ),
                    error && React.createElement('p', { className: 'text-brand-red text-sm text-center animate-pulse' }, error),
                    React.createElement('button', {
                        onClick: handleGenerate,
                        className: 'w-full font-bold text-lg py-3 px-4 rounded-full transition-all bg-brand-red text-white hover:bg-red-500 shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50'
                    }, t.videoGenGenerateButton)
                )
            )
        )
    );

    const renderGenerationWorkspace = () => (
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-8 items-start' },
            // Left Panel: Options & Controls
            React.createElement('div', { className: 'lg:col-span-1 bg-white dark:bg-card-gradient border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xl lg:sticky lg:top-24' },
                React.createElement('h3', { className: 'font-semibold text-xl mb-3 text-slate-800 dark:text-brand-text border-b border-slate-200 dark:border-white/10 pb-2' }, t.videoGenOptionsTitle),
                React.createElement('div', { className: 'space-y-2 text-sm' },
                    React.createElement('div', { className: 'flex justify-between' }, React.createElement('strong', {className: 'text-slate-500 dark:text-brand-text-light'}, `${t.videoGenDuration}: `), React.createElement('span', { className: 'font-medium' }, config.duration, 's')),
                    React.createElement('div', { className: 'flex justify-between' }, React.createElement('strong', {className: 'text-slate-500 dark:text-brand-text-light'}, `${t.videoGenVoice}: `), React.createElement('span', { className: 'font-medium' }, config.voice)),
                    React.createElement('div', { className: 'flex justify-between' }, React.createElement('strong', {className: 'text-slate-500 dark:text-brand-text-light'}, `${t.videoGenOrientation}: `), React.createElement('span', { className: 'font-medium' }, config.orientation)),
                    React.createElement('div', { className: 'flex justify-between' }, React.createElement('strong', {className: 'text-slate-500 dark:text-brand-text-light'}, `${t.videoGenStyle}: `), React.createElement('span', { className: 'font-medium' }, config.style)),
                    React.createElement('div', { className: 'flex justify-between' }, React.createElement('strong', {className: 'text-slate-500 dark:text-brand-text-light'}, `Language: `), React.createElement('span', { className: 'font-medium' }, config.language.toUpperCase()))
                ),
                 React.createElement('div', { className: 'mt-6 pt-4 border-t border-slate-200 dark:border-white/10 space-y-2' },
                    React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                        React.createElement('button', { onClick: handleDownloadVideo, disabled: step !== 'preview', className: 'w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors' }, React.createElement(VideoIcon, null), 'Download'),
                        React.createElement('button', { onClick: handleShareVideo, disabled: step !== 'preview', className: 'w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors' }, React.createElement(ShareIcon, null), 'Share')
                    ),
                    React.createElement('button', { onClick: handleDownloadAssets, disabled: step !== 'preview', className: 'w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-brand-light-dark hover:bg-slate-300 dark:hover:bg-brand-blue text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50' }, React.createElement(DownloadIcon, null), t.videoGenDownloadAssets),
                    React.createElement('button', { onClick: handleReset, className: 'w-full bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors' }, t.videoGenNewVideo)
                )
            ),
            
            // Right Panel: Loading / Preview
            React.createElement('div', { ref: playerRef, className: 'lg:col-span-2' },
                 React.createElement('div', { 
                    className: `relative bg-white dark:bg-brand-light-dark rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 ${config.orientation.startsWith('Landscape') ? 'aspect-video' : 'aspect-[9/16] mx-auto max-w-sm lg:max-w-md'}` 
                },
                    step === 'loading' && React.createElement('div', { className: 'absolute inset-0 flex flex-col items-center justify-center text-center p-4' },
                        React.createElement(Spinner, { size: '12' }),
                        React.createElement('p', { className: 'mt-4 text-slate-500 dark:text-brand-text-light' }, loadingMessage)
                    ),
                    step === 'preview' && React.createElement(React.Fragment, null,
                        React.createElement('img', { 
                            key: currentSceneIndex, 
                            src: scenes[currentSceneIndex]?.imageUrl, 
                            className: `absolute inset-0 w-full h-full object-cover ${scenes[currentSceneIndex]?.animationClass}`,
                            style: { animationDuration: `${scenes[currentSceneIndex]?.duration || 4}s` }
                        }),
                        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent' }),
                        React.createElement('button', { onClick: toggleFullscreen, title: "Toggle Fullscreen", className: 'absolute top-4 right-4 text-white bg-black/30 p-2 rounded-full hover:bg-black/50 transition-colors z-20' },
                            isFullscreen ? React.createElement(ExitFullscreenIcon, null) : React.createElement(FullscreenIcon, null)
                        ),
                        React.createElement('div', { className: 'absolute bottom-0 left-0 right-0 p-4 text-white' },
                            React.createElement('div', { className: 'bg-black/30 backdrop-blur-md p-3 rounded-lg overflow-hidden' },
                                React.createElement('h3', { 
                                    key: `title-${currentSceneIndex}`,
                                    className: 'text-xl font-bold animate-slide-in-up' 
                                }, scenes[currentSceneIndex]?.title),
                                React.createElement('p', { 
                                    key: `takeaway-${currentSceneIndex}`,
                                    className: 'text-sm opacity-90 animate-slide-in-up',
                                    style: { animationDelay: '0.2s' }
                                }, scenes[currentSceneIndex]?.keyTakeaway)
                            )
                        ),
                        React.createElement('div', { className: 'absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md' },
                           React.createElement('div', { className: 'w-full h-1 bg-white/20 rounded-full mb-2' },
                               React.createElement('div', { className: 'h-1 bg-brand-red rounded-full', style: { width: `${((currentSceneIndex + 1) / scenes.length) * 100}%`, transition: 'width 0.3s' } })
                           ),
                           React.createElement('div', { className: 'flex justify-between items-center text-white' },
                               React.createElement('button', { onClick: handlePrevScene, disabled: currentSceneIndex === 0, className: 'disabled:opacity-50' }, React.createElement('svg', { xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" }, React.createElement('polygon', { points:"11 19 2 12 11 5 11 19" }), React.createElement('polygon', { points:"22 19 13 12 22 5 22 19" }))),
                               React.createElement('button', { onClick: handlePlayPause, className: 'w-12 h-12 flex items-center justify-center bg-white/20 rounded-full' }, 
                                    isPlaying ? React.createElement('svg', { xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" }, React.createElement('rect', { x:"6", y:"4", width:"4", height:"16" }), React.createElement('rect', { x:"14", y:"4", width:"4", height:"16" }))
                                    : isReplay ? React.createElement('svg', { xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" }, React.createElement('path', { d:"M21.5 2v6h-6M2.5 22v-6h6" }), React.createElement('path', { d:"M4.93 15c1.24.93 2.72 1.5 4.3 1.5 3.96 0 7.34-2.43 8.61-6" }), React.createElement('path', { d:"M19.07 9c-1.24-.93-2.72-1.5-4.3-1.5-3.96 0-7.34 2.43-8.61 6" }))
                                    : React.createElement('svg', { xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" }, React.createElement('polygon', { points:"5 3 19 12 5 21 5 3" }))
                               ),
                               React.createElement('button', { onClick: handleNextScene, disabled: isReplay, className: 'disabled:opacity-50' }, React.createElement('svg', { xmlns:"http://www.w3.org/2000/svg", width:"24", height:"24", viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"2", strokeLinecap:"round", strokeLinejoin:"round" }, React.createElement('polygon', { points:"13 19 22 12 13 5 13 19" }), React.createElement('polygon', { points:"2 19 11 12 2 5 2 19" }))),
                           ),
                           React.createElement('p', { className: 'text-center text-xs text-white/70 mt-1' }, `${t.videoGenScene} ${currentSceneIndex + 1} / ${scenes.length}`)
                        )
                    )
                )
            )
        )
    );

    return React.createElement('div', { className: 'min-h-[calc(100vh-200px)] flex flex-col justify-center' },
      encodingProgress.active && React.createElement('div', { className: 'fixed inset-0 bg-black/80 z-50 flex flex-col justify-center items-center backdrop-blur-sm' },
        React.createElement('div', { className: 'w-full max-w-md text-center' },
            React.createElement(Spinner, { size: '12' }),
            React.createElement('p', { className: 'mt-4 text-slate-500 dark:text-brand-text-light mb-2' }, encodingProgress.message),
            React.createElement('div', { className: 'w-full bg-white/10 rounded-full h-2.5' },
                React.createElement('div', { className: 'bg-brand-red h-2.5 rounded-full', style: { width: `${encodingProgress.progress * 100}%` } })
            ),
            React.createElement('p', { className: 'text-sm text-slate-500 dark:text-brand-text-light mt-1' }, `${(encodingProgress.progress * 100).toFixed(0)}%`)
        )
      ),
      step === 'input' ? renderInputScreen() : renderGenerationWorkspace()
    );
};

export default InfographicVideoGenerator;
