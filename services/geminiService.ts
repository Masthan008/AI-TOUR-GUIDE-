import { GoogleGenAI, Modality, Type, Chat, GenerateContentResponse } from "@google/genai";
import { GroundingSource, LandmarkDetails, DiscoveryDetails, NearbyPlace } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Function to reinstantiate the AI client, necessary for Veo after key selection.
const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
};

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

export async function fetchNearbyPlaces(landmarkName: string, latitude: number, longitude: number): Promise<NearbyPlace[]> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `What are some interesting places to visit near ${landmarkName}? Include restaurants, museums, or other points of interest for a tourist.`,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
                retrievalConfig: {
                    latLng: { latitude, longitude }
                }
            }
        },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return rawChunks
        .map(chunk => chunk.maps?.placeAnswerSources?.[0]?.place)
        .filter((place): place is NearbyPlace => !!place);
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

export function startChat(): Chat {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'You are a friendly and helpful AI assistant. Your responses should be informative and concise.',
        },
    });
}

export async function generateImage(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'): Promise<string> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatio,
        },
    });

    const imageData = response.generatedImages[0]?.image.imageBytes;

    if (!imageData) {
        throw new Error('Failed to generate an image.');
    }

    return imageData;
}

export async function editImage(prompt: string, base64Data: string, mimeType: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return part.inlineData.data;
    }
    
    throw new Error('Failed to edit image.');
}

export async function* generateVideo(
    prompt: string | undefined,
    base64Data: string,
    mimeType: string,
    aspectRatio: '16:9' | '9:16'
): AsyncGenerator<string, string, undefined> {
    const videoAIClient = getAIClient(); // Use a fresh client with the latest key
    let operation = await videoAIClient.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: { imageBytes: base64Data, mimeType },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
        }
    });

    yield "Initializing video generation...";
    
    while (!operation.done) {
        yield "Processing video... this may take a few minutes.";
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await videoAIClient.operations.getVideosOperation({ operation: operation });
    }

    yield "Finalizing video...";
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error("Failed to download the generated video.");
    }
    const videoBlob = await response.blob();
    
    return URL.createObjectURL(videoBlob);
}