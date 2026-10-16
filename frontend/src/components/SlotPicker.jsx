
import {
  CalendarDays,
  Clock3,
  Check,
  ArrowRight,
  CalendarCheck,
  Hash,
} from "lucide-react";

export default function SlotPicker({ slots, onSelectSlot, booking, isLoading = false }) {
  if (!slots || slots.length === 0) return null;

  const isAwaitingSlot = booking?.step === "awaiting_slot";
  const isConfirmed = booking?.step === "confirmed";

  const handleSlotClick = (slot) => {
    if (isLoading) return;

    if (isAwaitingSlot) {
      onSelectSlot?.(`Let's go with ${slot}`);
    } else if (isConfirmed) {
      onSelectSlot?.(`I would like to reschedule to ${slot}`);
    } else {
      onSelectSlot?.(`I would like to book the review slot: ${slot}`);
    }
  };

  return (
    <section
      aria-label="Meeting room booking slots"
      className={`mb-5 overflow-hidden rounded-xl border transition-colors duration-200 ${isConfirmed
          ? "border-[#d8e5d6] bg-white"
          : "border-[#e7e6e0] bg-white"
        }`}
    >
      {/* Section heading */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eeede8] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isConfirmed
                ? "border-[#d8e5d6] bg-[#f3f7f1] text-[#52744e]"
                : "border-[#e7e6e0] bg-[#fafaf8] text-[#55564e]"
              }`}
          >
            {isConfirmed ? (
              <CalendarCheck size={19} strokeWidth={1.7} />
            ) : (
              <CalendarDays size={19} strokeWidth={1.7} />
            )}
          </div>

          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-[#30312b]">
              Meeting room availability
            </h3>

            <p className="mt-1 text-xs leading-5 text-[#85867d]">
              {isConfirmed
                ? "Your booking is confirmed. Click another slot to reschedule."
                : isAwaitingSlot
                  ? "Select an available time to continue."
                  : "Click any available slot to book your review."}
            </p>
          </div>
        </div>

        {isAwaitingSlot && (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#e7e6e0] bg-[#fafaf8] px-2.5 py-1.5 text-[11px] font-medium text-[#55564e]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Selection required
          </span>
        )}

        {isConfirmed && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#d8e5d6] bg-[#f3f7f1] px-2.5 py-1.5 text-[11px] font-medium text-[#52744e]">
            <Check size={13} strokeWidth={2} />
            Confirmed
          </span>
        )}

        {!isAwaitingSlot && !isConfirmed && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#e7e6e0] bg-[#fafaf8] px-2.5 py-1.5 text-[11px] font-medium text-[#77786f]">
            Click to book
          </span>
        )}
      </div>

      {/* Available slots */}
      <div className="p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#92938b]">
          Available time slots
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot, idx) => {
            const isSelected = booking?.slot === slot;

            return (
              <button
                key={`${slot}-${idx}`}
                type="button"
                onClick={() => handleSlotClick(slot)}
                disabled={isLoading}
                aria-label={`Select meeting slot ${slot}`}
                className={`group flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#77786c]/30 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-500/20"
                    : "border-[#e5e4de] bg-white text-[#45463f] hover:border-[#9e9d92] hover:bg-[#fafaf8] hover:shadow-2xs active:scale-[0.99]"
                } ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Clock3
                    size={16}
                    strokeWidth={1.7}
                    className={`shrink-0 ${
                      isSelected
                        ? "text-emerald-700"
                        : "text-[#85867d] group-hover:text-[#30312b]"
                    }`}
                  />

                  <span className="break-words text-xs font-medium leading-5">
                    {slot}
                  </span>
                </span>

                {isSelected ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                ) : (
                  <ArrowRight
                    size={15}
                    strokeWidth={1.7}
                    className="shrink-0 text-[#92938b] transition-transform group-hover:translate-x-0.5 group-hover:text-[#30312b]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs leading-5 text-[#92938b]">
          {isConfirmed
            ? "You can click any other slot above to reschedule your session."
            : isAwaitingSlot
              ? "Choose a time slot to proceed with your booking."
              : "Click any slot to book your 1-on-1 Performance Review."}
        </p>

        {/* Confirmed booking details */}
        {isConfirmed && (
          <div className="mt-4 rounded-lg border border-[#dfe8dc] bg-[#f7faf5] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe8dc] bg-white text-[#52744e]">
                <CalendarCheck size={17} strokeWidth={1.7} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#52744e]">
                  Booking confirmed
                </p>

                <p className="mt-1.5 break-words text-sm font-semibold text-[#30312b]">
                  {booking.slot}
                </p>

                {booking.referenceId && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Hash
                      size={13}
                      className="text-[#85867d]"
                    />

                    <span className="text-xs text-[#85867d]">
                      Reference ID
                    </span>

                    <code className="break-all rounded border border-[#e7e6e0] bg-white px-2 py-1 text-xs text-[#55564e]">
                      {booking.referenceId}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
