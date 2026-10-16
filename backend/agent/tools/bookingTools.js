import { z } from "zod";

const AVAILABLE_SLOTS = [
  "Tomorrow 11:00 AM",
  "Tomorrow 3:00 PM",
  "Friday 10:30 AM"
];

const slotSelectionSchema = z.object({
  matchedSlot: z.string().nullable()
});

// ---------- read ----------

export function getAvailableSlots() {
  return [...AVAILABLE_SLOTS];
}

// ---------- matching ----------

export function matchExactSlot(userInput) {
  const text = String(userInput || "")
    .toLowerCase()
    .replace(/\bat\b/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    AVAILABLE_SLOTS.find((slot) =>
      text.includes(slot.toLowerCase().replace(/\s+/g, " "))
    ) || null
  );
}

export function matchOrdinalSlot(userInput, allowBareOrdinal = false) {
  const text = String(userInput || "").toLowerCase().trim();
  if (/\b(?:not|don't|dont|no|nahi|mat)\b/.test(text)) return null;

  const ordinal = "first|1st|pehla|pehli|1|second|2nd|doosra|dusra|doosri|dusri|2|third|3rd|teesra|tisra|3|last";
  const match = text.match(new RegExp(
    `\\b(?:slot|option)\\s*(${ordinal})\\b|\\b(${ordinal})\\s+(?:slot|option|one|wala|waala|waale)\\b|\\b(?:book|choose|select|pick|take|reserve)\\s+(?:the\\s+)?(${ordinal})\\b`,
    "i"
  ));
  const value = match?.slice(1).find(Boolean) ||
    (allowBareOrdinal && new RegExp(`^(?:${ordinal})$`, "i").test(text) ? text : null);

  if (!value) return null;
  if (/^(?:first|1st|pehla|pehli|1)$/i.test(value)) return AVAILABLE_SLOTS[0];
  if (/^(?:second|2nd|doosra|dusra|doosri|dusri|2)$/i.test(value)) return AVAILABLE_SLOTS[1];
  if (/^(?:third|3rd|teesra|tisra|3|last)$/i.test(value)) return AVAILABLE_SLOTS[2];
  return null;
}

export async function matchSlotWithLLM(userInput, availableSlots, llm) {
  if (!userInput || !llm) return null;

  const slots = availableSlots?.length ? availableSlots : AVAILABLE_SLOTS;

  const prompt = `Match the user's slot choice to one of the available slots.

Available slots:
${slots.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

User: "${userInput}"

Rules:
- Understand English, Hindi, and Hinglish.
- Ordinals: 1st/first/pehla → slot 1; 2nd/second/doosra → slot 2; 3rd/third/teesra/last → slot 3.
- Time expressions: "kal 3 baje", "friday 10:30", "tomorrow morning", etc.
- Return null for questions, personal info, cancellation, or non-existent slots (4th, Saturday).
- Output the EXACT slot string, or null. Never invent times.`;

  // try structured output first
  try {
    const structured = llm.withStructuredOutput(slotSelectionSchema);
    const result = await structured.invoke(prompt);

    if (result?.matchedSlot && slots.includes(result.matchedSlot)) {
      return result.matchedSlot;
    }
    return null;
  } catch (err) {
    console.warn("[matchSlotWithLLM] Structured output failed:", err.message);
  }

  // fallback: parse raw JSON
  try {
    const response = await llm.invoke(
      `${prompt}\n\nRespond ONLY with JSON: {"matchedSlot": "slot string or null"}`
    );

    const raw = Array.isArray(response?.content)
      ? response.content.map((c) => c?.text || "").join(" ")
      : response?.content || "";

    const parsed = JSON.parse(String(raw).replace(/```json|```/g, "").trim());

    if (parsed?.matchedSlot && slots.includes(parsed.matchedSlot)) {
      return parsed.matchedSlot;
    }
  } catch (fallbackErr) {
    console.warn("[matchSlotWithLLM] JSON fallback failed:", fallbackErr.message);
  }

  return null;
}

// ---------- validation ----------

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// ---------- booking ----------

export function bookAppointment(name, email, slot) {
  const ref = `#REV-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  return { name, email, slot, referenceId: ref };
}