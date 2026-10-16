import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

export function getAllBookings() {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[bookingsDb] Read error:", err.message);
    return [];
  }
}

function writeAllBookings(bookings) {
  ensureFileExists();
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[bookingsDb] Write error:", err.message);
    return false;
  }
}

export function getBookingsByEmail(email) {
  if (!email || typeof email !== "string") return [];
  const normalized = email.trim().toLowerCase();
  const all = getAllBookings();
  return all
    .filter(b => (b.email || "").toLowerCase() === normalized)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function saveBooking({ referenceId, name, email, slot, status = "booked" }) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const all = getAllBookings();

  const now = new Date().toISOString();
  const existingIndex = referenceId
    ? all.findIndex(b => b.referenceId === referenceId)
    : -1;

  if (existingIndex >= 0) {
    all[existingIndex] = {
      ...all[existingIndex],
      name: name || all[existingIndex].name,
      email: normalizedEmail,
      slot: slot || all[existingIndex].slot,
      status: status || all[existingIndex].status,
      updatedAt: now
    };
    writeAllBookings(all);
    return all[existingIndex];
  }

  const newBooking = {
    id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    referenceId: referenceId || `#REV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: name || "User",
    email: normalizedEmail,
    slot: slot || "TBD",
    status, // "booked" | "cancelled" | "attended"
    createdAt: now,
    updatedAt: now
  };

  all.unshift(newBooking);
  writeAllBookings(all);
  return newBooking;
}

export function updateBookingStatus(referenceId, newStatus, email = null) {
  if (!referenceId) return null;
  const all = getAllBookings();
  const index = all.findIndex(b => b.referenceId === referenceId);
  if (index === -1) return null;

  if (email && (all[index].email || "").toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("Unauthorized: Booking does not belong to this user.");
  }

  all[index] = {
    ...all[index],
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  writeAllBookings(all);
  return all[index];
}

export function updateBookingDetails(referenceId, { name, email }, authEmail = null) {
  if (!referenceId) return null;
  const all = getAllBookings();
  const index = all.findIndex(b => b.referenceId === referenceId);
  if (index === -1) return null;

  if (authEmail && (all[index].email || "").toLowerCase() !== authEmail.trim().toLowerCase()) {
    throw new Error("Unauthorized: Booking does not belong to this user.");
  }

  all[index] = {
    ...all[index],
    name: name || all[index].name,
    email: email ? email.trim().toLowerCase() : all[index].email,
    updatedAt: new Date().toISOString()
  };

  writeAllBookings(all);
  return all[index];
}

