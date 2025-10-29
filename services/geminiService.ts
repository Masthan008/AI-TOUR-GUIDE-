import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GroundingSource, LandmarkDetails, DiscoveryDetails } from '../types';

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
        .reduce((acc, current) => {
            if (!acc.some(item => item.uri === current.uri)) {
                acc.push(current);
            }
            return acc;
        }, [] as GroundingSource[]);

    return { history, sources };
}

export async function fetchDetailedLandmarkHistory(landmarkName: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Provide a comprehensive and detailed history of ${landmarkName}. Explore its construction, cultural impact, significant events associated with it, and any interesting architectural details. The response should be well-structured and engaging for a history enthusiast.`,
        config: {
            thinkingConfig: {
                thinkingBudget: 32768,
            },
        },
    });
    return response.text;
}


export async function fetchLandmarkDetails(landmarkName: string): Promise<LandmarkDetails> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide structured details for the landmark: ${landmarkName}. I need the construction date, architectural style, and its primary significance.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    constructionDate: {
                        type: Type.STRING,
                        description: "The primary construction date or period (e.g., '1887-1889', 'c. 1173')."
                    },
                    architecturalStyle: {
                        type: Type.STRING,
                        description: "The main architectural style (e.g., 'Gothic', 'Art Deco')."
                    },
                    significance: {
                        type: Type.STRING,
                        description: "A brief, one-sentence summary of its primary significance."
                    }
                },
                required: ['constructionDate', 'architecturalStyle', 'significance']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse landmark details JSON:", e);
        throw new Error("Could not retrieve detailed information for the landmark.");
    }
}

export async function fetchDiscoveryDetails(landmarkName: string): Promise<DiscoveryDetails> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: `For the landmark "${landmarkName}", provide one interesting and little-known "fun fact" and a list of 2-3 nearby attractions a tourist might enjoy.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    funFact: {
                        type: Type.STRING,
                        description: "A single, concise, and interesting fact about the landmark."
                    },
                    nearbyAttractions: {
                        type: Type.ARRAY,
                        description: "A list of 2 to 3 nearby points of interest.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: {
                                    type: Type.STRING,
                                    description: "The name of the nearby attraction."
                                },
                                description: {
                                    type: Type.STRING,
                                    description: "A short, one-sentence description of the attraction."
                                }
                            },
                            required: ['name', 'description']
                        }
                    }
                },
                required: ['funFact', 'nearbyAttractions']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse discovery details JSON:", e);
        // Return a default/empty state to prevent app crash if this non-critical call fails
        return {
            funFact: "Could not retrieve fun fact at this time.",
            nearbyAttractions: []
        };
    }
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