import { useRouter } from "next/navigation";

export const BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");
export const API_RAW = process.env.NEXT_PUBLIC_API_URL ?? "/api";
export const API = API_RAW.replace(/\/+$/, ""); // strip trailing slashes


export const apiKey = 'AIzaSyCZwvOEVDifgBYVPPWqv5yx6MjZN9-koyQ' 
export const STORAGE_KEY = "daesim_saved_queries_v1";
export const LATEST_JOB_STORAGE_KEY = "daesim_latest_job_id";