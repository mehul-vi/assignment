
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  CalendarDays,
  CalendarCheck,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Plus,
} from "lucide-react";

import Header from "./components/Header.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import ChatInput from "./components/ChatInput.jsx";
import SlotPicker from "./components/SlotPicker.jsx";
import AuthPanel from "./components/AuthPanel.jsx";
import BookingsModal from "./components/BookingsModal.jsx";

import {
  sendChatMessage,
  fetchSlots,
  requestEmailCode,
  verifyEmailCode,
  getAuthSession,
  logoutSession,
  updateAuthProfile,
  fetchUserBookings,
  cancelUserBooking,
} from "./services/api.js";

const STORAGE_KEY_THREAD = "zava_chat_thread_id";
const STORAGE_KEY_MESSAGES = "zava_chat_messages";
const STORAGE_KEY_BOOKING = "zava_chat_booking";
const STORAGE_KEY_AUTH_TOKEN = "zava_auth_token";
const STORAGE_KEY_AUTH_EMAIL = "zava_auth_email";
const STORAGE_KEY_AUTH_NAME = "zava_auth_name";

const DEFAULT_WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hi! How can I help you today? You can ask me questions about the Employee Handbook or book a 1-on-1 Performance Review.",
};

function generateSecureThreadId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `thread-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `thread-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `thread-${"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  })}`;
}

function isValidThreadId(id) {
  return (
    typeof id === "string" &&
    /^thread-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      id.trim()
    )
  );
}

function getInitialThreadId() {
  const saved = localStorage.getItem(STORAGE_KEY_THREAD);

  // Preserve existing thread ID across refreshes if already a secure UUID
  if (saved && isValidThreadId(saved)) {
    return saved.trim();
  }

  // Generate new secure UUID thread ID (upgrades legacy predictable thread IDs)
  const newId = generateSecureThreadId();
  localStorage.setItem(STORAGE_KEY_THREAD, newId);

  return newId;
}

function getInitialMessages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter(
          (message) =>
            !(
              message.role === "assistant" &&
              typeof message.content === "string" &&
              message.content.startsWith("Error:")
            )
        );

        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch (error) {
    console.warn("Failed to load messages:", error);
  }

  return [DEFAULT_WELCOME_MESSAGE];
}

function getInitialBooking() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOOKING);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load booking:", error);
  }

  return { step: "idle" };
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group rounded-xl border border-[#e5e4de] bg-white p-5 text-left transition-colors hover:border-[#c8c7bd] hover:bg-[#fdfdfb] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[#e9e8e1] bg-[#f5f4ef] text-[#45463f]">
        <Icon size={19} strokeWidth={1.7} />
      </span>

      <span className="block text-sm font-semibold text-[#30312b]">
        {title}
      </span>

      <span className="mt-2 block text-xs leading-5 text-[#77786f]">
        {description}
      </span>

      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#55564e] transition-colors group-hover:text-[#30312b]">
        {actionLabel}
        <ChevronRight
          size={14}
          strokeWidth={1.7}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

export default function App() {
  const [threadId, setThreadId] = useState(getInitialThreadId);
  const [messages, setMessages] = useState(getInitialMessages);
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState(getInitialBooking);

  const [authToken, setAuthToken] = useState(() =>
    sessionStorage.getItem(STORAGE_KEY_AUTH_TOKEN)
  );

  const [authEmail, setAuthEmail] = useState(
    () => sessionStorage.getItem(STORAGE_KEY_AUTH_EMAIL) || ""
  );

  const [authName, setAuthName] = useState(
    () => sessionStorage.getItem(STORAGE_KEY_AUTH_NAME) || ""
  );

  const [authStage, setAuthStage] = useState(() =>
    sessionStorage.getItem(STORAGE_KEY_AUTH_TOKEN)
      ? "checking"
      : "unauthenticated"
  );

  const [authCode, setAuthCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const [copiedSidebar, setCopiedSidebar] = useState(false);
  const messagesEndRef = useRef(null);

  const handleCopySidebarThread = async () => {
    if (!threadId) return;
    try {
      await navigator.clipboard.writeText(threadId);
      setCopiedSidebar(true);
      setTimeout(() => setCopiedSidebar(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = threadId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedSidebar(true);
      setTimeout(() => setCopiedSidebar(false), 2000);
    }
  };

  const loadBookings = useCallback(async (token = authToken) => {
    if (!token) {
      setUserBookings([]);
      return;
    }

    setIsLoadingBookings(true);

    try {
      const data = await fetchUserBookings(token);
      setUserBookings(data || []);
    } catch (error) {
      console.warn("Failed to fetch user bookings:", error.message);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [authToken]);

  // Restore the saved authentication session.
  useEffect(() => {
    if (!authToken) {
      setUserBookings([]);
      setAuthStage("unauthenticated");
      return;
    }

    let active = true;

    getAuthSession(authToken)
      .then((session) => {
        if (!active) return;

        setAuthEmail(session.email);
        setAuthName(session.name || "");

        sessionStorage.setItem(STORAGE_KEY_AUTH_EMAIL, session.email);
        sessionStorage.setItem(
          STORAGE_KEY_AUTH_NAME,
          session.name || ""
        );

        setAuthStage("authenticated");
        loadBookings(session.token);
      })
      .catch(() => {
        if (!active) return;

        sessionStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
        sessionStorage.removeItem(STORAGE_KEY_AUTH_EMAIL);
        sessionStorage.removeItem(STORAGE_KEY_AUTH_NAME);

        setAuthToken(null);
        setAuthEmail("");
        setAuthName("");
        setAuthStage("unauthenticated");
        setUserBookings([]);
      });

    return () => {
      active = false;
    };
  }, [authToken, loadBookings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THREAD, threadId);
  }, [threadId]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_MESSAGES,
      JSON.stringify(messages)
    );
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_BOOKING,
      JSON.stringify(booking)
    );
  }, [booking]);

  // Load available meeting slots
  useEffect(() => {
    let active = true;

    fetchSlots()
      .then((data) => {
        if (active) setSlots(data || []);
      })
      .catch((error) => {
        console.warn("Failed to fetch slots:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  const handleReset = () => {
    const newId = generateSecureThreadId();
    const welcomeMessages = [DEFAULT_WELCOME_MESSAGE];
    const emptyBooking = { step: "idle" };

    setThreadId(newId);
    setBooking(emptyBooking);
    setMessages(welcomeMessages);

    localStorage.setItem(STORAGE_KEY_THREAD, newId);
    localStorage.setItem(
      STORAGE_KEY_MESSAGES,
      JSON.stringify(welcomeMessages)
    );
    localStorage.setItem(
      STORAGE_KEY_BOOKING,
      JSON.stringify(emptyBooking)
    );
  };

  const handleRequestCode = async (event) => {
    event?.preventDefault?.();

    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    try {
      await requestEmailCode(authEmail, authName);

      setAuthEmail(authEmail.trim().toLowerCase());
      setAuthName(authName.trim().replace(/\s+/g, " "));
      setAuthCode("");
      setAuthStage("code");

      setAuthNotice(
        "A sign-in code was sent to your email. It expires in 10 minutes."
      );
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event?.preventDefault?.();

    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    try {
      const session = await verifyEmailCode(authEmail, authCode);

      sessionStorage.setItem(STORAGE_KEY_AUTH_TOKEN, session.token);
      sessionStorage.setItem(STORAGE_KEY_AUTH_EMAIL, session.email);
      sessionStorage.setItem(
        STORAGE_KEY_AUTH_NAME,
        session.name || ""
      );

      setAuthToken(session.token);
      setAuthEmail(session.email);
      setAuthName(session.name || "");
      setAuthCode("");
      setAuthStage("authenticated");
      setIsAuthModalOpen(false);

      await loadBookings(session.token);
      setIsBookingsModalOpen(true);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (authToken) {
        await logoutSession(authToken);
      }
    } catch (error) {
      console.warn("Sign-out request failed:", error.message);
    }

    sessionStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_AUTH_EMAIL);
    sessionStorage.removeItem(STORAGE_KEY_AUTH_NAME);

    setAuthToken(null);
    setAuthEmail("");
    setAuthName("");
    setAuthStage("unauthenticated");
    setUserBookings([]);
    setIsAuthModalOpen(false);
    setIsBookingsModalOpen(false);
    setBooking({ step: "idle" });
    setMessages([DEFAULT_WELCOME_MESSAGE]);

    localStorage.removeItem(STORAGE_KEY_BOOKING);
    localStorage.setItem(
      STORAGE_KEY_MESSAGES,
      JSON.stringify([DEFAULT_WELCOME_MESSAGE])
    );
  };

  const handleSaveName = async (name) => {
    const profile = await updateAuthProfile(name, authToken);

    setAuthName(profile.name);
    sessionStorage.setItem(STORAGE_KEY_AUTH_NAME, profile.name);

    setBooking((current) => ({
      ...current,
      name: profile.name,
    }));
  };

  const handleCancelBooking = async (referenceId) => {
    try {
      await cancelUserBooking(referenceId, authToken);
      await loadBookings(authToken);
    } catch (error) {
      alert(error.message || "Failed to cancel booking.");
    }
  };

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        text,
        threadId,
        booking,
        authToken
      );

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.reply,
          activeNode: response.activeNode,
          threadId: response.threadId || threadId,
        },
      ]);

      if (response.booking) {
        setBooking(response.booking);

        if (
          authToken &&
          (response.booking.step === "confirmed" ||
            response.booking.step === "cancelled")
        ) {
          loadBookings(authToken);
        }
      }
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Error: ${error.message ||
            "Could not reach the backend server. Please try again."
            }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlotToReschedule = (targetBooking) => {
    setIsBookingsModalOpen(false);

    handleSend(
      `I would like to reschedule my review booking ${targetBooking.referenceId}`
    );
  };

  const openBookings = () => {
    if (authStage === "authenticated") {
      loadBookings();
      setIsBookingsModalOpen(true);
      return;
    }

    setAuthStage("email");
    setAuthError("");
    setAuthNotice("");
    setIsAuthModalOpen(true);
  };

  const bookedSlotsCount = userBookings.filter(
    (item) =>
      item.status === "booked" ||
      item.status === "confirmed"
  ).length;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f8f8f6] text-[#292a25]">
      <Header
        threadId={threadId}
        onReset={handleReset}
        userEmail={
          authStage === "authenticated" ? authEmail : ""
        }
        userName={authName}
        onSignOut={handleSignOut}
        onSaveName={handleSaveName}
        onOpenBookings={openBookings}
        onOpenAuth={openBookings}
        bookingsCount={bookedSlotsCount}
      />

      <div className="flex min-h-0 flex-1">
        {/* Minimal Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#e7e6e0] bg-[#fafaf8] lg:flex">
          {/* New Conversation */}
          <div className="border-b border-[#eeede8] p-3.5">
            <button
              type="button"
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#30312b] px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-[#45463e] shadow-xs active:scale-[0.99]"
            >
              <Plus size={15} strokeWidth={2} />
              <span>New conversation</span>
            </button>

            <div className="mt-2.5 flex items-center justify-between gap-1.5 px-1 text-[11px] text-[#92938b]">
              <span>Thread ID</span>
              <div className="flex items-center gap-1">
                <code
                  className="max-w-[120px] truncate rounded bg-[#f0efe9] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#45463f]"
                  title={threadId}
                >
                  {threadId}
                </code>
                <button
                  type="button"
                  onClick={handleCopySidebarThread}
                  aria-label="Copy Thread ID"
                  title={copiedSidebar ? "Copied!" : "Copy Thread ID"}
                  className="flex h-5 w-5 items-center justify-center rounded text-[#85867d] transition hover:bg-[#edece6] hover:text-[#30312b]"
                >
                  {copiedSidebar ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* My Bookings */}
          <div className="p-3">
            <button
              type="button"
              onClick={openBookings}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-xs font-medium text-[#55564e] transition hover:bg-[#f0efe9] hover:text-[#30312b]"
            >
              <span className="flex items-center gap-2">
                <CalendarDays
                  size={15}
                  className="text-[#77786f]"
                />
                <span>My Bookings</span>
              </span>

              {bookedSlotsCount > 0 ? (
                <span className="rounded-md bg-[#e7e6e0] px-1.5 py-0.5 text-[10px] font-semibold text-[#45463f]">
                  {bookedSlotsCount}
                </span>
              ) : (
                <span className="text-[10px] text-[#92938b]">
                  {authStage === "authenticated" ? "0" : "Sign in"}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* Chat Workspace */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Message List */}
          <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
              {messages.length === 1 &&
                messages[0].role === "assistant" && (
                  <div className="mb-8 border-b border-[#e7e6e0] pb-7">
                    <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#85867d]">
                      Get started
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <QuickActionCard
                        icon={FileText}
                        title="Explore employee policies"
                        description="Find answers about leave, benefits and workplace guidelines."
                        actionLabel="Ask a question"
                        disabled={isLoading}
                        onClick={() =>
                          handleSend(
                            "What are the key policies in the Employee Handbook?"
                          )
                        }
                      />

                      <QuickActionCard
                        icon={CalendarCheck}
                        title="Book a performance review"
                        description="Check available times and arrange a meeting."
                        actionLabel="View booking options"
                        disabled={isLoading}
                        onClick={() =>
                          handleSend(
                            "I would like to book a 1-on-1 Performance Review."
                          )
                        }
                      />
                    </div>
                  </div>
                )}

              {slots.length > 0 && (
                <SlotPicker
                  slots={slots}
                  onSelectSlot={handleSend}
                  booking={booking}
                  isLoading={isLoading}
                />
              )}

              <div className="space-y-5">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={`${threadId}-${index}`}
                    message={message}
                  />
                ))}
              </div>

              {isLoading && (
                <div className="my-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e4de] bg-white text-[#45463f]">
                    <Bot size={18} strokeWidth={1.7} />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-[#e5e4de] bg-white px-4 py-3 shadow-2xs">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 [animation-delay:300ms]" />
                    </span>

                    <span className="text-xs text-[#55564e]">
                      <span className="font-semibold text-[#30312b]">LangGraph:</span> Routing & evaluating agent node...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </section>

          {/* Chat Input */}
          <footer className="shrink-0 border-t border-[#e7e6e0] bg-[#f8f8f6] px-3 py-3 sm:px-7 sm:py-4 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
              <ChatInput
                onSendMessage={handleSend}
                isLoading={isLoading}
                bookingStep={booking?.step}
              />
            </div>
          </footer>
        </main>
      </div>

      {/* Sign-in Modal */}
      {isAuthModalOpen && (
        <AuthPanel
          stage={
            authStage === "authenticated" ? "email" : authStage
          }
          name={authName}
          email={authEmail}
          code={authCode}
          busy={authBusy}
          error={authError}
          notice={authNotice}
          onEmailChange={setAuthEmail}
          onNameChange={setAuthName}
          onCodeChange={setAuthCode}
          onRequestCode={handleRequestCode}
          onVerifyCode={handleVerifyCode}
          onClose={() => setIsAuthModalOpen(false)}
          onBack={() => {
            setAuthStage("email");
            setAuthCode("");
            setAuthError("");
            setAuthNotice("");
          }}
        />
      )}

      {/* Bookings Dashboard */}
      <BookingsModal
        isOpen={isBookingsModalOpen}
        onClose={() => setIsBookingsModalOpen(false)}
        bookings={userBookings}
        isLoading={isLoadingBookings}
        onCancelBooking={handleCancelBooking}
        onSelectSlotToReschedule={handleSelectSlotToReschedule}
        userEmail={authEmail}
      />
    </div>
  );
}
