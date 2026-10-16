import assert from "node:assert";
import { isValidThreadId, getGraphThreadId } from "./auth.js";
import { updateBookingStatus, updateBookingDetails, saveBooking, getAllBookings } from "./bookingsDb.js";

console.log("==========================================");
console.log(" TESTING THREAD ID & SECURITY ISOLATION   ");
console.log("==========================================\n");

// 1. Thread ID Validation
console.log("[Test 1] Testing isValidThreadId...");
assert.strictEqual(isValidThreadId("thread-550e8400-e29b-41d4-a716-446655440000"), true);
assert.strictEqual(isValidThreadId("550e8400-e29b-41d4-a716-446655440000"), true);
assert.strictEqual(isValidThreadId("test-session-12345"), true);
// Malicious or invalid inputs must be rejected:
assert.strictEqual(isValidThreadId(""), false);
assert.strictEqual(isValidThreadId("user:evil-hash:thread-1"), false, "Colons must be rejected to prevent namespace injection");
assert.strictEqual(isValidThreadId("../../../etc/passwd"), false, "Path traversal tokens must be rejected");
assert.strictEqual(isValidThreadId("thread 123"), false, "Spaces must be rejected");
assert.strictEqual(isValidThreadId(null), false);
assert.strictEqual(isValidThreadId(undefined), false);
console.log("✔ isValidThreadId passed all format and security assertions.\n");

// 2. LangGraph Namespace Partitioning
console.log("[Test 2] Testing getGraphThreadId namespace isolation...");
const guestThread = getGraphThreadId("thread-abc-123", null);
assert.strictEqual(guestThread, "guest:thread-abc-123", "Guests must be strictly quarantined in guest namespace");

const user1Thread = getGraphThreadId("thread-abc-123", { email: "alice@example.com" });
assert.ok(user1Thread.startsWith("user:"), "Authenticated user must start with user namespace");
assert.ok(user1Thread.endsWith(":thread-abc-123"));

const user2Thread = getGraphThreadId("thread-abc-123", { email: "bob@example.com" });
assert.ok(user2Thread.startsWith("user:"));
assert.notStrictEqual(user1Thread, user2Thread, "Different users with identical client thread IDs must have different LangGraph state keys");
assert.notStrictEqual(guestThread, user1Thread, "Guest and authenticated user must never share state");

assert.throws(() => {
  getGraphThreadId("invalid:with:colons", null);
}, /Invalid Thread ID format/);
console.log("✔ Namespace isolation verified successfully.\n");

// 3. Booking Ownership Authorization
console.log("[Test 3] Testing Booking Ownership Protection...");
const sampleBooking = saveBooking({
  referenceId: "#TEST-SEC-1",
  name: "Target User",
  email: "target@company.com",
  slot: "Tomorrow 11:00 AM"
});
assert.ok(sampleBooking);

// Attacker tries to cancel target's booking
assert.throws(() => {
  updateBookingStatus("#TEST-SEC-1", "cancelled", "attacker@company.com");
}, /Unauthorized: Booking does not belong to this user/);

// Legitimate owner cancels their booking
const cancelled = updateBookingStatus("#TEST-SEC-1", "cancelled", "target@company.com");
assert.strictEqual(cancelled.status, "cancelled");

// Attacker tries to update target's booking details
assert.throws(() => {
  updateBookingDetails("#TEST-SEC-1", { name: "Hacked" }, "attacker@company.com");
}, /Unauthorized: Booking does not belong to this user/);

// Legitimate owner updates booking details
const updated = updateBookingDetails("#TEST-SEC-1", { name: "Updated Target" }, "target@company.com");
assert.strictEqual(updated.name, "Updated Target");

console.log("✔ Booking ownership protection verified successfully.\n");

// Cleanup test booking
import fs from "fs";
import path from "path";
const clean = getAllBookings().filter(b => b.referenceId !== "#TEST-SEC-1");
fs.writeFileSync(path.join(process.cwd(), "data", "bookings.json"), JSON.stringify(clean, null, 2), "utf8");

console.log("==========================================");
console.log(" ALL SECURITY & ISOLATION TESTS PASSED!   ");
console.log("==========================================");
