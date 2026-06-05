// Shared AI engine for FlowSoundz Creator Hub.
// Tag-based output parsing is more reliable than JSON for long-form creative copy.

export const FSZ_SYSTEM_PROMPT = `You are the creative AI engine behind FlowSoundz Radio — a late-night, premium, cinematic discovery platform for independent artists.

Brand identity: underground, intentional, cinematic. Discovery-first. Not corporate. Not a generic playlist.
You write for artists who take their craft seriously and listeners who find music before the mainstream does.

Strict rules:
- No generic marketing speak. Ban: "groundbreaking", "revolutionary", "game-changing", "banger", "fire", "slaps".
- Write like a seasoned music curator who has actually listened to the track — not someone who read the metadata.
- Every line should earn its place. Nothing filler. Nothing obvious.
- Wrap each output section in the exact XML tags specified in the prompt. No text outside the tags.
- Do not add explanations, preambles, or sign-offs. Output only the tagged blocks.`;

const TEMPERATURE = 0.75;
const DEFAULT_MAX_TOKENS = 1400;

export async function callOpenAI(
  apiKey: string,
  userPrompt: string,
  maxTokens = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL_DJ ?? "gpt-4o",
      max_tokens: maxTokens,
      temperature: TEMPERATURE,
      messages: [
        { role: "system", content: FSZ_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callAnthropic(
  apiKey: string,
  userPrompt: string,
  maxTokens = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: TEMPERATURE,
      system: FSZ_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return data.content?.find((b) => b.type === "text")?.text ?? "";
}

// Tries OpenAI first, falls back to Anthropic, returns empty string if both fail.
export async function runAI(
  userPrompt: string,
  maxTokens = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!openAiKey && !anthropicKey) return "";

  try {
    return openAiKey
      ? await callOpenAI(openAiKey, userPrompt, maxTokens)
      : await callAnthropic(anthropicKey!, userPrompt, maxTokens);
  } catch {
    if (openAiKey && anthropicKey) {
      try {
        return await callAnthropic(anthropicKey, userPrompt, maxTokens);
      } catch {
        return "";
      }
    }
    return "";
  }
}

// Extracts content between <tag> and </tag> markers.
export function extractTag(raw: string, tag: string): string {
  const match = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

// Parses a numbered/bulleted list block into a string array.
export function extractList(raw: string, tag: string): string[] {
  const block = extractTag(raw, tag);
  if (!block) return [];
  return block
    .split(/\n/)
    .map((line) => line.replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}
