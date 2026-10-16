import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "employee_handbook";

// ---------- clients ----------

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  model: "gemini-embedding-001"
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

let collectionReady = false;
let initializationPromise;

// ---------- init ----------

export async function initializeVectorStore() {
  if (collectionReady) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      throw new Error("QDRANT_URL and QDRANT_API_KEY are required.");
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required.");
    }

    const sample = await embeddings.embedQuery("Initialize vector dimensions");

    if (!Array.isArray(sample) || !sample.length) {
      throw new Error("Gemini embeddings returned an empty vector.");
    }

    const { collections } = await qdrant.getCollections();
    const exists = collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: sample.length, distance: "Cosine" }
      });
      console.log(`[Qdrant] Created collection: ${COLLECTION_NAME}`);
    } else {
      const info = await qdrant.getCollection(COLLECTION_NAME);
      const configured = info.config?.params?.vectors;

      if (
        configured &&
        typeof configured === "object" &&
        typeof configured.size === "number" &&
        configured.size !== sample.length
      ) {
        throw new Error(
          `Qdrant collection dimension mismatch. Expected ${sample.length}, found ${configured.size}.`
        );
      }
    }

    collectionReady = true;
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = undefined;
    throw error;
  }
}

// ---------- write ----------

export async function upsertChunks(chunks, { force = false } = {}) {
  if (!chunks?.length) return { inserted: 0, stored: 0 };

  await initializeVectorStore();

  // Skip embedding only when every deterministic chunk ID is already stored.
  if (!force) {
    try {
      const storedPoints = await qdrant.retrieve(COLLECTION_NAME, {
        ids: chunks.map((chunk) => chunk.id),
        with_payload: false,
        with_vector: false
      });
      const storedIds = new Set(storedPoints.map((point) => String(point.id)));

      if (chunks.every((chunk) => storedIds.has(String(chunk.id)))) {
        console.log(
          `[Qdrant] All ${chunks.length} handbook chunks already exist. Skipping embeddings.`
        );
        return { inserted: 0, stored: chunks.length, skipped: true };
      }
    } catch (err) {
      console.warn("[Qdrant] Could not verify existing chunks; will upsert them:", err.message);
    }
  }

  for (const chunk of chunks) {
    if (!chunk.id || !chunk.text) {
      throw new Error("Every chunk must contain an id and text.");
    }
  }

  const vectors = await embeddings.embedDocuments(chunks.map((c) => c.text));

  if (
    !vectors?.length ||
    vectors.length !== chunks.length ||
    !Array.isArray(vectors[0]) ||
    !vectors[0].length ||
    vectors.some((vector) => !Array.isArray(vector) || vector.length !== vectors[0].length)
  ) {
    throw new Error("Embedding model returned missing or inconsistent vectors; no chunks were stored.");
  }

  const points = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: vectors[i],
    payload: {
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      source: chunk.source || "employee_handbook.pdf"
    }
  }));

  await qdrant.upsert(COLLECTION_NAME, { wait: true, points });

  console.log(`[Qdrant] Upserted ${points.length} chunks.`);
  return { inserted: points.length, stored: points.length };
}

// ---------- read ----------

export async function searchSimilarChunks(query, limit = 4) {
  if (typeof query !== "string" || !query.trim()) return [];

  await initializeVectorStore();

  const safeLimit = Math.max(1, Math.min(Number(limit) || 4, 10));
  const cleanQuery = query.trim();

  try {
    const vector = await embeddings.embedQuery(cleanQuery);

    if (Array.isArray(vector) && vector.length) {
      const res = await qdrant.query(COLLECTION_NAME, {
        query: vector,
        limit: safeLimit,
        with_payload: true
      });

      const points = res?.points || (Array.isArray(res) ? res : []);

      if (points.length) {
        return points.map((p) => ({
          text: p.payload?.text || "",
          pageNumber: p.payload?.pageNumber ?? null,
          source: p.payload?.source || "employee_handbook.pdf",
          score: p.score
        }));
      }
    }
  } catch (err) {
    console.warn(`[Qdrant] Vector search failed (${err.message}). Using keyword fallback.`);
  }

  // keyword fallback
  try {
    const scroll = await qdrant.scroll(COLLECTION_NAME, {
      limit: 100,
      with_payload: true
    });

    const points = scroll?.points || [];
    if (!points.length) return [];

    const terms = cleanQuery
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    return points
      .map((p) => {
        const text = (p.payload?.text || "").toLowerCase();
        const score = terms.reduce((sum, t) => sum + (text.includes(t) ? 1 : 0), 0);

        return {
          text: p.payload?.text || "",
          pageNumber: p.payload?.pageNumber ?? null,
          source: p.payload?.source || "employee_handbook.pdf",
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, safeLimit);
  } catch (err) {
    console.warn("[Qdrant] Keyword fallback failed:", err.message);
    return [];
  }
}