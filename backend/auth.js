import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";

import { sendLoginCode } from "./email.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

const challenges = new Map();
const sessions = new Map();

// ---------- helpers ----------

function authError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  if (typeof email !== "string") {
    throw authError("Enter a valid email address.", 400);
  }

  const normalized = email.trim().toLowerCase();

  if (normalized.length > 254 || !emailPattern.test(normalized)) {
    throw authError("Enter a valid email address.", 400);
  }

  return normalized;
}

function normalizeName(name) {
  if (typeof name !== "string") {
    throw authError("Enter your full name.", 400);
  }

  const normalized = name.trim().replace(/\s+/g, " ");

  if (
    normalized.length < 2 ||
    normalized.length > 80 ||
    !namePattern.test(normalized)
  ) {
    throw authError("Enter a valid name (2-80 letters).", 400);
  }

  return normalized;
}

// safe buffer compare — length mismatch pe crash nahi hoga
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// ---------- exported API ----------

// Thread ID validation: alphanumeric, hyphens, and underscores only (1-128 chars).
// Prevents namespace injection and directory traversal tokens.
export function isValidThreadId(threadId) {
  if (typeof threadId !== "string") return false;
  const trimmed = threadId.trim();
  return /^[a-zA-Z0-9_-]{1,128}$/.test(trimmed);
}

// Generate or resolve a secure LangGraph checkpoint thread ID
export function getGraphThreadId(requestedThreadId, authUser = null) {
  if (!isValidThreadId(requestedThreadId)) {
    throw authError("Invalid Thread ID format.", 400);
  }

  const cleanId = requestedThreadId.trim();

  // If user is authenticated, namespace to their unique cryptographic user hash
  if (authUser && authUser.email) {
    const userHash = createHash("sha256")
      .update(authUser.email.toLowerCase())
      .digest("hex")
      .slice(0, 24);
    return `user:${userHash}:${cleanId}`;
  }

  // Guest users are strictly quarantined to the guest namespace
  return `guest:${cleanId}`;
}

// Create a separate thread ID for each user (backward-compatible)
export function getUserThreadId(email, requestedThreadId) {
  const userId = createHash("sha256")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 24);

  let threadId = "default-session";

  if (typeof requestedThreadId === "string" && isValidThreadId(requestedThreadId)) {
    threadId = requestedThreadId.trim();
  }

  return `user:${userId}:${threadId}`;
}

// Send a login code to the user's email
export async function requestEmailCode(email, name, sendCode = sendLoginCode) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);
  const previous = challenges.get(normalizedEmail);

  if (previous && Date.now() - previous.sentAt < RESEND_DELAY_MS) {
    throw authError("Wait one minute before requesting another code.", 429);
  }

  const code = String(randomInt(100000, 1000000));

  try {
    await sendCode(normalizedEmail, code);
  } catch (error) {
    throw authError(
      error.message || "Could not send the sign-in code.",
      503
    );
  }

  const now = Date.now();

  challenges.set(normalizedEmail, {
    code,
    name: normalizedName,
    expiresAt: now + CODE_TTL_MS,
    sentAt: now,
    attempts: 0
  });

  return {
    email: normalizedEmail,
    expiresInSeconds: CODE_TTL_MS / 1000
  };
}

// Verify login code and create a session
export function verifyEmailCode(email, submittedCode) {
  const normalizedEmail = normalizeEmail(email);
  const challenge = challenges.get(normalizedEmail);

  if (!challenge || Date.now() >= challenge.expiresAt) {
    challenges.delete(normalizedEmail);
    throw authError("That code has expired. Request a new one.", 401);
  }

  if (
    typeof submittedCode !== "string" ||
    !/^\d{6}$/.test(submittedCode)
  ) {
    throw authError("Enter the six-digit code from your email.", 400);
  }

  challenge.attempts++;

  if (
    challenge.attempts > MAX_CODE_ATTEMPTS ||
    !safeEqual(challenge.code, submittedCode)
  ) {
    if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
      challenges.delete(normalizedEmail);
    }

    throw authError("The sign-in code is incorrect or expired.", 401);
  }

  challenges.delete(normalizedEmail);

  const token = randomBytes(32).toString("base64url");

  sessions.set(token, {
    email: normalizedEmail,
    name: challenge.name,
    expiresAt: Date.now() + SESSION_TTL_MS
  });

  return {
    token,
    email: normalizedEmail,
    name: challenge.name,
    expiresInSeconds: SESSION_TTL_MS / 1000
  };
}

// Get the currently authenticated user
export function getAuthenticatedUser(authorization) {
  let token = null;

  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    token = authorization.slice(7);
  }

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session || Date.now() >= session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return {
    token,
    email: session.email,
    name: session.name
  };
}

export function updateAuthenticatedUserName(token, name) {
  const session = sessions.get(token);

  if (!session || Date.now() >= session.expiresAt) {
    sessions.delete(token);
    throw authError("Your session has expired. Please sign in again.", 401);
  }

  session.name = normalizeName(name);

  return {
    email: session.email,
    name: session.name
  };
}

export function revokeSession(token) {
  if (token) {
    sessions.delete(token);
  }
}