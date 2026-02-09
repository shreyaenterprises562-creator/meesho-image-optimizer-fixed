
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async removeBackground(base64Image: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png',
            },
          },
          {
            text: `Extract the main product from this image and place it on a pure, solid white background (#FFFFFF). 
                   The product must be clean, sharp, and centered. Do not add any extra text or graphics. 
                   Return only the product on white.`,
          },
        ],
      },
    });

    let resultBase64 = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        resultBase64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!resultBase64) {
      throw new Error("Failed to extract product from image.");
    }

    return resultBase64;
  }
}

export const geminiService = new GeminiService();
