"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MiniDatePickerProps = {
  label?: string;
  value: string;               // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  align?: "left" | "right";    // how to align the popup in its parent
};

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function MiniDatePicker({
  label,
  value,
  onChange,
  isOpen,
  onToggle,
  align = "left",
}: MiniDatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedDate = useMemo(() => parseDate(value), [value]);

  const [viewDate, setViewDate] = useState<Date>(
    () => selectedDate ?? new Date()
  );

  // When picker opens, jump to selected month (or today)
  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate ?? new Date());
    }
  }, [isOpen, selectedDate]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        onToggle(); // toggle from open → closed
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  // Year options around current year (adjust range as you like)
  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    const years: number[] = [];
    for (let y = base - 30; y <= base + 20; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Compute days of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);

  // JS getDay: 0=Sun, ..., 6=Sat. We want Monday as first column.
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleMonthSelect = (e: any) => {
    const m = Number(e.target.value);
    setViewDate((prev) => new Date(prev.getFullYear(), m, 1));
  };

  const handleYearSelect = (e: any) => {
    const y = Number(e.target.value);
    setViewDate((prev) => new Date(y, prev.getMonth(), 1));
  };

  const handleSelectDay = (d: Date | null) => {
    if (!d) return;
    onChange(formatDate(d));
    onToggle(); // parent flips isOpen → false
  };

  const popupAlignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div ref={rootRef} className="relative text-[11px]">
      {label && (
        <label className="block text-[10px] text-neutral-400 tracking-wide uppercase mb-0.5">
          {label}
        </label>
      )}

      {/* ISO input + calendar icon */}
      <div className="relative">
        <input
          type="text"
          placeholder="YYYY-MM-DD"
          className="w-full bg-neutral-950 border border-neutral-700 px-2 py-[6px] text-[12px] text-neutral-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-7"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => {
            if (!isOpen) onToggle();
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-1 flex items-center text-xs text-neutral-300 hover:text-neutral-100"
        >
          
        </button>
      </div>

      {isOpen && (
        <div
          className={
            "absolute z-50 mt-1 w-56 bg-neutral-950 border border-neutral-700 shadow-lg p-2 " +
            popupAlignClass
          }
        >
          {/* header: prev/next + month/year selects */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="px-1 py-0.5 hover:bg-neutral-800 text-neutral-300"
            >
              ‹
            </button>
            <div className="flex items-center gap-1">
              <select
                className="bg-neutral-900 border border-neutral-700 px-1 py-[2px] text-[11px] text-neutral-100 focus:outline-none"
                value={month}
                onChange={handleMonthSelect}
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="bg-neutral-900 border border-neutral-700 px-1 py-[2px] text-[11px] text-neutral-100 focus:outline-none"
                value={year}
                onChange={handleYearSelect}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="px-1 py-0.5 hover:bg-neutral-800 text-neutral-300"
            >
              ›
            </button>
          </div>

          {/* weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-[10px] text-center text-neutral-500"
              >
                {d}
              </div>
            ))}
          </div>

          {/* days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              if (!d) {
                return <div key={idx} />;
              }

              const isSelected =
                selectedDate &&
                d.getFullYear() === selectedDate.getFullYear() &&
                d.getMonth() === selectedDate.getMonth() &&
                d.getDate() === selectedDate.getDate();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={[
                    "w-7 h-7 text-[11px] flex items-center justify-center",
                    isSelected
                      ? "bg-cyan-500 text-neutral-950"
                      : "text-neutral-200 hover:bg-neutral-800",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
