

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { LANGUAGES, CONTENT_TYPES, TONES } from "../constants.js";

// --- API Key and Client Management ---

const getApiKey = (envVarName) => {
    const keysRaw = window.process?.env?.[envVarName];
    if (!keysRaw) return undefined;
    const keys = keysRaw.split(',').map(k => k.trim()).filter(k => k);
    if (keys.length === 0) return undefined;
    return keys[Math.floor(Math.random() * keys.length)];
};

const geminiApiKey = getApiKey('API_KEY');

const otherApiKeys = {
  openai: getApiKey('OPENAI_API_KEY'),
};

const isValidKey = (key) => !!key && !key.startsWith('YOUR_');
const isGeminiConfigured = () => isValidKey(geminiApiKey);

export const isModelConfigured = (modelId) => {
    if (modelId.startsWith('gemini')) {
        return isGeminiConfigured();
    }
    if (modelId.startsWith('openai')) {
        return isValidKey(otherApiKeys.openai);
    }
    return isValidKey(otherApiKeys[modelId]);
};

export const isAnyModelConfigured = () => {
    return isGeminiConfigured() || Object.values(otherApiKeys).some(isValidKey);
};

const geminiClient = isGeminiConfigured() ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const textModel = 'gemini-2.5-flash';
const advancedTextModel = 'gemini-2.5-pro';
const imageModel = 'gemini-2.5-flash-image';

// Legacy export for backward compatibility
export const isApiKeyConfigured = isAnyModelConfigured();
export const isImageApiKeyConfigured = isModelConfigured('openai-image');

// --- Helper Functions ---

const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

// --- Generic API Handlers ---

async function generateText(prompt, systemInstruction) {
    if (!isModelConfigured('gemini')) {
        throw new Error(`API Key for model Gemini is not configured.`);
    }
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    
    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { systemInstruction }
    });
    return result.text;
}


// --- Chat Management ---

export const createChatSession = () => {
    if (geminiClient) {
        return geminiClient.chats.create({ model: textModel });
    }
    return null;
};

export const sendMessageStream = async (chat, message, file) => {
    // This function is now Gemini-specific due to streaming nature
    const messageParts = [{ text: message }];
    if (file) {
        const filePart = await fileToGenerativePart(file);
        messageParts.unshift(filePart);
    }
    return chat.sendMessageStream({ message: messageParts });
};

export const sendChatMessage = async (chatSession, message, file, useWebSearch) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    
    const messageParts = [{ text: message }];
    if (file) {
        messageParts.unshift(await fileToGenerativePart(file));
    }

    if (useWebSearch) {
        const result = await geminiClient.models.generateContent({
            model: textModel,
            contents: { parts: messageParts },
            config: { tools: [{ googleSearch: {} }] },
        });
        return { text: result.text, sources: result.candidates?.[0]?.groundingMetadata?.groundingChunks || [], isStream: false };
    } else {
        const stream = await chatSession.sendMessageStream({ message: messageParts });
        return { stream, isStream: true };
    }
};


// --- Service-Specific Functions (Refactored) ---

export const findRelatedPapers = async (topic) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    const prompt = `Find 5 recent and highly-cited academic papers on the topic: "${topic}". For each paper, provide the title, all authors, publication year, a brief one-sentence summary, and a direct URL to the paper if available.`;

    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
    });
    
    const sources = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = result.text;
    const papers = [];
    const paperBlocks = text.split(/\d+\.\s+/).filter(block => block.trim() !== '');

    for (const block of paperBlocks) {
        const titleMatch = block.match(/Title:\s*(.*?)\n/);
        const authorsMatch = block.match(/Authors?:\s*(.*?)\n/);
        const yearMatch = block.match(/Year:\s*(\d{4})/);
        const summaryMatch = block.match(/Summary:\s*(.*?)\n/);
        const linkMatch = block.match(/URL:\s*(https?:\/\/[^\s]+)/);

        if (titleMatch && authorsMatch && yearMatch && summaryMatch) {
            papers.push({
                title: titleMatch[1].trim(),
                authors: authorsMatch[1].split(',').map(a => a.trim()),
                year: parseInt(yearMatch[1], 10),
                summary: summaryMatch[1].trim(),
                link: linkMatch ? linkMatch[1].trim() : '#',
            });
        }
    }
    return { papers, sources };
};

export const generatePrompt = async (topic, language, type = 'advanced') => {
  let systemInstruction;

  switch (type) {
    case 'simple':
        systemInstruction = language === 'ar'
          ? `أنت مهندس أوامر. مهمتك هي تحويل موضوع بسيط يقدمه المستخدم إلى أمر واضح واحترافي وفعال للذكاء الاصطناعي التوليدي. اتبع هذه المبادئ: 1. حدد المهمة بوضوح. 2. حدد التنسيق المطلوب. 3. قدم السياق. 4. استخدم لغة دقيقة. يجب أن يكون الأمر النهائي فقرة واحدة قصيرة وألا يتجاوز 90 كلمة. لا تستخدم علامات النجمة (*) أو أي تنسيق ماركداون. يجب أن تحتوي الاستجابة على نص الأمر فقط. يجب أن يكون الأمر الناتج باللغة العربية.`
          : `You are a prompt engineer. Your task is to transform a simple user topic into a clear, professional, and effective prompt for a generative AI. Follow these principles: 1. Define the Task Clearly. 2. Specify the Format. 3. Provide Context. 4. Use Precise Language. The final prompt must be a single, short paragraph and no more than 90 words. Do not use asterisks (*) or any markdown formatting. The entire response must be ONLY the generated prompt text. The output prompt must be in English.`;
        break;
    case 'image':
        systemInstruction = language === 'ar'
          ? `أنت مهندس أوامر خبير في توليد الصور بالذكاء الاصطناعي. قم بتحويل موضوع المستخدم إلى أمر مفصل واحترافي. اتبع هذا الهيكل: 1. الدور والسياق (الغرض). 2. وصف الموضوع (المظهر، العواطف، الإجراءات). 3. النمط والحالة المزاجية (فوتوغرافي، كرتوني، درامي) وموضوعات الألوان. 4. التكوين والمنظور (لقطة مقربة، زاوية واسعة). 5. مواصفات الإخراج (الدقة، نسبة العرض إلى الارتفاع). 6. القيود (ما يجب تضمينه أو تجنبه). يجب أن يكون الأمر النهائي فقرة واحدة جيدة التنظيم. يجب أن تحتوي الاستجابة على نص الأمر فقط. يجب أن يكون الأمر الناتج باللغة العربية.`
          : `You are an expert prompt engineer for AI image generation. Transform a user topic into a detailed, professional prompt. Follow this structure: 1. Role & Context (purpose). 2. Subject Description (appearance, emotions, actions). 3. Style and Mood (photorealistic, cartoon, dramatic) and color themes. 4. Composition & Perspective (close-up, wide-angle). 5. Output Specifications (resolution, aspect ratio). 6. Constraints (what to include or avoid). The final prompt must be a single, well-structured paragraph. The entire response must be ONLY the generated prompt text. The output prompt must be in English.`;
        break;
    case 'video':
        systemInstruction = language === 'ar'
          ? `أنت مهندس أوامر خبير في توليد الفيديو بالذكاء الاصطناعي. قم بتحويل موضوع المستخدم إلى أمر مفصل واحترافي. اتبع هذا الهيكل: 1. الدور والسياق (الغرض من الفيديو). 2. وصف المشهد (الإعداد، الشخصيات، الإجراءات الرئيسية). 3. النمط البصري والمؤثرات (رسوم متحركة، سينمائي، تدرج لوني). 4. الصوت والحالة المزاجية (موسيقى خلفية، مؤثرات صوتية). 5. مواصفات الإخراج (المدة، الدقة). 6. القيود (ألوان العلامة التجارية، ما يجب تجنبه). يجب أن يكون الأمر النهائي فقرة واحدة جيدة التنظيم. يجب أن تحتوي الاستجابة على نص الأمر فقط. يجب أن يكون الأمر الناتج باللغة العربية.`
          : `You are an expert prompt engineer for AI video generation. Transform a user topic into a detailed, professional prompt. Follow this structure: 1. Role & Context (purpose of the video). 2. Scene Description (setting, characters, key actions). 3. Visual Style & Effects (animated, cinematic, color grading). 4. Audio and Mood (background music, sound effects). 5. Output Specifications (length, resolution). 6. Constraints (brand colors, what to avoid). The final prompt must be a single, well-structured paragraph. The entire response must be ONLY the generated prompt text. The output prompt must be in English.`;
        break;
    case 'advanced':
    default:
        systemInstruction = language === 'ar'
          ? `أنت مهندس أوامر خبير. قم بتوسيع موضوع المستخدم إلى أمر مفصل ومنظم. اتبع هذا النهج: 1. الشخصية والدور. 2. مهمة واضحة (مقسمة إلى خطوات إذا كانت معقدة). 3. السياق والتفاصيل (الجمهور، النبرة). 4. القيود والمتطلبات (عدد الكلمات، النمط). 5. الهيكل (استخدم علامات لفصل التعليمات). 6. المتغيرات (استخدم {عناصر نائبة}). يجب أن يكون الأمر النهائي منظمًا ومفصلاً وألا يتجاوز 270 كلمة. لا تستخدم علامات النجمة (*) أو أي تنسيق ماركداون. يجب أن تحتوي الاستجابة على نص الأمر فقط. يجب أن يكون الأمر الناتج باللغة العربية.`
          : `You are an expert prompt engineer. Expand a user topic into a detailed, structured prompt. Use this approach: 1. Persona and Role. 2. Clear Task (break down if complex). 3. Context and Details (audience, tone). 4. Constraints and Requirements (word count, style). 5. Structure (use markers to separate instructions). 6. Variables (use {placeholders}). The final prompt must be well-structured, detailed, and no more than 270 words. Do not use asterisks (*) or any markdown formatting. The entire response must be ONLY the generated prompt text. The output prompt must be in English.`;
        break;
  }
  return generateText(topic, systemInstruction);
};

export const checkPrompt = async (prompt, language) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");

    const systemInstruction = language === 'ar'
    ? `أنت خبير في هندسة الأوامر للذكاء الاصطناعي. مهمتك هي تحليل موجه المستخدم بدقة وتقديم ملاحظات منظمة.

    اتبع هذه الخطوات بالضبط:
    1.  **تحليل الموجه:** راجع الصياغة والسياق لتقييم وضوح الهدف. قدم ملخصًا موجزًا في حقل "analysis".
    2.  **تحديد المشكلات:** اكتشف بدقة أي أخطاء أو غموض أو مجالات للتحسين في الموجه. لكل مشكلة، قدم وصفًا موجزًا للمشكلة في "issue" وشرحًا لتأثيرها على النتائج في "explanation". ضعها في مصفوفة "issues".
    3.  **تقييم المستوى:** قدم تقييمًا دقيقًا لمستوى جودة الموجه (على سبيل المثال، "مبتدئ"، "متوسط"، "متقدم"، "خبير"). ضع هذا في حقل "qualityLevel".
    4.  **ملخص التقييم:** اكتب تقييمًا عامًا من جملة واحدة لجودة الموجه في حقل "assessment".
    5.  **تحسين الموجه:** قدم نسخة احترافية جديدة ومحسنة من الموجه تكون جاهزة للاستخدام. يجب أن تكون هذه النسخة مفصلة ومنظمة جيدًا. ضعها في حقل "enhancedPrompt".
    
    يجب أن يكون الإخراج كائن JSON صالحًا فقط.`
    : `You are an expert AI prompt engineer. Your task is to meticulously analyze a user's prompt and provide structured feedback.

    Follow these steps exactly:
    1.  **Prompt Analysis:** Review the wording and context to assess goal clarity. Provide a brief summary in the "analysis" field.
    2.  **Issue Identification:** Accurately detect any errors, ambiguities, or areas for improvement in the prompt. For each issue, provide a brief description of the problem in "issue" and an explanation of its impact on the results in "explanation". Place these in an "issues" array.
    3.  **Level Assessment:** Provide an accurate assessment of the prompt's quality level (e.g., "Beginner", "Intermediate", "Advanced", "Expert"). Put this in the "qualityLevel" field.
    4.  **Assessment Summary:** Write a one-sentence overall assessment of the prompt's quality in the "assessment" field.
    5.  **Prompt Enhancement:** Provide a new, professional, and enhanced version of the prompt that is ready to use. This should be detailed and well-structured. Put this in the "enhancedPrompt" field.
    
    The output must be a valid JSON object only.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            analysis: {
                type: Type.STRING,
                description: "A brief analysis of the user's prompt."
            },
            issues: {
                type: Type.ARRAY,
                description: "An array of identified issues in the prompt.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        issue: { type: Type.STRING, description: "The title of the issue." },
                        explanation: { type: Type.STRING, description: "Explanation of the issue and its impact." }
                    }
                }
            },
            qualityLevel: {
                type: Type.STRING,
                description: "The assessed quality level of the prompt (e.g., Beginner, Intermediate, Advanced)."
            },
            assessment: {
                type: Type.STRING,
                description: "A one-sentence summary of the prompt's quality."
            },
            enhancedPrompt: {
                type: Type.STRING,
                description: "A new, professionally enhanced version of the prompt."
            }
        },
        required: ["analysis", "issues", "qualityLevel", "assessment", "enhancedPrompt"]
    };

    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
        }
    });

    let jsonText = result.text.trim().replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse prompt check JSON:", e, "Raw text:", jsonText);
        throw new Error("Failed to get structured analysis from AI.");
    }
};

export const redesignImage = async (file, roomType, style) => {
    if (!isModelConfigured('openai-image')) {
        throw new Error(`API key for model OpenAI is not configured.`);
    }

    if (!file) throw new Error("An image file is required for the OpenAI Vision model.");
    
    // Step 1: Analyze the image with GPT-4 Vision to get a description.
    const base64Image = await fileToBase64(file);
    const visionPrompt = `You are an expert scene descriptor. Analyze this image of a ${roomType}. Provide a detailed, factual description of the room's layout, perspective, key furniture, windows, doors, and lighting. Do not suggest any changes. Just describe what is there. This description will be used to recreate the scene.`;
    
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${otherApiKeys.openai}`
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: visionPrompt },
                    { type: 'image_url', image_url: { url: base64Image } }
                ]
            }],
            max_tokens: 400,
        })
    });

    if (!visionResponse.ok) {
        const errorData = await visionResponse.json();
        console.error("OpenAI Vision API error:", errorData);
        throw new Error(`OpenAI Vision API error: ${errorData.error?.message || visionResponse.statusText}`);
    }
    const visionData = await visionResponse.json();
    const roomDescription = visionData.choices[0].message.content;

    // Step 2: Use the description to generate a new image with DALL-E 3.
    const redesignPrompt = `A photorealistic photo of a ${roomType} redesigned in a ${style} style. The original room layout is as follows: "${roomDescription}". Maintain the same perspective and general layout but apply the new style throughout. The final image should be a high-quality, realistic photograph.`;

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${otherApiKeys.openai}`
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt: redesignPrompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json'
        })
    });

    if (!dalleResponse.ok) {
        const errorData = await dalleResponse.json();
        console.error("OpenAI DALL-E API error:", errorData);
        throw new Error(`OpenAI DALL-E API error: ${errorData.error?.message || dalleResponse.statusText}`);
    }

    const dalleData = await dalleResponse.json();
    const b64Json = dalleData.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${b64Json}`;

    return { type: 'image', content: imageUrl };
};


export const translateText = async (text, sourceLangCode, targetLangCode) => {
    const sourceLang = LANGUAGES.find(l => l.code === sourceLangCode);
    const targetLang = LANGUAGES.find(l => l.code === targetLangCode);
    if (!sourceLang || !targetLang) throw new Error("Invalid language selected.");

    const systemInstruction = `You are an expert multilingual translator. Your task is to translate the user's text from ${sourceLang.name} to ${targetLang.name}.
Provide a high-quality, nuanced translation that is context-aware.
CRITICAL: Your response must contain ONLY the translated text. Do not add any introductory phrases, explanations, or any other text outside of the translation itself.`;

    return generateText(text, systemInstruction);
};

export const extractTextFromFile = async (file) => {
    if (file.type.startsWith('image/')) {
        if (!isModelConfigured('gemini')) {
            throw new Error(`API Key for model Gemini is not configured.`);
        }
        if (!geminiClient) throw new Error("Gemini client not initialized.");
        
        const imagePart = await fileToGenerativePart(file);
        const textPart = { text: "Extract all text from this image. If there is no text, return an empty response." };

        const result = await geminiClient.models.generateContent({
            model: textModel, // 'gemini-2.5-flash' supports multimodal
            contents: { parts: [imagePart, textPart] }
        });
        return result.text;
    } else if (file.type === 'application/pdf') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(item => item.str).join(' ');
                    }
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
        return file.text();
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        alert("Sorry, .docx file processing is not yet supported. Please copy/paste the text or save as PDF.");
        return Promise.reject("DOCX not supported yet.");
    } else {
        throw new Error(`Unsupported file type: ${file.type}`);
    }
};

export const paraphraseText = async (text, mode, language) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    const langName = language === 'ar' ? 'Arabic' : 'English';
    const systemInstruction = `You are an expert rephrasing tool. Your specific task is to rewrite the provided text according to the '${mode}' mode. The core meaning must be preserved.
- If mode is 'standard', provide a clear and correct alternative.
- If mode is 'fluent', improve the flow and word choice.
- If mode is 'formal', use professional and academic language.
- If mode is 'simple', make it very easy to understand.
- If mode is 'creative', use imaginative and original phrasing.
CRITICAL: Your entire response must be ONLY a raw JSON array of strings. Do not add any introductory text, explanations, markdown formatting, or any characters outside of the JSON structure.
Provide at least one and up to three rewritten variations. The language of the output must be ${langName}.`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING,
            description: `A rewritten version of the text in a ${mode} style.`
        }
    };

    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: text,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
        }
    });

    let jsonText = result.text.trim().replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
    try {
        const parsed = JSON.parse(jsonText);
        // Ensure it's an array of strings
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
            return parsed;
        }
        console.error("Parsed JSON is not an array of strings:", parsed);
        throw new Error("Invalid data format from AI.");
    } catch (e) {
        console.error("Failed to parse paraphrasing JSON:", e, "Raw text:", jsonText);
        throw new Error("Failed to get structured paraphrasing output from AI.");
    }
};

export const generateContent = async (topic, contentTypeId, toneId, language) => {
    const langName = language === 'ar' ? 'Arabic' : 'English';
    const contentType = CONTENT_TYPES.find(c => c.id === contentTypeId)?.[language] || contentTypeId;
    const tone = TONES.find(t => t.id === toneId)?.[language] || toneId;

    const systemInstruction = `You are an expert content creator. Your task is to generate a well-written '${contentType}' with a '${tone}' tone of voice.
The content should be engaging, informative, and relevant to the provided topic.
The language of the output must be ${langName}.
CRITICAL: Your response must contain ONLY the generated content as a raw string. Format it with markdown where appropriate (e.g., headings, lists). Do not add any introductory phrases like "Here is the content you requested:".`;
    
    return generateText(topic, systemInstruction);
};

export const humanizeText = async (text, mode, language) => {
    const langName = language === 'ar' ? 'Arabic' : 'English';
    const systemInstruction = `You are an expert text rewriter. Your task is to rewrite the user's text based on the mode: '${mode}'.
- 'formal': Rephrase in a sophisticated, professional way.
- 'simple': Make it very easy to understand.
- 'creative': Use original and innovative phrasing.
- 'academic': Use technical and scholarly language.
- 'expand': Increase the length and detail of the text.
- 'shorten': Convey the meaning more concisely.
- 'humanize': Rewrite AI-generated text to sound more natural, authentic, and less robotic.
CRITICAL: The output must be ONLY the rewritten text. Do not add explanations or introductory phrases. The language of the output must be ${langName}.`;
    return generateText(text, systemInstruction);
};

export const generateSpeech = async (text, voicePreference = 'Female') => {
    if (!isModelConfigured('gemini')) {
        throw new Error(`API Key for model Gemini is not configured.`);
    }
    if (!geminiClient) throw new Error("Gemini client not initialized.");

    // Strip markdown symbols and quotes for a cleaner speech output.
    const cleanedText = text.replace(/(\*\*|__|`|\*|~|#)/g, '').replace(/"/g, '');

    if (!cleanedText.trim()) {
        throw new Error("Input text is empty after cleaning.");
    }

    let voiceName = 'Kore'; // Default to a female voice (Kore)
    if (voicePreference === 'Male') {
        voiceName = 'Fenrir';
    } else if (voicePreference === 'Neutral') {
        voiceName = 'Puck';
    }

    try {
        const response = await geminiClient.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanedText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (e) {
        console.error("Gemini TTS API error:", e);
        throw new Error(`Failed to generate speech: ${e.message || 'Unknown API error'}`);
    }
};

export const generateResearchContent = async (topic, templateId, language) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    const templates = { research_proposal: { en: "...", ar: "..." } }; // Simplified for brevity
    const systemInstruction = templates[templateId]?.[language];
    if (!systemInstruction) throw new Error(`Invalid template or language`);
    return await geminiClient.models.generateContentStream({
        model: textModel,
        contents: topic,
        config: { systemInstruction },
    });
};

export const generatePresentationOutline = async ({ method, content, slideCount, language, amount }) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");

    const amountInstructions = {
        minimal: "Keep content points extremely brief, ideally 1-5 words per point. Use keywords and short phrases.",
        concise: "Keep content points concise, typically a short phrase or sentence fragment around 5-10 words.",
        detailed: "Provide detailed bullet points, forming complete but succinct sentences, around 10-20 words each.",
        extensive: "Provide comprehensive, multi-sentence, or even short paragraph-like bullet points, with 20+ words."
    };

    const systemInstruction = `You are an expert presentation creator. Your task is to generate a comprehensive and structured outline for a presentation. The output must be a valid JSON object. The language of the content should be ${LANGUAGES.find(l => l.code === language)?.name || 'English'}.
${amountInstructions[amount] || amountInstructions['concise']}
The JSON object must have a key "slides" which is an array of objects. Each slide object must contain:
- "slideNumber" (integer)
- "title" (string, a concise title for the slide)
- "type" (string, can be one of: 'title_slide', 'introduction', 'agenda', 'section_header', 'content', 'summary', 'q_and_a', 'conclusion')
- "content" (an array of strings, with each string being a bullet point for the slide)

IMPORTANT: The second slide (slideNumber: 2) MUST be an 'agenda' or 'table_of_contents' slide, listing the main topics or sections that will be covered in the following slides.

CRITICAL: Your entire response must be ONLY the raw JSON object. Do not add any other text, comments, or markdown formatting. All keys and string values in the JSON must be enclosed in double quotes.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            slides: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        slideNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        type: { type: Type.STRING },
                        content: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["slideNumber", "title", "type", "content"]
                }
            }
        },
        required: ["slides"]
    };

    let prompt = `Please create a presentation outline with approximately ${slideCount} slides.\n`;
    switch (method) {
        case 'prompt':
            prompt += `The presentation topic is: "${content}"`;
            break;
        case 'text':
            prompt += `The presentation is based on the following text content. Summarize and structure this content into a presentation outline:\n"""\n${content}\n"""`;
            break;
        case 'import': // Simplified for file/URL
            prompt += `The presentation is based on the content from the following source. Analyze, summarize, and structure it into a presentation outline:\n"""\n${content}\n"""`;
            break;
        default:
            throw new Error('Invalid presentation creation method');
    }

    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { 
            systemInstruction, 
            responseMimeType: 'application/json',
            responseSchema
        }
    });

    let text = result.text.trim();
    text = text.replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
    
    const firstChar = text.indexOf('{');
    const lastChar = text.lastIndexOf('}');
    if (firstChar !== -1 && lastChar > firstChar) {
        text = text.substring(firstChar, lastChar + 1);
    }
    
    return text;
};

export const generateFullPresentationContent = async (outlineJson, language, amount) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    
    const amountInstructions = {
        minimal: "Expand on the bullet points very briefly. Use short phrases and keywords. Paragraphs should be 1-2 sentences max.",
        concise: "Expand on the bullet points concisely. Paragraphs should be 2-3 short sentences. Keep it direct and to the point.",
        detailed: "Expand on the bullet points with detailed explanations. Paragraphs can be 3-5 sentences long, providing good context and information.",
        extensive: "Expand on the bullet points comprehensively. Write detailed, multi-sentence paragraphs for each point, exploring the topic in depth."
    };

    const systemInstruction = `You are an expert presentation content writer. Your task is to expand a given presentation outline into full, engaging slide content. The output must be a valid JSON object, mirroring the input structure. The language of the content must be ${LANGUAGES.find(l => l.code === language)?.name || 'English'}.
When expanding the content, adhere to the following verbosity level: ${amountInstructions[amount] || amountInstructions['concise']}

For each slide object in the input, you must:
1.  Keep the original "slideNumber", "title", and "type".
2.  Add a new key "speakerNotes" (string) containing concise, helpful notes for the presenter for that slide.
3.  For the "content" key, create a rich and varied array of content block objects. Each object must have a "type" key. Use a mix of types to make the slides visually interesting and easy to understand. Supported types are:
    - 'paragraph': For a block of text. The object must also have a "text" key (string).
    - 'bullet': For a standard bullet point. The object must also have a "text" key (string).
    - 'table': To display structured data. The object must also have "headers" (an array of strings) and "rows" (an array of arrays of strings).
    - 'visual_suggestion': For suggesting a visual element. The object must have a "description" key (string). Describe icons, diagrams, photos, or **charts** (e.g., "A bar chart comparing sales figures across three regions" or "A line graph showing user growth over the last year").
    - 'infographic_point': For a key statistic or data point. Use this for impactful numbers. The object must have "title" (string), "value" (string, e.g., '75%' or '3.5x'), and "description" (string).

CRITICAL: Aim for a good variety of content blocks on each slide where appropriate. Don't use only paragraphs and bullets. Incorporate tables, infographic points, and visual suggestions to break up text. Your entire response must be ONLY the raw JSON object. Do not add any other text, comments, or markdown formatting. All keys and string values in the JSON must be enclosed in double quotes.`;

    const prompt = `Based on the following presentation outline, please generate the full content and speaker notes for each slide. The content verbosity should be '${amount}':\n\n${outlineJson}`;

    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { systemInstruction, responseMimeType: 'application/json' }
    });

    let text = result.text.trim();
    text = text.replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
    
    const firstChar = text.indexOf('{');
    const lastChar = text.lastIndexOf('}');
    if (firstChar !== -1 && lastChar > firstChar) {
        text = text.substring(firstChar, lastChar + 1);
    }
    
    return text;
};


export const analyzeData = async (fileContent, outputType) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");

    let systemInstruction = "You are a data analysis expert. Analyze the following document content and generate the requested output.";
    let prompt = `Document Content:\n"""\n${fileContent}\n"""\n\n`;
    let responseMimeType = undefined;

    switch (outputType) {
        case 'visualization':
            prompt += "Analyze the data and identify important relationships or trends to visualize. Generate one or more appropriate charts (e.g., bar, line, pie) to represent these insights. If you are creating a bar chart with more than 7 categories, you MUST make it a horizontal bar chart by setting 'indexAxis': 'y' in the options. This is crucial for readability. Format the output as a valid JSON array, where each object in the array represents a single chart configuration suitable for Chart.js. Each object MUST include a 'description' (a string explaining the chart's insight), 'type', 'data' (with 'labels' and 'datasets'), and 'options' properties. Ensure 'datasets' is an array of objects, each with a 'label' and 'data' array. For pie or doughnut charts, configure the `options.plugins.tooltip.callbacks.label` to show both the label and the percentage. Choose colors that are visually appealing. CRITICAL: Your entire response must be ONLY the raw JSON array. Do not add any other text, comments, or markdown formatting. All keys and string values in the JSON must be enclosed in double quotes.";
            responseMimeType = 'application/json';
            break;
        case 'infographic':
            prompt += "Summarize the key information in the document into content for an infographic. Provide a main title, a short one-sentence summary, and 5-7 key data points. For each data point, provide a short title, a statistic or key fact, and a brief explanation. Format the output as a valid JSON object with 'title', 'summary', and 'points' (an array of objects, each with 'pointTitle', 'statistic', and 'explanation'). CRITICAL: Your entire response must be ONLY the raw JSON object. Do not add any other text, comments, or markdown formatting. All keys and string values in the JSON must be enclosed in double quotes.";
            responseMimeType = 'application/json';
            break;
        case 'flowchart':
            prompt += "Analyze the document for any processes, sequences, or workflows. Create a flowchart representing the main process identified. The output must be ONLY the valid Mermaid.js graph syntax. Do not add any other text, comments, or markdown formatting. The response must start with `graph TD;`. CRITICAL: All text inside nodes AND on links must be enclosed in double quotes. For example: A[\"Start\"] -- \"User Action\" --> B{\"Is this a valid backup?\"};";
            break;
        default:
            throw new Error(`Unknown analysis output type: ${outputType}`);
    }

    const result = await geminiClient.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { systemInstruction, responseMimeType }
    });
    
    let text = result.text.trim();
    
    text = text.replace(/^```(?:json|mermaid)?\s*/, '').replace(/\s*```\s*$/, '');
    
    if (outputType === 'visualization' || outputType === 'infographic') {
        const startChar = outputType === 'visualization' ? '[' : '{';
        const endChar = outputType === 'visualization' ? ']' : '}';
        const firstChar = text.indexOf(startChar);
        const lastChar = text.lastIndexOf(endChar);
        if (firstChar !== -1 && lastChar > firstChar) {
            text = text.substring(firstChar, lastChar + 1);
        }
    } else if (outputType === 'flowchart') {
        const graphIndex = text.indexOf('graph');
        if (graphIndex !== -1) {
            text = text.substring(graphIndex);
        }
    }

    return text;
};

// --- Infographic Video Generator Functions ---

export const generateVideoScript = async (text, config, language) => {
    if (!geminiClient) throw new Error("Gemini client not initialized.");
    
    const getLanguageName = (langCode) => {
        switch(langCode) {
            case 'ar': return 'Arabic';
            case 'fr': return 'French';
            case 'de': return 'German';
            case 'en':
            default:
                return 'English';
        }
    };
    
    const systemInstruction = `You are an expert at creating short, engaging infographic video scripts from dense text. Analyze the provided document content and create a script based on the user's configuration. The language of the output content must be ${getLanguageName(language)}.

**Instructions:**
1. Distill the core message and key data points from the text.
2. Structure the content into a logical narrative with an introduction, main points, and a conclusion.
3. Based on the duration, create a script with an appropriate number of scenes (e.g., a 60-second video should have about 4-6 scenes).
4. For each scene, provide a short, impactful title and a key takeaway sentence.
5. For each scene, write a voiceover script. The script should be clear, concise, and engaging.
6. For each scene, create a detailed, descriptive visual prompt suitable for an AI image generator. The prompt should describe a visually appealing infographic-style image that represents the scene's content, matching the user's selected style.
7. The final output MUST be a valid JSON object. Do not include any text, markdown, or comments outside of the JSON structure.
`;
    
    const prompt = `
**Configuration:**
- Video Duration: ${config.duration} seconds
- Video Style: ${config.style}
- Language: ${getLanguageName(language)}

**Input Text:**
"""
${text}
"""
`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            scenes: {
                type: Type.ARRAY,
                description: "An array of scene objects for the video.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        sceneNumber: { type: Type.INTEGER, description: "The sequence number of the scene." },
                        title: { type: Type.STRING, description: "A short, impactful title for the scene." },
                        keyTakeaway: { type: Type.STRING, description: "A single, concise key takeaway sentence for the scene." },
                        script: { type: Type.STRING, description: "The voiceover script for this scene." },
                        visualPrompt: { type: Type.STRING, description: "A detailed prompt for an AI image generator to create the visual for this scene." }
                    },
                    required: ["sceneNumber", "title", "keyTakeaway", "script", "visualPrompt"]
                }
            }
        },
        required: ["scenes"]
    };

    const result = await geminiClient.models.generateContent({
        model: advancedTextModel,
        contents: prompt,
        config: { 
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema
        }
    });

    let jsonText = result.text.trim().replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
    return jsonText;
};

export const generateInfographicImage = async (visualPrompt, style) => {
    if (!isModelConfigured('gemini')) throw new Error("Gemini client not initialized.");

    const fullPrompt = `A visually appealing infographic-style image. Style: ${style}. Clean, modern aesthetic with vibrant accent colors. The image should be a high-quality, professional graphic representing the following concept: "${visualPrompt}"`;

    const response = await geminiClient.models.generateContent({
        model: imageModel,
        contents: { parts: [{ text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data; // This is the base64 encoded string
        }
    }
    throw new Error("No image data received from API.");
};
