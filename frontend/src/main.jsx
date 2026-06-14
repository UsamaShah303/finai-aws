import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Configure Axios base URL for production deployment on CloudFront
const apiEnv = import.meta.env.VITE_API_URL;
if (apiEnv) {
  axios.defaults.baseURL = apiEnv;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

