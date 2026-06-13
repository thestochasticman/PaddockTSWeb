import type { Layout } from "react-grid-layout";

// Named layout presets, reusable across all results pages. Stored browser-side
// (localStorage); independent of the per-stub working layout in
// `workspace-grid:<stub>`.
const KEY = "workspace-layout-presets";

export type LayoutPresets = Record<string, Layout[]>;

export function getPresets(): LayoutPresets {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LayoutPresets;
    }
  } catch {}
  return {};
}

export function savePreset(name: string, layout: Layout[]): LayoutPresets {
  const presets = getPresets();
  presets[name] = layout;
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
  } catch {}
  return presets;
}

export function deletePreset(name: string): LayoutPresets {
  const presets = getPresets();
  delete presets[name];
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
  } catch {}
  return presets;
}
