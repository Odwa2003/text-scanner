import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CameraCapture from './components/CameraCapture'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CameraCapture />
  </StrictMode>,
)
