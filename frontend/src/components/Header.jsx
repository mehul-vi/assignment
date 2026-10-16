
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  LogOut,
  Mail,
  Pencil,
  Plus,
  UserRound,
  X,
  Check,
  Copy,
  LoaderCircle,
} from "lucide-react";

export default function Header({
  threadId,
  onReset,
  userEmail,
  userName,
  onSignOut,
  onSaveName,
  onOpenBookings,
  onOpenAuth,
  bookingsCount,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [copiedThread, setCopiedThread] = useState(false);

  const accountRef = useRef(null);

  const handleCopyThread = async () => {
    if (!threadId) return;
    try {
      await navigator.clipboard.writeText(threadId);
      setCopiedThread(true);
      setTimeout(() => setCopiedThread(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = threadId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedThread(true);
      setTimeout(() => setCopiedThread(false), 2000);
    }
  };

  useEffect(() => {
    if (!isAccountOpen) return;

    const handleOutsideClick = (event) => {
      if (!accountRef.current?.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setIsAccountOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountOpen]);

  const handleSaveName = async (event) => {
    event.preventDefault();

    const trimmedName = nameDraft.trim();

    if (trimmedName.length < 2) {
      setNameError("Name must contain at least 2 characters.");
      return;
    }

    setIsSavingName(true);
    setNameError("");

    try {
      await onSaveName(trimmedName);
      setIsEditingName(false);
      setIsAccountOpen(false);
    } catch (error) {
      setNameError(error.message || "Could not update your name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const closeModal = () => {
    if (isSavingName) return;

    setIsEditingName(false);
    setNameDraft(userName || "");
    setNameError("");
  };

  const openEditProfile = () => {
    setNameDraft(userName || "");
    setNameError("");
    setIsEditingName(true);
    setIsAccountOpen(false);
  };

  const initials = (userName || userEmail || "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const buttonBase =
    "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#77786c]/30";

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-[#e8e7e1] bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#30312b] text-base font-semibold tracking-tight text-white">
            Z
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-[-0.02em] text-[#292a25] sm:text-[15px]">
              Zava Workspace
            </h1>
            <p className="mt-0.5 hidden text-[11px] text-[#92938b] sm:block">
              HR Assistant
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Thread ID Badge with Copy Button */}
          {threadId && (
            <div
              className="flex items-center gap-1.5 rounded-lg border border-[#e6e5df] bg-[#fafaf8] py-1 pl-2.5 pr-1.5 text-xs text-[#77786f]"
              title={`Session Thread ID: ${threadId}`}
            >
              <span className="hidden text-[11px] text-[#92938b] md:inline">Thread:</span>
              <code className="max-w-[100px] truncate font-mono text-[11px] font-semibold text-[#45463f] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px]">
                {threadId}
              </code>
              <button
                type="button"
                onClick={handleCopyThread}
                aria-label="Copy Thread ID"
                title={copiedThread ? "Copied to clipboard!" : "Copy Thread ID"}
                className="flex h-5 w-5 items-center justify-center rounded text-[#85867d] transition hover:bg-[#eae9e2] hover:text-[#30312b] active:scale-90"
              >
                {copiedThread ? (
                  <Check size={12} className="text-emerald-600" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          )}

          {userEmail ? (
            <>
              <button
                type="button"
                onClick={onOpenBookings}
                className={`${buttonBase} border border-[#e6e5df] bg-white text-[#4d4e46] hover:bg-[#f7f7f3]`}
              >
                <CalendarDays size={16} strokeWidth={1.7} />

                <span className="hidden sm:inline">Bookings</span>

                {typeof bookingsCount === "number" &&
                  bookingsCount > 0 && (
                    <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-md bg-[#f0efe9] px-1 text-[10px] font-semibold tabular-nums text-[#45463f]">
                      {bookingsCount}
                    </span>
                  )}
              </button>

              {/* Account menu */}
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountOpen((open) => !open)}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="menu"
                  aria-label="Open account menu"
                  className={`${buttonBase} gap-2 border border-[#e6e5df] bg-white px-2 hover:bg-[#f7f7f3] sm:px-3`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#efeee8] text-[11px] font-semibold text-[#42433c]">
                    {initials}
                  </span>

                  <span className="hidden max-w-28 truncate text-[#45463f] md:block">
                    {userName || "My account"}
                  </span>

                  <ChevronDown
                    size={14}
                    className={`text-[#85867d] transition-transform duration-150 ${isAccountOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {isAccountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+10px)] z-50 w-[270px] overflow-hidden rounded-xl border border-[#e7e6e0] bg-white shadow-[0_12px_36px_rgba(30,30,20,0.10)]"
                  >
                    <div className="border-b border-[#eeede8] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#30312b] text-sm font-semibold text-white">
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#30312b]">
                            {userName || "Your account"}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#85867d]">
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      {threadId && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#f8f8f6] px-2.5 py-1.5 text-[11px] text-[#77786f]">
                          <span className="text-[#92938b]">Thread ID</span>
                          <div className="flex items-center gap-1.5">
                            <code className="max-w-[140px] truncate font-mono font-semibold text-[#45463f]">
                              {threadId}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyThread}
                              aria-label="Copy Thread ID"
                              title={copiedThread ? "Copied!" : "Copy Thread ID"}
                              className="flex h-5 w-5 items-center justify-center rounded text-[#85867d] transition hover:bg-[#eae9e2] hover:text-[#30312b]"
                            >
                              {copiedThread ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-2">
                      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#92938b]">
                        Account settings
                      </p>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={openEditProfile}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-[#45463f] transition-colors hover:bg-[#f6f6f2]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#eae9e3] bg-white">
                          <Pencil size={15} strokeWidth={1.7} />
                        </span>

                        <span>
                          <span className="block font-medium">Edit profile</span>
                          <span className="mt-0.5 block text-xs text-[#92938b]">
                            Update your display name
                          </span>
                        </span>
                      </button>

                      <div className="my-2 border-t border-[#eeede8]" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAccountOpen(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-[#a13f35] transition-colors hover:bg-[#fbf1ef]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#f1dfdc] bg-white">
                          <LogOut size={15} strokeWidth={1.7} />
                        </span>

                        <span>
                          <span className="block font-medium">Sign out</span>
                          <span className="mt-0.5 block text-xs text-[#b27b74]">
                            End your current session
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className={`${buttonBase} bg-[#30312b] text-white hover:bg-[#45463e]`}
            >
              <UserRound size={16} strokeWidth={1.7} />
              <span>Sign in</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            aria-label="Start a new chat"
            className={`${buttonBase} border border-[#e6e5df] bg-white px-3 text-[#45463f] hover:bg-[#f7f7f3]`}
          >
            <Plus size={16} strokeWidth={1.8} />
            <span className="hidden sm:inline">New chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Edit profile modal */}
      {isEditingName && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#20211d]/35 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form
            onSubmit={handleSaveName}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-name-title"
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#e7e6e0] bg-white shadow-[0_24px_80px_rgba(20,20,15,0.18)]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-6">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e7e6e0] bg-[#f8f8f5] text-[#55564e]">
                  <UserRound size={19} strokeWidth={1.7} />
                </div>

                <h2
                  id="edit-name-title"
                  className="text-lg font-semibold tracking-tight text-[#292a25]"
                >
                  Edit profile
                </h2>

                <p className="mt-1.5 text-sm leading-5 text-[#85867d]">
                  Change the name displayed in your workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSavingName}
                aria-label="Close dialog"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#85867d] transition hover:bg-[#f3f3ee] hover:text-[#30312b] disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 px-6 pb-6">
              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-2 block text-xs font-semibold text-[#45463f]"
                >
                  Full name
                </label>

                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  autoFocus
                  value={nameDraft}
                  onChange={(event) => {
                    setNameDraft(event.target.value);
                    if (nameError) setNameError("");
                  }}
                  disabled={isSavingName}
                  placeholder="Enter your full name"
                  className="h-11 w-full rounded-lg border border-[#deddd6] bg-white px-3.5 text-sm text-[#30312b] outline-none transition placeholder:text-[#aaa99f] focus:border-[#77786c] focus:ring-2 focus:ring-[#77786c]/15 disabled:bg-[#f5f5f1]"
                />

                {nameError && (
                  <p
                    role="alert"
                    className="mt-2 text-xs leading-5 text-[#a13f35]"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-xs font-semibold text-[#45463f]"
                >
                  Email address
                </label>

                <div className="flex h-11 items-center gap-3 rounded-lg border border-[#e8e7e1] bg-[#f8f8f5] px-3.5">
                  <Mail
                    size={16}
                    className="shrink-0 text-[#85867d]"
                  />

                  <input
                    id="profile-email"
                    type="email"
                    value={userEmail || ""}
                    readOnly
                    aria-readonly="true"
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#77786f] outline-none"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-[#92938b]">
                  Your email address is used for sign-in verification.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#eeede8] bg-[#fafaf8] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSavingName}
                className="h-10 rounded-lg border border-[#e0dfd8] bg-white px-4 text-sm font-medium text-[#55564e] transition hover:bg-[#f5f5f1] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSavingName || nameDraft.trim().length < 2}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#30312b] px-4 text-sm font-medium text-white transition hover:bg-[#45463e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingName ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}

                {isSavingName ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
