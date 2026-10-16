import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { createHash } from "crypto";
import { upsertChunks } from "./vector.js";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_PDF = path.join(__dirname, "../data/employee_handbook.pdf");
const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(__dirname, "../data");
const PDF_PATH = process.env.VERCEL ? "/tmp/employee_handbook.pdf" : path.join(DATA_DIR, "employee_handbook.pdf");
const DEFAULT_URL =
  "https://raw.githubusercontent.com/Azure-Samples/azure-search-openai-demo/main/data/employee_handbook.pdf";

const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 150;
const MIN_CHUNK_LENGTH = 50;

let indexedChunks = [];

// ---------- download ----------

export async function downloadPDF(url = DEFAULT_URL, destPath = PDF_PATH, redirects = 5) {
  if (fs.existsSync(BUNDLED_PDF) && fs.statSync(BUNDLED_PDF).size > 0) {
    return BUNDLED_PDF;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return destPath;
  }

  console.log(`[RAG] Downloading reference PDF from: ${url}`);

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const { statusCode, headers } = response;

        // follow redirects, but limit depth
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          if (redirects <= 0) {
            return reject(new Error("Too many redirects while downloading PDF."));
          }
          return downloadPDF(headers.location, destPath, redirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (statusCode !== 200) {
          return reject(new Error(`Failed to download PDF (status ${statusCode}).`));
        }

        const fileStream = fs.createWriteStream(destPath);

        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          console.log(`[RAG] PDF saved to ${destPath}`);
          resolve(destPath);
        });
        fileStream.on("error", reject);
      })
      .on("error", reject);
  });
}

// ---------- chunking ----------

// deterministic UUID v5-style id from content
function stableUuid(value) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join("");
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function chunkText(text, pageNumber) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);

    // try to break at a sentence boundary, otherwise at a space
    if (end < clean.length) {
      const lastPeriod = clean.lastIndexOf(".", end);
      const lastSpace = clean.lastIndexOf(" ", end);
      const minBoundary = start + CHUNK_SIZE / 2;

      if (lastPeriod > minBoundary) {
        end = lastPeriod + 1;
      } else if (lastSpace > minBoundary) {
        end = lastSpace;
      }
    }

    const content = clean.slice(start, end).trim();

    if (content.length > MIN_CHUNK_LENGTH) {
      const chunkIndex = chunks.length + 1;
      chunks.push({
        id: stableUuid(`employee_handbook:${pageNumber}:${chunkIndex}:${content}`),
        pageNumber,
        text: content,
        source: "employee_handbook.pdf"
      });
    }

    if (end >= clean.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }

  return chunks;
}

// ---------- ingestion ----------

export async function ingestPDF(pdfUrl = process.env.PDF_URL || DEFAULT_URL) {
  const filePath = await downloadPDF(pdfUrl);
  const dataBuffer = fs.readFileSync(filePath);

  const pageTexts = [];

  await pdf(dataBuffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageNumber = pageData.pageIndex + 1;
      const pageText = textContent.items.map((item) => item.str).join(" ");

      pageTexts.push({ pageNumber, text: pageText });
      return pageText;
    }
  });

  // sort by page number (pagerender order isn't guaranteed)
  pageTexts.sort((a, b) => a.pageNumber - b.pageNumber);

  const allChunks = pageTexts.flatMap((page) => chunkText(page.text, page.pageNumber));

  if (!allChunks.length) {
    throw new Error("No readable text was extracted from the PDF.");
  }

  const storageResult = await upsertChunks(allChunks);
  if (storageResult.stored !== allChunks.length) {
    throw new Error(`Expected ${allChunks.length} handbook chunks in Qdrant, confirmed ${storageResult.stored}.`);
  }
  indexedChunks = allChunks;

  console.log(
    `[RAG Ingestion] Confirmed ${storageResult.stored} chunks across ${pageTexts.length} pages in Qdrant.`
  );

  return indexedChunks;
}

export function getIndexedChunks() {
  return indexedChunks;
}