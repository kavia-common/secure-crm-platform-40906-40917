import axios from "axios";

/**
 * PUBLIC_INTERFACE
 * getApiClient returns a configured axios instance with auth headers and interceptors.
 */
export function getApiClient(getToken) {
  const baseURL = process.env.REACT_APP_API_BASE || "/api";
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use(async (config) => {
    const token = typeof getToken === "function" ? await getToken() : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      // Optionally handle global 401/403 etc.
      return Promise.reject(err);
    }
  );

  return instance;
}
