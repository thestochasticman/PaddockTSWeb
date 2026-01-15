"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode[];
  itemKeys: string[];
  isEditable?: boolean;
};

export default function DraggableLayout({
  children,
  itemKeys,
  isEditable = true,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {children.map((child, index) => (
        <div key={itemKeys[index]} className="w-full">
          {child}
        </div>
      ))}
    </div>
  );
}
