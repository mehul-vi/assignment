import "dotenv/config";

let model = null;
let initPromise = null;

const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export function withFallback(primary, fallback, primaryName, fallbackName) {
  const invokeWithFallback = async (primaryRunnable, fallbackRunnable, input, options) => {
    try {
      return await primaryRunnable.invoke(input, options);
    } catch (error) {
      console.warn(`[LLM] ${primaryName} request failed; trying ${fallbackName}:`, error.message);
      return fallbackRunnable.invoke(input, options);
    }
  };

  return {
    invoke(input, options) {
      return invokeWithFallback(primary, fallback, input, options);
    },
    withStructuredOutput(schema, options) {
      const primaryStructured = primary.withStructuredOutput(schema, options);
      const fallbackStructured = fallback.withStructuredOutput(schema, options);
      return {
        invoke(input, invokeOptions) {
          return invokeWithFallback(primaryStructured, fallbackStructured, input, invokeOptions);
        }
      };
    }
  };
}

async function buildModel() {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();
  const provider = (process.env.LLM_PROVIDER || (groqKey ? "groq" : "gemini")).toLowerCase();

  let groqModel = null;
  let geminiModel = null;

  if (provider === "groq" && groqKey) {
    if (!GROQ_MODEL) {
      throw new Error("Set GROQ_MODEL to a currently supported Groq model when LLM_PROVIDER=groq.");
    }
    const { ChatGroq } = await import("@langchain/groq");
    groqModel = new ChatGroq({
      apiKey: groqKey,
      model: GROQ_MODEL,
      temperature: 0.2,
      maxRetries: 1
    });
  }

  if (geminiKey) {
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    geminiModel = new ChatGoogleGenerativeAI({
      apiKey: geminiKey,
      model: GEMINI_MODEL,
      temperature: 0.2,
      maxRetries: 1
    });
  }

  if (provider === "groq" && groqModel && geminiModel) {
    console.log(`[LLM] Groq (${GROQ_MODEL}) with Gemini (${GEMINI_MODEL}) fallback`);
    return withFallback(groqModel, geminiModel, "Groq", "Gemini");
  }

  if (provider === "groq" && groqModel) {
    console.log(`[LLM] Groq (${GROQ_MODEL})`);
    return groqModel;
  }

  if (provider === "groq" && geminiModel) {
    console.log(`[LLM] Groq unavailable; using Gemini (${GEMINI_MODEL})`);
    return geminiModel;
  }

  if (groqKey && !geminiKey) {
    console.warn("[LLM] GROQ_API_KEY is set but Groq is not selected. Set LLM_PROVIDER=groq and GROQ_MODEL to use it.");
  }

  if (geminiModel) {
    console.log(`[LLM] Gemini (${GEMINI_MODEL})`);
    return geminiModel;
  }

  console.warn("[LLM] No API keys found (GROQ_API_KEY / GEMINI_API_KEY).");
  return null;
}

export async function getLLM() {
  if (model) return model;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      model = await buildModel();
      return model;
    } catch (err) {
      console.warn("[LLM] Init failed:", err.message);
      model = null;
      return null;
    } finally {
      initPromise = undefined;
    }
  })();

  return initPromise;
}