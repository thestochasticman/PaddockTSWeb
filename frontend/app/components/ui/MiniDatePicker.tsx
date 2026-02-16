"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  align?: "left" | "right";
};

function parseDate(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MiniDatePicker({ label, value, onChange, isOpen, onToggle, align = "left" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseDate(value), [value]);
  const [view, setView] = useState<Date>(() => selected ?? new Date());

  useEffect(() => { if (isOpen) setView(selected ?? new Date()); }, [isOpen, selected]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onToggle();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen, onToggle]);

  const year = view.getFullYear();
  const month = view.getMonth();

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 51 }, (_, i) => now - 30 + i);
  }, []);

  const dim = new Date(year, month + 1, 0).getDate();
  let offset = new Date(year, month, 1).getDay() - 1;
  if (offset < 0) offset = 6;
  const days: (Date | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: dim }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div ref={rootRef} className="date-root">
      {label && <label className="crt-label">{label}</label>}
      <div className="date-input-wrapper">
        <input
          type="text"
          placeholder="YYYY-MM-DD"
          className="crt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => { if (!isOpen) onToggle(); }}
        />
      </div>

      {isOpen && (
        <div className={`date-popup ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="date-header">
            <button type="button" onClick={() => setView(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))} className="date-nav-button">&#8249;</button>
            <div className="flex items-center gap-1">
              <select className="date-select" value={month} onChange={e => setView(p => new Date(p.getFullYear(), +e.target.value, 1))}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select className="date-select" value={year} onChange={e => setView(p => new Date(+e.target.value, p.getMonth(), 1))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setView(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))} className="date-nav-button">&#8250;</button>
          </div>
          <div className="date-weekdays-row">
            {DAYS.map(d => <div key={d} className="date-weekday">{d}</div>)}
          </div>
          <div className="date-days-grid">
            {days.map((d, i) => d ? (
              <button
                key={i}
                type="button"
                onClick={() => { onChange(fmt(d)); onToggle(); }}
                className={`date-day-base ${selected && d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth() && d.getDate() === selected.getDate() ? "date-day-selected" : "date-day"}`}
              >
                {d.getDate()}
              </button>
            ) : <div key={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
