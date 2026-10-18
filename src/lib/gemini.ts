/**
 * Storyhaven Gemini API Integration
 * Uses Google's gemini-3.1-flash-lite model via the Gemini API.
 */

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type ChatHistoryItem = {
  sender: string;
  body: string;
};

export type RawPostItem = {
  title: string;
  content: string;
  media_type: "book" | "movie" | "album" | "general";
  media_title?: string | null;
};

export type RawCommentItem = {
  temp_id: string;
  content: string;
  parent_temp_id: string | null;
};

/**
 * Parses usernames from a pipe-delimited, newline-delimited, or comma-delimited response.
 * Tolerates conversational preamble, bullet points, numbering, and thoughts.
 */
export function parseDelimitedUsernames(
  rawText: string,
  expectedCount: number,
): string[] {
  const lines = rawText.split(/[\n|]/);
  const candidates: string[] = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Strip leading markdown bullets (*, -, 1., etc.) and quotes
    line = line.replace(/^(?:[\d]+[.)]|\*|-|\+|•)\s*/, "");
    line = line.replace(/^["'`]|["'`]$/g, "").trim();

    // Filter out preamble lines that contain colons or prompt words
    if (line.includes(":") || line.includes("Storyhaven") || line.length > 30) {
      continue;
    }

    // Keep valid username characters
    const cleaned = line.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleaned.length >= 3 && cleaned.length <= 30 && !candidates.includes(cleaned)) {
      candidates.push(cleaned);
    }
  }

  if (candidates.length > 0) {
    return candidates.slice(0, expectedCount);
  }

  // Fallback: extract capitalized word tokens
  const wordTokens = rawText.match(/\b[A-Z][a-zA-Z0-9]{3,24}\b/g) || [];
  const fallback = Array.from(new Set(wordTokens)).filter(
    (w) =>
      !["Storyhaven", "Target", "Themes", "Guidelines", "Format", "Output", "Example"].includes(w),
  );

  return fallback.slice(0, expectedCount);
}

/**
 * Parses forum posts delimited by ===POST=== tags.
 */
export function parseDelimitedPosts(rawText: string): RawPostItem[] {
  const blocks = rawText.split(/===POST===/i);
  const posts: RawPostItem[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || !/TITLE:/i.test(trimmed)) continue;

    const titleMatch = trimmed.match(/(?:^|\n)\s*TITLE:\s*(.*)/i);
    const mediaTypeMatch = trimmed.match(/(?:^|\n)\s*MEDIA_TYPE:\s*(.*)/i);
    const mediaTitleMatch = trimmed.match(/(?:^|\n)\s*MEDIA_TITLE:\s*(.*)/i);
    const contentMatch = trimmed.match(/(?:^|\n)\s*CONTENT:\s*([\s\S]*)$/i);

    const title = titleMatch?.[1]?.trim() || "";
    if (!title) continue;

    let mediaType: "book" | "movie" | "album" | "general" = "general";
    const rawType = mediaTypeMatch?.[1]?.trim().toLowerCase();
    if (rawType && ["book", "movie", "album", "general"].includes(rawType)) {
      mediaType = rawType as "book" | "movie" | "album" | "general";
    }

    let mediaTitle: string | null = mediaTitleMatch?.[1]?.trim() || null;
    if (
      mediaTitle &&
      ["none", "null", "n/a", "undefined", '""', "''"].includes(
        mediaTitle.toLowerCase(),
      )
    ) {
      mediaTitle = null;
    }

    const content = contentMatch?.[1]?.trim() || "";
    if (!content) continue;

    posts.push({
      title: title.slice(0, 300),
      content,
      media_type: mediaType,
      media_title: mediaTitle,
    });
  }

  return posts;
}

/**
 * Parses comments delimited by ===COMMENT=== tags.
 */
export function parseDelimitedComments(
  rawText: string,
): Record<string, RawCommentItem[]> {
  const blocks = rawText.split(/===COMMENT===/i);
  const map: Record<string, RawCommentItem[]> = {};
  let autoIdCounter = 1;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || !/CONTENT:/i.test(trimmed)) continue;

    const postIndexMatch = trimmed.match(/(?:^|\n)\s*POST_INDEX:\s*(\d+)/i);
    const tempIdMatch = trimmed.match(/(?:^|\n)\s*TEMP_ID:\s*([a-zA-Z0-9_-]+)/i);
    const parentTempIdMatch = trimmed.match(
      /(?:^|\n)\s*PARENT_TEMP_ID:\s*([a-zA-Z0-9_-]+|NONE|null)/i,
    );
    const contentMatch = trimmed.match(/(?:^|\n)\s*CONTENT:\s*([\s\S]*)$/i);

    const postKey = `post_${postIndexMatch?.[1] ?? 0}`;
    const tempId = tempIdMatch?.[1] || `c${autoIdCounter++}`;
    const rawParent = parentTempIdMatch?.[1]?.trim();
    const parentTempId =
      !rawParent || ["none", "null", "n/a"].includes(rawParent.toLowerCase())
        ? null
        : rawParent;
    const content = contentMatch?.[1]?.trim() || "";

    if (!content) continue;

    if (!map[postKey]) {
      map[postKey] = [];
    }

    map[postKey].push({
      temp_id: tempId,
      content,
      parent_temp_id: parentTempId,
    });
  }

  return map;
}

/**
 * Extracts and parses JSON from LLM output, handling markdown code fences
 * and introductory/trailing conversational prose.
 */
export function extractAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip markdown code fences (e.g. ```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract substring between first [ / { and last ] / }
    const firstBracket = cleaned.search(/[\[\{]/);
    const lastBracket = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate) as T;
    }

    throw new Error(
      `Failed to parse JSON response from Gemma 4: ${rawText.slice(0, 200)}...`,
    );
  }
}

/**
 * Executes a prompt against Google's gemini-3.1-flash-lite model via the Gemini API.
 */
export async function callGemini(
  prompt: string,
  options?: {
    reason?: string;
    systemInstruction?: string;
    jsonMode?: boolean;
    temperature?: number;
  },
): Promise<string> {
  const reason = options?.reason ?? "General text generation";
  const start = Date.now();

  console.log(
    `[Gemini API] 🚀 Invoking ${GEMINI_MODEL} | Reason: "${reason}" | Prompt Length: ${prompt.length} chars`,
  );

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      "GEMINI_API_KEY is not defined in environment variables. Please add it to your .env file.",
    );
    console.error(`[Gemini API] ❌ Configuration Error: ${err.message}`);
    throw err;
  }

  const endpoint = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;

  const bodyPayload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (options?.systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });
  } catch (netErr: unknown) {
    const elapsed = Date.now() - start;
    const msg = netErr instanceof Error ? netErr.message : "Network error";
    console.error(
      `[Gemini API] ❌ Network Failure after ${elapsed}ms | Reason: "${reason}" | ${msg}`,
    );
    throw netErr;
  }

  const elapsed = Date.now() - start;

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMessage = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        parsedMessage = parsed.error.message;
      }
    } catch {
      // Keep raw body
    }

    console.error(
      `[Gemini API] ❌ HTTP ${response.status} ${response.statusText} after ${elapsed}ms | Reason: "${reason}" | ${parsedMessage}`,
    );

    throw new Error(
      `Gemini API request failed (${response.status} ${response.statusText}): ${parsedMessage}`,
    );
  }

  const data = await response.json();
  const textOutput =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!textOutput) {
    console.error(
      `[Gemini API] ❌ Empty Completion after ${elapsed}ms | Reason: "${reason}"`,
    );
    throw new Error("Gemini API returned an empty completion.");
  }

  console.log(
    `[Gemini API] ✅ Success after ${elapsed}ms | Reason: "${reason}" | Output Length: ${textOutput.length} chars`,
  );

  return textOutput;
}

// Backward-compatible alias
export const callGemma = callGemini;

/**
 * Generates an automated in-character DM response from a bot friend.
 */
export async function generateDmReply(
  botName: string,
  botFavoriteMedia: string,
  userMessage: string,
  history: ChatHistoryItem[] = [],
): Promise<string> {
  let historySnippet = "";
  if (history.length > 0) {
    historySnippet =
      "Recent conversation:\n" +
      history
        .slice(-5)
        .map((h) => `${h.sender}: ${h.body}`)
        .join("\n") +
      "\n\n";
  }

  const prompt = `You are ${botName}, a quiet and thoughtful patron of Storyhaven, a cozy retro pixel library.
You love ${botFavoriteMedia || "antique books, vintage cinema, and warm tea"} and enjoy discussing books, films, and music with fellow haven members.
${historySnippet}A fellow reader in your haven circle just sent you this message:
"${userMessage}"

Reply warmly and conversationally in 1 to 3 cozy sentences. Maintain your persona. Do not break character. Do not use hashtags or emojis in excess. Output only the message reply itself.`;

  const reason = `Automated DM reply from bot @${botName} responding to: "${userMessage.slice(0, 35)}..."`;
  const raw = await callGemma(prompt, { reason, temperature: 0.8 });
  return raw.trim().replace(/^["']|["']$/g, "");
}
