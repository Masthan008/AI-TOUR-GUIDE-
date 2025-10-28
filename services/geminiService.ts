import { GoogleGenAI, Modality } from "@google/genai";
import { GroundingSource } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function recognizeLandmark(mimeType: string, base64Data: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    text: "You are an expert in identifying world landmarks from images. Your task is to identify the landmark in the provided photo. It is crucial that you make a positive identification if possible. Respond with only the common name of the landmark, its city, and country. For example: 'Eiffel Tower, Paris, France'. If you cannot identify a specific, recognizable landmark, respond with the exact phrase 'Unknown Landmark'."
                },
                {
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                }
            ]
        }
    });

    return response.text.trim();
}

export async function fetchLandmarkHistory(landmarkName: string): Promise<{ history: string; sources: GroundingSource[] }> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tell me a brief, engaging history of ${landmarkName}. Focus on interesting facts suitable for a tourist. Keep it under 150 words.`,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    const history = response.text;
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = rawChunks
        .map(chunk => chunk.web)
        .filter((web): web is { uri: string; title: string; } => !!web && !!web.uri && !!web.title)
        // Fix: Changed the reduce function to provide a typed initial value and remove the generic argument to fix a TypeScript error.
        .reduce((acc, current) => {
            if (!acc.some(item => item.uri === current.uri)) {
                acc.push(current);
            }
            return acc;
        }, [] as GroundingSource[]);

    return { history, sources };
}


export async function narrateText(text: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Read this in a clear, engaging, and slightly enthusiastic tour guide voice: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
        throw new Error('Failed to generate audio from text.');
    }

    return audioData;
}