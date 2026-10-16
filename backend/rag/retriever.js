import { searchSimilarChunks } from "./vector.js";

const DEFAULT_SOURCE = "employee_handbook.pdf";

/**
 * Retrieve semantically relevant employee-handbook chunks from Qdrant.
 * Returns an empty array for empty/invalid queries.
 */
export async function retrieveRelevantChunks(query, topK = 3) {
  if (typeof query !== "string" || !query.trim()) return [];

  const limit = Math.max(1, Math.min(Number(topK) || 3, 10));
  const results = await searchSimilarChunks(query.trim(), limit);

  return results
    .filter((chunk) => typeof chunk.text === "string" && chunk.text.trim())
    .map((chunk) => {
      const page = Number(chunk.pageNumber);
      return {
        text: chunk.text,
        pageNumber: Number.isFinite(page) && page > 0 ? page : null,
        source: chunk.source || DEFAULT_SOURCE,
        score: chunk.score
      };
    });
}