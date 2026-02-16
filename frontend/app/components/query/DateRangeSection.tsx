"use client";

import MiniDatePicker from "../ui/MiniDatePicker";

type Props = {
  startDate: string;
  endDate: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  openPicker: "start" | "end" | null;
  onTogglePicker: (which: "start" | "end") => void;
};

export default function DateRangeSection({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  openPicker,
  onTogglePicker,
}: Props) {
  return (
    <div>
      <label className="crt-label">Time Window</label>
      <div className="grid grid-cols-2 gap-3 mt-1">
        <MiniDatePicker
          label="Start"
          value={startDate}
          onChange={onStartChange}
          isOpen={openPicker === "start"}
          onToggle={() => onTogglePicker("start")}
          align="left"
        />
        <MiniDatePicker
          label="End"
          value={endDate}
          onChange={onEndChange}
          isOpen={openPicker === "end"}
          onToggle={() => onTogglePicker("end")}
          align="right"
        />
      </div>
    </div>
  );
}
