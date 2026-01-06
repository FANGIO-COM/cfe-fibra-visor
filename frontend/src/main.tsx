import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./tw-output.css";         // CSS generado por Tailwind
import "leaflet/dist/leaflet.css"; // importante para que el mapa se vea bien

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
