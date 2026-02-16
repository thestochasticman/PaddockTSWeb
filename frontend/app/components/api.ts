export const BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");
export const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const STORAGE_KEY = "paddock_ts_saved_queries_v1";
