export const LATEST_JOB_STORAGE_KEY = "daesim_latest_job_id";
export const LATEST_JOB_EVENT = "daesim_latest_job_id_updated";

export function getLatestJobId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LATEST_JOB_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLatestJobId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(LATEST_JOB_EVENT, { detail: id }));
  } catch {
    // ignore
  }
}
