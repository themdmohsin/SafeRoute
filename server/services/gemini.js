import { GoogleGenAI } from '@google/genai';

function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } },
  });
}

function getModel() {
  if (!process.env.GEMINI_MODEL) throw new Error('GEMINI_MODEL is not configured.');
  return process.env.GEMINI_MODEL;
}

export async function askGemini(question, context, systemInstruction) {
  const client = getClient();
  if (!client) return null;
  const response = await client.models.generateContent({
    model: getModel(),
    contents: `User question:\n${question}\n\nApplication data retrieved from MongoDB:\n${JSON.stringify(context)}`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: 'low' },
      maxOutputTokens: 1000,
    },
  });
  return response.text?.trim() || '';
}

export async function classifySeverity(description) {
  const client = getClient();
  if (!client) return { severity: 'medium', aiSuggested: false };
  try {
    const response = await client.models.generateContent({
      model: getModel(),
      contents: `Classify this road hazard description. Return JSON only with one key, severity, whose value is exactly low, medium, or high.\nDescription: ${description}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { severity: { type: 'STRING', enum: ['low', 'medium', 'high'] } },
          required: ['severity'],
        },
        thinkingConfig: { thinkingLevel: 'low' },
        maxOutputTokens: 300,
      },
    });
    const result = JSON.parse(response.text || '{}');
    if (['low', 'medium', 'high'].includes(result.severity)) {
      return { severity: result.severity, aiSuggested: true };
    }
  } catch (error) {
    const status = error.status || error.statusCode || error.response?.status;
    if (status === 503) {
      console.warn('Gemini returned HTTP 503 during severity classification; using medium severity fallback.');
    } else {
      console.error('Gemini severity classification failed:', error.message);
    }
  }
  return { severity: 'medium', aiSuggested: false };
}
