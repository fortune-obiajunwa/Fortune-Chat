
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_BASE_URL = BASE_URL.endsWith("/")
  ? BASE_URL.slice(0, -1)
  : BASE_URL;
