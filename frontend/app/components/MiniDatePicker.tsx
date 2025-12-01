"use client";

import {useEffect, useMemo, useState } from "react";

// type MiniDatePickerProps = {
//   label?: string;
//   value: string;               // "YYYY-MM-DD" or ""
//   onChange: (value: string) => void;
// };

// function parseDate(value: string): Date | null {
//   if (!value) return null;
//   const [y, m, d] = value.split("-").map(Number);
//   if (!y || !m || !d) return null;
//   return new Date(y, m - 1, d);
// }

// function formatDate(d: Date): string {
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${dd}`;
// }

// const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// export default function MiniDatePicker({
//   label,
//   value,
//   onChange,
// }: MiniDatePickerProps) {
//   const selectedDate = useMemo(() => parseDate(value), [value]);

//   const [open, setOpen] = useState(false);
//   const [viewDate, setViewDate] = useState<Date>(
//     () => selectedDate ?? new Date()
//   );

//   const year = viewDate.getFullYear();
//   const month = viewDate.getMonth(); // 0-11

//   // Compute days for current month
//   const daysInMonth = new Date(year, month + 1, 0).getDate();
//   const firstDay = new Date(year, month, 1);
//   // JS getDay: 0=Sun, ..., 6=Sat. We want Monday as first column.
//   let startOffset = firstDay.getDay() - 1;
//   if (startOffset < 0) startOffset = 6;

//   const days: (Date | null)[] = [];
//   for (let i = 0; i < startOffset; i++) days.push(null);
//   for (let d = 1; d <= daysInMonth; d++) {
//     days.push(new Date(year, month, d));
//   }

//   const handlePrevMonth = () => {
//     setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
//   };

//   const handleNextMonth = () => {
//     setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
//   };

//   const handleSelectDay = (d: Date | null) => {
//     if (!d) return;
//     onChange(formatDate(d));
//     setOpen(false);
//   };

//   const displayText = selectedDate
//     ? selectedDate.toLocaleDateString(undefined, {
//         year: "numeric",
//         month: "short",
//         day: "numeric",
//       })
//     : "Select date";

//   return (
//     <div className="relative text-[11px]">
//       {label && (
//         <label className="block text-[10px] text-neutral-500 mb-0.5">
//           {label}
//         </label>
//       )}

//       {/* fake input */}
//       <button
//         type="button"
//         onClick={() => setOpen((o) => !o)}
//         className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-[3px] text-left text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 flex items-center justify-between"
//       >
//         <span className={selectedDate ? "" : "text-neutral-500"}>
//           {displayText}
//         </span>
//         <span className="material-icons text-[14px] text-neutral-400">
//           event
//         </span>
//       </button>

//       {open && (
//         <div className="absolute z-50 mt-1 w-56 rounded-md bg-neutral-950 border border-neutral-700 shadow-lg p-2">
//           {/* header */}
//           <div className="flex items-center justify-between mb-2">
//             <button
//               type="button"
//               onClick={handlePrevMonth}
//               className="px-1 py-0.5 rounded hover:bg-neutral-800 text-neutral-300"
//             >
//               ‹
//             </button>
//             <div className="text-[11px] font-semibold text-neutral-200">
//               {viewDate.toLocaleDateString(undefined, {
//                 year: "numeric",
//                 month: "long",
//               })}
//             </div>
//             <button
//               type="button"
//               onClick={handleNextMonth}
//               className="px-1 py-0.5 rounded hover:bg-neutral-800 text-neutral-300"
//             >
//               ›
//             </button>
//           </div>

//           {/* weekdays */}
//           <div className="grid grid-cols-7 gap-1 mb-1">
//             {WEEKDAYS.map((d) => (
//               <div
//                 key={d}
//                 className="text-[10px] text-center text-neutral-500"
//               >
//                 {d}
//               </div>
//             ))}
//           </div>

//           {/* days */}
//           <div className="grid grid-cols-7 gap-1">
//             {days.map((d, idx) => {
//               if (!d) {
//                 return <div key={idx} />;
//               }

//               const isSelected =
//                 selectedDate &&
//                 d.getFullYear() === selectedDate.getFullYear() &&
//                 d.getMonth() === selectedDate.getMonth() &&
//                 d.getDate() === selectedDate.getDate();

//               return (
//                 <button
//                   key={idx}
//                   type="button"
//                   onClick={() => handleSelectDay(d)}
//                   className={[
//                     "w-7 h-7 rounded-full text-[11px] flex items-center justify-center",
//                     isSelected
//                       ? "bg-cyan-500 text-neutral-950"
//                       : "text-neutral-200 hover:bg-neutral-800",
//                   ].join(" ")}
//                 >
//                   {d.getDate()}
//                 </button>
//               );
//             })}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


// "use client";

// import { useEffect, useMemo, useState } from "react";

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

export default function MiniDatePicker({
  label,
  value,
  onChange,
  isOpen,
  onToggle,
  align = "left",
}: MiniDatePickerProps) {
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

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

  const handleSelectDay = (d: Date | null) => {
    if (!d) return;
    onChange(formatDate(d));
    onToggle(); // close after selection
  };

  const displayText = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Select date";

  const popupAlignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div className="relative text-[11px]">
      {label && (
        <label className="block text-[10px] text-neutral-500 mb-0.5">
          {label}
        </label>
      )}

      {/* fake input */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-[3px] text-left text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 flex items-center justify-between"
      >
        <span className={selectedDate ? "" : "text-neutral-500"}>
          {displayText}
        </span>
        <span className="ml-1 text-xs">📅</span>
      </button>

      {isOpen && (
        <div
          className={
            "absolute z-50 mt-1 w-56 rounded-md bg-neutral-950 border border-neutral-700 shadow-lg p-2 " +
            popupAlignClass
          }
        >
          {/* header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="px-1 py-0.5 rounded hover:bg-neutral-800 text-neutral-300"
            >
              ‹
            </button>
            <div className="text-[11px] font-semibold text-neutral-200">
              {viewDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
              })}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="px-1 py-0.5 rounded hover:bg-neutral-800 text-neutral-300"
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
                    "w-7 h-7 rounded-full text-[11px] flex items-center justify-center",
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

