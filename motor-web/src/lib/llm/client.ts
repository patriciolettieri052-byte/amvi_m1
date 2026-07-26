// Cliente unificado de LLMs (Gemini 2.5 Flash con fallback a OpenAI GPT-4o)

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nEntrada del Trabajo:\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  } else if (openaiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  throw new Error('No API Keys configured (GEMINI_API_KEY or OPENAI_API_KEY)');
}
