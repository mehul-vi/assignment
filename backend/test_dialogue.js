import { ingestPDF } from "./rag/ingest.js";
import { agentGraph } from "./agent/graph.js";

async function runTestDialogue() {
  console.log("=================================================");
  console.log(" TESTING MULTI-TURN AGENTIC WORKFLOW (LANGGRAPH) ");
  console.log("=================================================\n");

  // Step 1: Ensure PDF is ingested
  console.log("[Setup] Ingesting Reference PDF...");
  await ingestPDF();
  console.log("[Setup] PDF ingested and ready.\n");

  const threadId = "test-session-" + Date.now();
  const config = { configurable: { thread_id: threadId } };
  const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

  const nameOnlyResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "Aisha Khan" }],
      booking: {
        step: "idle",
        intent: null,
        name: null,
        email: null,
        slot: null,
        referenceId: null
      }
    },
    config
  );

  if (
    nameOnlyResult.booking?.name !== "Aisha Khan" ||
    !nameOnlyResult.finalReply.toLowerCase().includes("email") ||
    nameOnlyResult.finalReply.toLowerCase().includes("full name")
  ) {
    throw new Error(`Name-only booking flow failed: ${nameOnlyResult.finalReply}`);
  }

  await delay(600);
  const thirdSlotResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "3rd slot book kar de" }],
      booking: {
        step: "awaiting_slot",
        intent: "performance_review",
        name: "Aisha Khan",
        email: "aisha.khan@company.com",
        slot: null,
        referenceId: null
      }
    },
    config
  );

  if (
    thirdSlotResult.booking?.slot !== "Friday 10:30 AM" ||
    !thirdSlotResult.finalReply.toLowerCase().includes("confirmed")
  ) {
    throw new Error(`Third-slot booking flow failed: ${thirdSlotResult.finalReply}`);
  }

  await delay(600);
  const generalChatResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "how are you today?" }],
      booking: {
        step: "idle",
        intent: null,
        name: null,
        email: null,
        slot: null,
        referenceId: null
      }
    },
    config
  );

  if (generalChatResult.routerDecision !== "chitchat" || !generalChatResult.finalReply.toLowerCase().includes("how can i help you today")) {
    throw new Error(`General chat should stay in chitchat flow: ${generalChatResult.finalReply}`);
  }

  await delay(600);
  const directSlotClickResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "Tomorrow 3:00 PM" }],
      booking: {
        step: "idle",
        intent: null,
        name: null,
        email: null,
        slot: null,
        referenceId: null
      }
    },
    config
  );

  if (
    directSlotClickResult.booking?.step !== "awaiting_details" ||
    directSlotClickResult.booking?.name !== null ||
    directSlotClickResult.booking?.email !== null ||
    !directSlotClickResult.finalReply.toLowerCase().includes("full name")
  ) {
    throw new Error(`Direct slot click should ask for missing details: ${directSlotClickResult.finalReply}`);
  }

  await delay(600);
  const selectedSlotThenDetailsResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "Let's go with Tomorrow 11:00 AM" }],
      booking: {
        step: "idle",
        intent: null,
        name: null,
        email: null,
        slot: null,
        referenceId: null
      }
    },
    config
  );

  if (
    selectedSlotThenDetailsResult.booking?.slot !== "Tomorrow 11:00 AM" ||
    selectedSlotThenDetailsResult.booking?.step !== "awaiting_details" ||
    !selectedSlotThenDetailsResult.finalReply.toLowerCase().includes("full name")
  ) {
    throw new Error(`Selected slot should prompt for missing details: ${selectedSlotThenDetailsResult.finalReply}`);
  }

  await delay(600);
  const finalSlotConfirmationResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "mehul@gmai.com" }],
      booking: {
        step: "awaiting_details",
        intent: "performance_review",
        name: "Mehul",
        email: null,
        slot: "Tomorrow 11:00 AM",
        referenceId: null
      }
    },
    config
  );

  if (
    finalSlotConfirmationResult.booking?.step !== "confirmed" ||
    finalSlotConfirmationResult.booking?.slot !== "Tomorrow 11:00 AM" ||
    !finalSlotConfirmationResult.finalReply.toLowerCase().includes("confirmed")
  ) {
    throw new Error(`Slot already selected should confirm after final details: ${finalSlotConfirmationResult.finalReply}`);
  }

  await delay(600);
  const cancellationResult = await agentGraph.invoke(
    {
      messages: [{ role: "user", content: "cancel my slot" }],
      booking: {
        step: "confirmed",
        intent: "performance_review",
        name: "Aisha Khan",
        email: "aisha.khan@company.com",
        slot: "Friday 10:30 AM",
        referenceId: "#REV-1234"
      }
    },
    config
  );

  if (
    cancellationResult.booking?.step !== "cancelled" ||
    !cancellationResult.finalReply.toLowerCase().includes("cancelled")
  ) {
    throw new Error(`Cancellation flow failed: ${cancellationResult.finalReply}`);
  }

  const turns = [
    "Hi, I need to book a 1-on-1 Performance Review session.",
    "Alex Chen (alex.chen@example.com). Wait, before that, how often are performance reviews conducted according to the handbook?",
    "Let's go with Friday at 10:30 AM."
  ];

  for (let i = 0; i < turns.length; i++) {
    const userMessage = turns[i];
    console.log(`\n-------------------------------------------------`);
    console.log(`TURN ${i + 1}`);
    console.log(`User: ${userMessage}`);

    await delay(600);
    // Invoke LangGraph with checkpointer thread_id
    const result = await agentGraph.invoke(
      {
        messages: [{ role: "user", content: userMessage }]
      },
      config
    );

    console.log(`Agent: ${result.finalReply}`);
    console.log(`[State Debug] Active Node: ${result.activeNode} | Booking Step: ${result.booking?.step} | Name: ${result.booking?.name} | Email: ${result.booking?.email}`);
  }

  console.log(`\n=================================================`);
  console.log(" DIALOGUE TEST COMPLETED SUCCESSFULLY ");
  console.log("=================================================");
}

runTestDialogue().catch(console.error);
