const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
];
const MODEL_CANDIDATES = [
  ...new Set([
    ...(process.env.GEMINI_MODEL
      ? process.env.GEMINI_MODEL.split(",")
          .map((m) => m.trim())
          .filter(Boolean)
          .filter((m) => !/gemini-(1\.5|2\.0|2\.5)/i.test(m))
      : []),
    ...DEFAULT_MODELS,
  ]),
];

export async function gemini(parts, { json = false, system } = {}) {
  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: system
                ? { parts: [{ text: system }] }
                : undefined,
              contents: [{ role: "user", parts }],
              generationConfig: json
                ? { responseMimeType: "application/json", temperature: 0.2 }
                : { temperature: 0.3 },
            }),
          },
        );

        const data = await res.json();
        if (res.ok) {
          return (data.candidates?.[0]?.content?.parts || [])
            .map((p) => p.text || "")
            .join("");
        }

        const message = data.error?.message || "Gemini gagal merespons";
        lastError = new Error(message);

        const isTransientCapacityError =
          res.status === 429 ||
          res.status === 503 ||
          /high demand|temporar|resource_exhausted|quota|rate limit/i.test(
            message,
          );
        if (!isTransientCapacityError) throw lastError;
      } catch (error) {
        lastError = error;
        if (
          !/429|503|high demand|temporar|resource_exhausted|quota|rate limit/i.test(
            String(error.message || error),
          )
        ) {
          throw error;
        }
      }

      if (attempt < 2)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
    }
  }

  throw lastError || new Error("Gemini gagal merespons");
}
