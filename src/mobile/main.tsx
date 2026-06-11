import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../renderer/src/App'
import '../renderer/src/index.css'
import { mobileApi, initMobileApi } from './api'

// Injecte l'implémentation mobile de window.vigie (équivalent du preload Electron)
;(window as unknown as { vigie: typeof mobileApi }).vigie = mobileApi

initMobileApi().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
