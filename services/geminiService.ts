

import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
  console.error("Gemini API key is not configured. Please add your key to env.js");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

export const isApiKeyConfigured = !!API_KEY && API_KEY !== 'YOUR_API_KEY_HERE';

// FIX: Explicitly type the Promise to resolve with a string and cast reader.result to string.
// This resolves errors related to 'split' not existing on ArrayBuffer and ensures the
// data passed to the Gemini API is correctly typed as a string.
const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const createChatSession = () => {
    return ai.chats.create({
        model: textModel,
    });
};

export const sendMessageStream = async (chat, message, file) => {
    if (file) {
        const filePart = await fileToGenerativePart(file);
        // For chat sessions, the `message` property can be an array of parts for multimodal input.
        return chat.sendMessageStream({ message: [filePart, { text: message }] });
    } else {
        return chat.sendMessageStream({ message: message });
    }
};


export const findRelatedPapers = async (topic) => {
    const prompt = `Find 5 recent and highly-cited academic papers on the topic: "${topic}". For each paper, provide the title, all authors, publication year, a brief one-sentence summary, and a direct URL to the paper if available.`;

    const result = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    
    const sources = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = result.text;

    // A simple parser to extract paper details from the text response.
    // This could be improved with a more robust parsing strategy or by using JSON mode if the model supported it with search.
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

export const generatePrompt = async (topic, language) => {
  const langInstruction = language === 'ar' 
    ? "أنت مهندس أفكار خبير. قم بتوسيع الموضوع التالي إلى فكرة مفصلة ومثيرة للذكاء الاصطناعي التوليدي. يجب أن تكون الاستجابة باللغة العربية." 
    : "You are an expert prompt engineer. Expand the following topic into a detailed and evocative prompt for a generative AI. The response should be in English.";

  const result = await ai.models.generateContent({
    model: textModel,
    contents: topic,
    config: {
        systemInstruction: langInstruction
    }
  });
  return result.text;
};

export const redesignImage = async (file, roomType, style) => {
  const imagePart = await fileToGenerativePart(file);
  const prompt = `This is a photo of a ${roomType}. Completely redesign it in a ${style} style. Maintain the original room layout, camera angle, and perspective. The output must be a photorealistic image.`;

  const result = await ai.models.generateContent({
    model: imageModel,
    contents: {
        parts: [imagePart, { text: prompt }],
    },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  for (const part of result.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
  }

  throw new Error("No image was generated.");
};