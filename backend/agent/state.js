import { Annotation } from "@langchain/langgraph";

// ----- reducers -----

// append new messages, keep history
function appendMessages(current, update) {
  if (!update) return current;
  return Array.isArray(update) ? [...current, ...update] : [...current, update];
}

// shallow-merge booking updates
function mergeBooking(current, update) {
  if (!update) return current;
  return { ...current, ...update };
}

// plain overwrite
const overwrite = (current, update) => update ?? current;

// ----- state -----

export const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: appendMessages,
    default: () => []
  }),

  booking: Annotation({
    reducer: mergeBooking,
    default: () => ({
      step: "idle",        // idle | awaiting_details | awaiting_slot | confirmed | cancelled
      intent: null,
      name: null,
      email: null,
      slot: null,
      referenceId: null
    })
  }),

  activeNode: Annotation({ reducer: overwrite, default: () => "router" }),
  routerDecision: Annotation({ reducer: overwrite, default: () => "chitchat" }),
  faqQuestion: Annotation({ reducer: overwrite, default: () => null }),
  faqAnswer: Annotation({ reducer: overwrite, default: () => null }),
  finalReply: Annotation({ reducer: overwrite, default: () => "" })
});