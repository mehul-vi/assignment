
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock3,
  X,
  LoaderCircle,
  ArrowRight,
  RotateCcw,
  ClipboardList,
  UserRound,
} from "lucide-react";

export default function BookingsModal({
  isOpen,
  onClose,
  bookings = [],
  isLoading,
  onCancelBooking,
  onSelectSlotToReschedule,
  userEmail,
}) {
  const [filter, setFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleEscape(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isActiveBooking = (booking) =>
    booking.status === "booked" || booking.status === "confirmed";

  const bookedCount = bookings.filter(isActiveBooking).length;
  const cancelledCount = bookings.filter(
    (booking) => booking.status === "cancelled"
  ).length;
  const attendedCount = bookings.filter(
    (booking) => booking.status === "attended"
  ).length;

  const filters = [
    { id: "all", label: "All", count: bookings.length, icon: ClipboardList },
    { id: "booked", label: "Upcoming", count: bookedCount, icon: CalendarCheck },
    { id: "cancelled", label: "Cancelled", count: cancelledCount, icon: CalendarX },
    { id: "attended", label: "Attended", count: attendedCount, icon: CheckCircle2 },
  ];

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    if (filter === "booked") return isActiveBooking(booking);
    return booking.status === filter;
  });

  const activeFilter = filters.find((item) => item.id === filter);

  const handleCancel = async (referenceId) => {
    if (!referenceId || cancellingId) return;

    if (!window.confirm("Are you sure you want to cancel this review slot?")) {
      return;
    }

    setCancellingId(referenceId);

    try {
      await onCancelBooking?.(referenceId);
    } catch (error) {
      console.error("Unable to cancel booking:", error);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatus = (status) => {
    const statuses = {
      booked: {
        label: "Confirmed",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
      confirmed: {
        label: "Confirmed",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
      cancelled: {
        label: "Cancelled",
        className: "border-stone-200 bg-stone-100 text-stone-600",
      },
      attended: {
        label: "Attended",
        className: "border-blue-200 bg-blue-50 text-blue-700",
      },
    };

    return statuses[status] || {
      label: status || "Unknown",
      className: "border-stone-200 bg-stone-100 text-stone-600",
    };
  };

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 backdrop-blur-sm sm:items-center sm:p-4 md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookings-modal-title"
        className="flex h-[92dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-2xl sm:h-[min(760px,88dvh)] sm:max-w-3xl sm:rounded-2xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-[#faf9f6] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-stone-500">
              <CalendarDays size={14} />
              <span>Performance reviews</span>
            </div>

            <h2
              id="bookings-modal-title"
              className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl"
            >
              My bookings
            </h2>

            <p className="mt-1 truncate text-xs text-stone-500 sm:text-sm">
              {userEmail || "Manage your scheduled review sessions"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close bookings"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <X size={17} />
          </button>
        </header>

        {/* Horizontally scrollable filters */}
        <nav
          aria-label="Filter bookings"
          className="flex h-[60px] shrink-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain border-b border-stone-200 bg-white px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-[66px] sm:px-5"
        >
          {filters.map((item) => {
            const Icon = item.icon;
            const selected = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={selected}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition sm:gap-2 sm:px-3 ${selected
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                <span
                  className={`min-w-5 rounded px-1 py-0.5 text-center text-[10px] ${selected
                      ? "bg-white/15 text-white"
                      : "bg-stone-100 text-stone-500"
                    }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Scrollable content */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fcfbf9]">
          <div className="min-h-full p-3 sm:p-5 md:p-6">
            <div className="mb-4 flex min-h-7 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-800">
                {activeFilter?.label || "Bookings"}
              </h3>

              <span className="shrink-0 text-xs text-stone-500">
                {filteredBookings.length}{" "}
                {filteredBookings.length === 1 ? "booking" : "bookings"}
              </span>
            </div>

            {isLoading ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <LoaderCircle
                  size={26}
                  className="animate-spin text-stone-500"
                />
                <p className="mt-4 text-sm font-medium text-stone-700">
                  Loading bookings
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Please wait a moment.
                </p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center sm:px-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500">
                  <ClipboardList size={20} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-stone-900">
                  {filter === "all"
                    ? "No bookings yet"
                    : `No ${activeFilter?.label.toLowerCase()} found`}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                  {filter === "all"
                    ? "Your scheduled performance reviews will appear here."
                    : "There are no bookings in this category. Try another filter to view your booking history."}
                </p>

                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
                  >
                    View all bookings
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => {
                  const isBooked = isActiveBooking(booking);
                  const isCancelling =
                    cancellingId === booking.referenceId;
                  const status = getStatus(booking.status);

                  return (
                    <article
                      key={booking.referenceId || booking.id}
                      className="min-w-0 rounded-xl border border-stone-200 bg-white p-3.5 transition-colors hover:border-stone-300 sm:p-5"
                    >
                      <div className="flex min-w-0 flex-col gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>

                            {booking.referenceId && (
                              <span className="min-w-0 break-all font-mono text-[10px] text-stone-500 sm:text-[11px]">
                                {booking.referenceId}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 break-words text-[15px] font-semibold leading-6 text-stone-900 sm:text-base">
                            {booking.slot || "Review slot"}
                          </h3>

                          <div className="mt-2 flex min-w-0 flex-col gap-2 text-xs text-stone-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <UserRound size={13} className="shrink-0" />
                              <span className="break-words">
                                {booking.name || "Attendee"}
                              </span>
                            </span>

                            {booking.email && (
                              <span className="break-all">
                                {booking.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {isBooked && (
                          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                handleCancel(booking.referenceId)
                              }
                              disabled={isCancelling || !booking.referenceId}
                              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-auto"
                            >
                              {isCancelling ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <X size={14} />
                              )}
                              {isCancelling ? "Cancelling..." : "Cancel booking"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onClose?.();
                                onSelectSlotToReschedule?.(booking);
                              }}
                              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 text-xs font-medium text-white transition hover:bg-stone-700 sm:h-9 sm:w-auto"
                            >
                              <RotateCcw size={14} />
                              Reschedule
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex min-w-0 flex-col gap-2 border-t border-stone-100 pt-3 text-[11px] text-stone-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={13} className="shrink-0" />
                          <span>
                            Booked on {formatDate(booking.createdAt)}
                          </span>
                        </span>

                        <span>1-on-1 Performance Review</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Fixed footer */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:min-h-[65px] sm:px-6">
          <p className="hidden text-xs leading-5 text-stone-500 sm:block">
            Manage your upcoming performance reviews here.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-9 items-center justify-center rounded-lg bg-stone-900 px-5 text-xs font-semibold text-white transition hover:bg-stone-700"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
