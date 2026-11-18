import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AjustesProvider } from './ajustes.jsx'
import { AuthProvider } from './auth.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AjustesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AjustesProvider>
    </BrowserRouter>
  </StrictMode>,
)