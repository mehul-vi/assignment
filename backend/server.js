import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { timingSafeEqual } from "node:crypto";

import { ingestPDF, getIndexedChunks } from "./rag/ingest.js";
import { initializeVectorStore } from "./rag/vector.js";
import { agentGraph } from "./agent/graph.js";
import { getAvailableSlots } from "./agent/tools/bookingTools.js";

import {
  getAuthenticatedUser,
  getGraphThreadId,
  getUserThreadId,
  isValidThreadId,
  requestEmailCode,
  revokeSession,
  updateAuthenticatedUserName,
  verifyEmailCode
} from "./auth.js";

import { sendBookingConfirmation } from "./email.js";
import { getBookingsByEmail, saveBooking, updateBookingStatus, updateBookingDetails } from "./bookingsDb.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
let ragStatus = "not-started";
let ragError = null;
let ragIngestionPromise = null;

app.use(cors());
app.use(express.json());

function startRagIngestion(pdfUrl = process.env.PDF_URL) {
  if (ragIngestionPromise) return ragIngestionPromise;

  ragStatus = "indexing";
  ragError = null;
  ragIngestionPromise = (async () => {
    try {
      await initializeVectorStore();
      const chunks = await ingestPDF(pdfUrl);
      ragStatus = "ready";
      return chunks;
    } catch (error) {
      ragStatus = "error";
      ragError = error;
      throw error;
    } finally {
      ragIngestionPromise = null;
    }
  })();

  return ragIngestionPromise;
}

// ---------- middleware ----------

function optionalAuthentication(req, res, next) {
  try {
    const user = getAuthenticatedUser(req.headers.authorization);
    if (user) {
      req.authUser = user;
    }
  } catch {
    // Continue as guest if token is missing or expired
  }
  next();
}

function requireAuthentication(req, res, next) {
  const user = getAuthenticatedUser(req.headers.authorization);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Please verify your email to continue."
    });
  }

  req.authUser = user;
  next();
}

function requireIngestKey(req, res, next) {
  const expected = process.env.INGEST_API_KEY;
  const provided = req.get("x-ingest-key") || "";

  if (!expected) {
    return res.status(503).json({
      success: false,
      error: "Manual ingestion is disabled."
    });
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      error: "Invalid ingestion key."
    });
  }

  next();
}

// ---------- public routes ----------

function handleHealth(req, res) {
  const chunks = getIndexedChunks();
  const isReady = ragStatus === "ready" && chunks.length > 0;

  res.json({
    status: "ok",
    ready: isReady,
    service: "Agentic AI Backend",
    ragIndexed: isReady,
    indexedChunksCount: chunks.length,
    storedChunksCount: isReady ? chunks.length : 0,
    ragStatus,
    ragError: ragError ? "Knowledge-base indexing failed. Check backend logs." : null,
    vectorStore: isReady ? "initialized" : ragStatus === "indexing" ? "initializing" : "not-ready",
    timestamp: new Date().toISOString()
  });
}

app.get("/", handleHealth);
app.get("/health", handleHealth);
app.get("/api/health", handleHealth);

app.get("/api/slots", (req, res) => {
  try {
    res.json({ success: true, slots: getAvailableSlots() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- auth routes ----------

app.post("/api/auth/request-code", async (req, res) => {
  try {
    const result = await requestEmailCode(req.body?.email, req.body?.name);
    res.json({
      success: true,
      email: result.email,
      expiresInSeconds: result.expiresInSeconds
    });
  } catch (error) {
    res.status(error.statusCode || 503).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/auth/verify-code", (req, res) => {
  try {
    const result = verifyEmailCode(req.body?.email, req.body?.code);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/api/auth/session", requireAuthentication, (req, res) => {
  res.json({
    success: true,
    email: req.authUser.email,
    name: req.authUser.name
  });
});

app.put("/api/auth/profile", requireAuthentication, (req, res) => {
  try {
    const profile = updateAuthenticatedUserName(
      req.authUser.token,
      req.body?.name
    );
    res.json({ success: true, ...profile });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/auth/logout", requireAuthentication, (req, res) => {
  revokeSession(req.authUser.token);
  res.json({ success: true });
});

// ---------- ingestion (manual only) ----------

app.post("/api/ingest", requireIngestKey, async (req, res) => {
  try {
    const pdfUrl = req.body?.pdfUrl || process.env.PDF_URL;
    const chunks = await startRagIngestion(pdfUrl);
    res.json({
      success: true,
      message: "PDF ingested successfully",
      chunksCount: chunks.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- chat ----------

app.get("/api/session/:threadId", optionalAuthentication, async (req, res) => {
  try {
    const rawThreadId = req.params.threadId;
    if (!isValidThreadId(rawThreadId)) {
      return res.status(400).json({
        success: false,
        error: "A valid Thread ID (alphanumeric/UUID) is required."
      });
    }

    const threadId = getGraphThreadId(rawThreadId, req.authUser);

    const state = await agentGraph.getState({
      configurable: { thread_id: threadId }
    });

    const values = state?.values || {};

    res.json({
      success: true,
      threadId: rawThreadId,
      messages: values.messages || [],
      booking: values.booking || { step: "idle" }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

app.post("/api/chat", optionalAuthentication, async (req, res) => {
  try {
    const { message, threadId, clientBooking } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "A valid message is required."
      });
    }

    const rawThreadId =
      typeof threadId === "string" && threadId.trim()
        ? threadId.trim()
        : null;

    if (!rawThreadId || !isValidThreadId(rawThreadId)) {
      return res.status(400).json({
        success: false,
        error: "A valid Thread ID (alphanumeric/UUID) is required."
      });
    }

    const currentThreadId = getGraphThreadId(rawThreadId, req.authUser);

    const config = {
      configurable: { thread_id: currentThreadId }
    };

    const previousState = await agentGraph.getState(config);
    const previousValues = previousState?.values || {};

    let booking = previousValues.booking || {};

    // Restore booking if backend state is idle but client has active state
    if (
      (!booking.step || booking.step === "idle") &&
      clientBooking?.step &&
      clientBooking.step !== "idle"
    ) {
      booking = clientBooking;
    }

    // Attach authenticated details if user is logged in
    if (req.authUser) {
      booking = {
        ...booking,
        email: booking.email || req.authUser.email,
        name: booking.name || req.authUser.name
      };
    }

    const result = await agentGraph.invoke(
      {
        messages: [{ role: "user", content: message }],
        booking: {
          step: "idle",
          intent: null,
          name: null,
          email: null,
          slot: null,
          referenceId: null,
          ...booking
        }
      },
      config
    );

    // Save and send confirmation email on new or confirmed booking
    if (
      result.booking?.step === "confirmed" &&
      result.booking.referenceId
    ) {
      const attendeeEmail = result.booking.email || req.authUser?.email;
      const attendeeName = result.booking.name || req.authUser?.name || "there";

      if (result.booking.referenceId !== booking.referenceId) {
        if (attendeeEmail) {
          // 1. Store in Database
          saveBooking({
            referenceId: result.booking.referenceId,
            name: attendeeName,
            email: attendeeEmail,
            slot: result.booking.slot,
            status: "booked"
          });

          // 2. Deliver confirmation email
          try {
            await sendBookingConfirmation({
              email: attendeeEmail,
              name: attendeeName,
              slot: result.booking.slot,
              referenceId: result.booking.referenceId
            });

            result.finalReply +=
              `\n\nA confirmation email has been sent to **${attendeeEmail}**.`;
          } catch (error) {
            console.warn("Booking confirmation email error:", error.message);
            result.finalReply +=
              "\n\nYour review booking has been confirmed and saved to your account! (Email notice was skipped).";
          }
        }
      } else if (
        (result.booking.name && result.booking.name !== booking.name) ||
        (result.booking.email && result.booking.email !== booking.email)
      ) {
        // Name or email changed for an existing confirmed booking
        try {
          updateBookingDetails(
            result.booking.referenceId,
            {
              name: result.booking.name,
              email: result.booking.email
            },
            req.authUser?.email || booking.email
          );
        } catch (err) {
          console.warn("Unauthorized booking update attempt:", err.message);
        }
      }
    } else if (result.booking?.step === "cancelled") {
      let activeRef = result.booking.referenceId || booking.referenceId;
      const attendeeEmail = result.booking.email || req.authUser?.email || booking.email;
      if (!activeRef && attendeeEmail) {
        const userBookings = getBookingsByEmail(attendeeEmail);
        const latestBooked = userBookings.find(b => b.status === "booked" || b.status === "confirmed");
        if (latestBooked) {
          activeRef = latestBooked.referenceId;
        }
      }
      if (activeRef) {
        try {
          updateBookingStatus(activeRef, "cancelled", req.authUser?.email || attendeeEmail);
        } catch (err) {
          console.warn("Unauthorized booking cancellation attempt:", err.message);
        }
      }
    }

    const cleanReply =
      typeof result.finalReply === "string"
        ? result.finalReply
            .replace(
              /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
              ""
            )
            .replace(/[ \t]+/g, " ")
            .trim()
        : result.finalReply;

    res.json({
      success: true,
      reply: cleanReply,
      threadId: rawThreadId,
      activeNode: result.activeNode,
      booking: result.booking
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process the conversation."
    });
  }
});

// ---------- user bookings endpoints ----------

app.get("/api/user/bookings", requireAuthentication, (req, res) => {
  try {
    const userBookings = getBookingsByEmail(req.authUser.email);
    res.json({
      success: true,
      email: req.authUser.email,
      name: req.authUser.name,
      bookings: userBookings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/user/bookings/:referenceId/cancel", requireAuthentication, (req, res) => {
  try {
    const { referenceId } = req.params;
    const updated = updateBookingStatus(referenceId, "cancelled", req.authUser.email);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    res.json({
      success: true,
      message: "Booking has been cancelled.",
      booking: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ---------- startup ----------

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Starting handbook indexing in the background...");
      startRagIngestion().catch((error) => {
        console.error("Handbook indexing failed:", error.message);
      });
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;