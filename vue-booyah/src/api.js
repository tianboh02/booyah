import axios from 'axios';

// Vite exposes env variables via import.meta.env
//if local start up, use local host, if vercel use the env in vercel
const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default API;