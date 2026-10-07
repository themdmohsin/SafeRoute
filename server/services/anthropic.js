import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) return null;
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 15000,
    maxRetries: 1,
  });
}

function getModel() {
  if (!process.env.ANTHROPIC_MODEL) throw new Error('Anthropic model is not configured.');
  return process.env.ANTHROPIC_MODEL;
}

function getText(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

export async function askAnthropic(question, context, systemInstruction) {
  const client = getClient();
  if (!client) return null;
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 1000,
    system: systemInstruction,
    messages: [{
      role: 'user',
      content: `User question:\n${question}\n\nApplication data retrieved from MongoDB:\n${JSON.stringify(context)}`,
    }],
  });
  return getText(response);
}

export async function classifySeverity(description) {
  try {
    const client = getClient();
    if (!client) return { severity: 'medium', aiSuggested: false };
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 300,
      system: 'Classify the road hazard severity. Return JSON only with one key, severity, whose value is exactly low, medium, or high.',
      messages: [{
        role: 'user',
        content: `Classify this road hazard description. Return JSON only with one key, severity, whose value is exactly low, medium, or high.\nDescription: ${description}`,
      }],
    });
    const result = JSON.parse(getText(response));
    if (['low', 'medium', 'high'].includes(result.severity)) {
      return { severity: result.severity, aiSuggested: true };
    }
  } catch (error) {
    const status = error.status || error.statusCode;
    if (status === 503) {
      console.warn('Anthropic returned HTTP 503 during severity classification; using medium severity fallback.');
    } else {
      console.error('Anthropic severity classification failed; using medium severity fallback.');
    }
  }
  return { severity: 'medium', aiSuggested: false };
}
