
import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

export default function ChatInput({
  onSendMessage,
  isLoading,
  bookingStep,
}) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const getPlaceholder = () => {
    if (isLoading) return "Assistant is replying...";
    if (bookingStep === "awaiting_slot") {
      return "Choose a slot above or type your preferred time...";
    }
    if (bookingStep === "awaiting_details") {
      return "Enter your full name and work email...";
    }
    return "Ask a question or book a meeting...";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const message = text.trim();

    if (!message || isLoading) return;

    onSendMessage(message);
    setText("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 rounded-xl border bg-white p-2 transition-all duration-200 ${isLoading
          ? "border-[#e8e7e1] bg-[#fafaf8]"
          : "border-[#e3e2dc] shadow-[0_2px_8px_rgba(30,30,20,0.03)] focus-within:border-[#aaa99f] focus-within:ring-2 focus-within:ring-[#77786c]/10"
        }`}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={getPlaceholder()}
        disabled={isLoading}
        autoComplete="off"
        aria-label="Message the assistant"
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm leading-6 text-[#30312b] outline-none placeholder:text-[#a1a197] disabled:cursor-not-allowed disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={!text.trim() || isLoading}
        aria-label={isLoading ? "Sending message" : "Send message"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#30312b] text-white transition-colors duration-150 hover:bg-[#45463e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#77786c] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#efeee8] disabled:text-[#aaa99f]"
      >
        {isLoading ? (
          <LoaderCircle
            size={17}
            strokeWidth={1.8}
            className="animate-spin"
            aria-hidden="true"
          />
        ) : (
          <ArrowUp
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
      </button>
    </form>
  );
}
