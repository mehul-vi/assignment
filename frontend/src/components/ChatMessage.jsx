
import { Fragment, useState } from "react";
import {
  Bot,
  BookOpen,
  Check,
  Copy,
} from "lucide-react";

function formatMarkdown(text) {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return (
      <Fragment key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong
                key={partIdx}
                className="font-semibold text-[#292a25]"
              >
                {part.slice(2, -2)}
              </strong>
            );
          }

          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code
                key={partIdx}
                className="rounded bg-[#f3f2ed] px-1.5 py-0.5 font-mono text-[0.9em] text-[#8b4545]"
              >
                {part.slice(1, -1)}
              </code>
            );
          }

          return part;
        })}

        {lineIdx < lines.length - 1 && <br />}
      </Fragment>
    );
  });
}

function HandbookCitation({ pageNumber }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#e7e6e0] bg-[#fafaf8] px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#68695f] ring-1 ring-[#e7e6e0]">
        <BookOpen size={17} strokeWidth={1.7} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-[#383932]">
          Employee Handbook
        </p>
        <p className="mt-1 text-xs text-[#85867d]">
          Page {pageNumber}
        </p>
      </div>
    </div>
  );
}

function MessageContent({ content, isUser }) {
  if (!content) return null;

  const citationRegex = /\[FAQ RAG Node - Citing Page (\d+)\]:\s*/i;
  const match = content.match(citationRegex);

  let cleanContent = match
    ? content.replace(citationRegex, "").trim()
    : content;

  // Remove emojis/icons (e.g. 🎉, 📅, etc.) from displayed text
  cleanContent = cleanContent
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/[ \t]+/g, " ");

  return (
    <div className="min-w-0">
      {match && !isUser && (
        <HandbookCitation pageNumber={match[1]} />
      )}

      <div
        className={`break-words text-sm leading-7 ${
          isUser ? "text-white" : "text-[#4f5048]"
        }`}
      >
        {formatMarkdown(cleanContent)}
      </div>
    </div>
  );
}

const NODE_CONFIG = {
  router: {
    nodeName: "router",
    color: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  faq_node: {
    nodeName: "faq_node",
    color: "border-indigo-200 bg-indigo-50 text-indigo-800",
    dot: "bg-indigo-500",
  },
  faq_rag_node: {
    nodeName: "faq_node",
    color: "border-indigo-200 bg-indigo-50 text-indigo-800",
    dot: "bg-indigo-500",
  },
  booking_node: {
    nodeName: "booking_node",
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  chitchat_node: {
    nodeName: "chitchat_node",
    color: "border-stone-200 bg-stone-100 text-stone-700",
    dot: "bg-stone-500",
  },
};

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const nodeInfo =
    !isUser && message.activeNode
      ? NODE_CONFIG[message.activeNode] || {
          nodeName: message.activeNode,
          color: "border-stone-200 bg-stone-50 text-stone-700",
          dot: "bg-stone-400",
        }
      : null;

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group my-5 flex w-full items-start gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e7e6e0] bg-white text-[#55564e]">
          <Bot size={17} strokeWidth={1.7} />
        </div>
      )}

      <div
        className={`relative min-w-0 max-w-[92%] sm:max-w-[80%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-[#30312b] px-4 py-3"
            : "rounded-2xl border border-[#e7e6e0] bg-white px-4 py-4 sm:px-5"
        }`}
      >
        {!isUser && nodeInfo && (
          <div className="mb-3 flex items-center justify-between border-b border-[#eeede8] pb-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-mono font-medium ${nodeInfo.color}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${nodeInfo.dot}`} />
              <span>{nodeInfo.nodeName}</span>
            </span>

            <button
              type="button"
              onClick={handleCopy}
              className="rounded p-1 text-[#85867d] opacity-0 transition-opacity hover:text-[#30312b] group-hover:opacity-100"
              title="Copy response"
            >
              {copied ? (
                <Check size={12} className="text-emerald-600" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
        )}

        <MessageContent
          content={message.content}
          isUser={isUser}
        />
      </div>
    </div>
  );
}
