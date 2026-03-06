import axios from 'axios';

// The base URL of our FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// The development API Key configured in our FastAPI backend
const API_KEY = 'dev-key-123';

/**
 * Pre-configured Axios instance for fetching data from the strict SPP Server.
 * Automatically injects the X-API-Key dependency into every request.
 */
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
    },
});

export default apiClient;
