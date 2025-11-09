import { AIAnalysis, Market } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function getAIAnalysis(
  market: Market,
  apiKey: string
): Promise<AIAnalysis> {
  const systemPrompt = `
    You are "KalshiFlow," a world-class financial analyst AI specializing in prediction markets.
    Your job is to analyze a *single* market's JSON data and provide a deep, actionable insight.
    
    RULES:
    - Your analysis must be concise (2-3 sentences).
    - You must detect "whale activity" (unusual volume, odds shifts, etc.).
    - You must output a valid JSON object in the following format:
    {
      "insight": "A summary of the most important pattern you found.",
      "confidence": "Your confidence in this insight (high, medium, or low).",
      "summary": "A one-sentence 'just in' style alert.",
      "actionable": "A boolean (true/false) on whether this insight is actionable."
    }
  `;

  const userPrompt = `
    Analyze the following Kalshi market data. Is there whale activity? What is the most important insight?
    
    Market Data:
    ${JSON.stringify(market, null, 2)}
  `;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000', 
        'X-Title': 'KalshiWhale'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free', 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${err}`);
    }

    const jsonResponse = await response.json();
    const aiResponseContent = jsonResponse.choices[0].message.content;
    
    const analysis: AIAnalysis = JSON.parse(aiResponseContent);
    return analysis;

  } catch (error) {
    console.error('Error in getAIAnalysis:', error);
    throw new Error('Failed to get AI analysis');
  }
}