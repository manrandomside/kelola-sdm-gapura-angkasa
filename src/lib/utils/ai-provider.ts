// Waterfall AI provider: Gemini (primary) -> Groq (fallback), 10s timeout each.

export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiResponse {
  content: string;
  provider: "gemini" | "groq";
}

// ---------------------------------------------------------------------------
// Provider 1: Google Gemini (gemini-2.0-flash)
// ---------------------------------------------------------------------------

async function callGemini(
  messages: AiMessage[],
  systemPrompt: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    // Convert messages: system -> systemInstruction, assistant -> model role
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Provider 2: Groq (llama-3.1-70b-versatile, OpenAI-compatible)
// ---------------------------------------------------------------------------

async function callGroq(
  messages: AiMessage[],
  systemPrompt: string,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty Groq response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Waterfall: try Gemini first, fallback to Groq
// ---------------------------------------------------------------------------

export async function askAi(
  messages: AiMessage[],
  systemPrompt: string,
): Promise<AiResponse> {
  // Try Gemini first
  try {
    const content = await callGemini(messages, systemPrompt);
    return { content, provider: "gemini" };
  } catch (geminiError) {
    console.error("[AI] Gemini failed:", geminiError);
  }

  // Fallback to Groq
  try {
    const content = await callGroq(messages, systemPrompt);
    return { content, provider: "groq" };
  } catch (groqError) {
    console.error("[AI] Groq failed:", groqError);
  }

  // All failed
  throw new Error(
    "Semua provider AI sedang tidak tersedia. Silakan coba lagi nanti.",
  );
}
