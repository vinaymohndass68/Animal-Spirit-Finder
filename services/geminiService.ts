
import { GoogleGenAI, Modality } from "@google/genai";

// A single, top-level instance for most calls
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
};

const SYSTEM_INSTRUCTION = `You are a mystical spirit animal guide. Your goal is to identify a person's spirit animal based on an image. Analyze the provided image of the person. Look at their expression, posture, energy, and any subtle details. Respond with ONLY a JSON object: \`{ "animalName": "Animal Name", "justification": "A brief, poetic explanation..." }\`. Do not include any other text or markdown formatting.`;


export const identifyAnimal = async (base64Image: string, mimeType: string): Promise<{ animalName: string; justification: string }> => {
  try {
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    
    const contents = [{ role: 'user', parts: [imagePart, { text: "What is this person's spirit animal?" }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    let text = response.text.trim();
    // Clean potential markdown formatting
    if (text.startsWith('```json')) {
        text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith('`')) {
        text = text.substring(1, text.length - 1).trim();
    }

    const parsed = JSON.parse(text);

    if (parsed.animalName && parsed.justification) {
        return parsed;
    } else {
        throw new Error("Invalid JSON structure from model.");
    }

  } catch (error) {
    console.error("Error identifying animal:", error);
    throw new Error("Failed to identify the animal. The model may be unavailable or the image could not be processed.");
  }
};


export const generateSideBySideImage = async (base64Image: string, mimeType: string, animalName: string, environment: string, mood: string, style: string, aspectRatio: string): Promise<string> => {
  try {
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    const prompt = `Create an image of the person from the provided photo walking side-by-side with their spirit animal, a ${animalName}. They are in ${environment}. The mood of the image is ${mood}. The artistic style is ${style}. The image must have a ${aspectRatio} aspect ratio.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("No image was generated in the response. Please try again.");

  } catch (error) {
    console.error("Error generating side-by-side image:", error);
    throw new Error("Failed to generate the new image. The model may be busy or the request could not be fulfilled.");
  }
};

export const animateImage = async (base64Image: string, mimeType: string, aspectRatio: '1:1' | '9:16' | '16:9'): Promise<string> => {
  try {
    // Create a fresh instance to ensure the latest API key is used
    const aiForVideo = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation = await aiForVideo.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: 'Subtly animate this image, bringing the scene to life with gentle movements. Keep the original style and composition.',
      image: {
        imageBytes: base64Image,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await aiForVideo.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was provided.");
    }
    
    return `${downloadLink}&key=${process.env.API_KEY}`;
  } catch (error: any) {
    console.error("Error animating image:", error);
    
    const errorStr = error.message || "";
    const isPermissionError = errorStr.includes("PERMISSION_DENIED") || errorStr.includes("403") || errorStr.includes("does not have permission");
    const isNotFoundError = errorStr.includes("Requested entity was not found");

    if (isPermissionError || isNotFoundError) {
        throw new Error("PERMISSION_REQUIRED: Video generation requires a paid API key with billing enabled. Please select a valid key from a paid GCP project. Learn more at: ai.google.dev/gemini-api/docs/billing");
    }
    
    throw new Error("Failed to animate the image. The model may be busy or the request could not be fulfilled.");
  }
};

export const generatePersonImage = async (prompt: string): Promise<{ base64: string; mimeType: string; }> => {
  try {
    const fullPrompt = `Generate a photorealistic image of a person based on the following description: ${prompt}. The image should be a clear portrait.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: fullPrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
        }
    }
    
    throw new Error("No image was generated in the response. Please try a different prompt.");

  } catch (error) {
    console.error("Error generating person image:", error);
    throw new Error("Failed to generate the image. The model may be busy or your prompt might be too restrictive.");
  }
};
