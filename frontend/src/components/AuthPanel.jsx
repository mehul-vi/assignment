import { useEffect } from "react";
import { X, LockKeyhole, ArrowRight, LoaderCircle } from "lucide-react";

export default function AuthPanel({
  stage,
  name,
  email,
  code,
  busy,
  error,
  notice,
  onEmailChange,
  onNameChange,
  onCodeChange,
  onRequestCode,
  onVerifyCode,
  onBack,
  onClose
}) {
  const isOtpStage =
    stage === "code" || stage === "otp" || stage === "verify";

  const inputClass =
    "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:opacity-60";

  const handleClose = () => {
    if (busy) return;

    if (typeof onClose === "function") {
      onClose();
      return;
    }

    if (typeof onBack === "function") {
      onBack();
      return;
    }

    console.warn("AuthPanel: no onClose or onBack handler provided.");
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        if (typeof onClose === "function") {
          onClose();
        } else if (typeof onBack === "function") {
          onBack();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, onBack]);

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    if (busy) return;

    if (isOtpStage) {
      if (/^\d{6}$/.test(code || "")) onVerifyCode?.(event);
    } else if (name?.trim() && email?.trim()) {
      onRequestCode?.(event);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative my-auto w-full max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
      >
        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close sign in"
          disabled={busy}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={19} strokeWidth={1.7} />
        </button>

        {/* Header */}
        <div className="border-b border-stone-200 px-6 py-6 pr-14 sm:px-8">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-stone-900 text-white">
            <LockKeyhole size={19} strokeWidth={1.7} />
          </div>

          <p className="mb-2 text-xs uppercase tracking-widest text-stone-500">
            Zava Workspace
          </p>

          <h2 id="auth-title" className="text-2xl font-semibold tracking-tight text-stone-900">
            {isOtpStage ? "Verify your email" : "Welcome to Zava"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-500">
            {isOtpStage
              ? `Enter the verification code sent to ${email}.`
              : "Sign in to access employee handbook answers and meeting room bookings."}
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isOtpStage ? (
              <>
                <div>
                  <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-stone-700">
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name || ""}
                    onChange={(e) => onNameChange?.(e.target.value)}
                    placeholder="Enter your full name"
                    className={inputClass}
                    required
                    disabled={busy}
                  />
                </div>

                <div>
                  <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-stone-700">
                    Work email
                  </label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email || ""}
                    onChange={(e) => onEmailChange?.(e.target.value)}
                    placeholder="you@company.com"
                    className={inputClass}
                    required
                    disabled={busy}
                  />
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    A one-time verification code will be sent to this address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={busy || !name?.trim() || !email?.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      Send verification code
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="auth-code" className="mb-1.5 block text-sm font-medium text-stone-700">
                    Verification code
                  </label>
                  <input
                    id="auth-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code || ""}
                    onChange={(e) =>
                      onCodeChange?.(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit code"
                    className={`${inputClass} tracking-widest`}
                    required
                    disabled={busy}
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    Check your inbox for the six-digit code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={busy || !/^\d{6}$/.test(code || "")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify and continue
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  disabled={busy}
                  className="w-full rounded-lg py-2 text-sm text-stone-600 transition hover:text-stone-900 disabled:opacity-50"
                >
                  Back
                </button>
              </>
            )}
          </form>

          {error && (
            <p role="alert" className="mt-4 break-words text-sm text-red-600">
              {error}
            </p>
          )}

          {notice && (
            <p role="status" className="mt-4 break-words text-sm text-emerald-700">
              {notice}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-stone-200 pt-4 text-xs text-stone-500">
            <LockKeyhole size={13} />
            <span>Secure email verification</span>
          </div>
        </div>
      </section>
    </div>
  );
}