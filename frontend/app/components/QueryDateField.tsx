"use client";

import { useRef } from "react";

export default function QueryDateField({label,value,onChange,}: {label: string; value: string; onChange: (v: string) => void;}) {
    const hiddenRef = useRef<HTMLInputElement>(null);

    // convert ISO → dd/mm/yyyy
    const isoToDisplay = (iso: string) => {
        if (!iso) return "";
        const [y, m, d] = iso.split("-");
        return `${d}/${m}/${y}`;
    };

    // convert dd/mm/yyyy → ISO
    const displayToIso = (display: string) => {
        const [d, m, y] = display.split("/");
        return d && m && y ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(displayToIso(e.target.value));
    };

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className="flex flex-col gap-1">
        <label className="text-sm text-neutral-400">{label} (dd/mm/yyyy)</label>
        <div className="relative">
            {/* visible dd/mm/yyyy text box */}
            <input
                type="text"
                value={isoToDisplay(value)}
                onChange={handleTextChange}
                placeholder="dd/mm/yyyy"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md p-2 text-sm text-white"
                onFocus={() => hiddenRef.current?.showPicker()}
            />

            {/* hidden native picker overlay */}
            <input
                ref={hiddenRef}
                type="date"
                value={value}
                onChange={handleNativeChange}
                className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
            />
        </div>
        </div>
    );
}