"use client";

import { createContext, useContext } from "react";
import type { OutputStatus } from "../query/useJobStatus";
import type { EnvDataset } from "../charts/useEnvironmentalData";

export type EnvFetchState = {
  data: EnvDataset;
  loading: boolean;
  error: string | null;
};

export type WorkspaceContextValue = {
  stub: string;
  outputs: OutputStatus;
  silo: EnvFetchState;
  /** Monotonic counter; bumped whenever the user requests a plot-state
   *  reset (e.g. clicking the Outputs button in the activity bar). Plot
   *  panes useEffect on this to clear their local UI state. */
  paneResetKey: number;
};

const Ctx = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = Ctx.Provider;

export function useWorkspace(): WorkspaceContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return v;
}
