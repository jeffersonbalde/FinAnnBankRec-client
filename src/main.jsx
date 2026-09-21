import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-toastify/dist/ReactToastify.css'
import './styles/fb-toast.css'
import './styles/fb-swal.css'
import './index.css'
import './styles/fb-ui.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ModalDirtyProvider } from './context/ModalDirtyContext.jsx'
import { NotificationUnreadProvider } from './context/NotificationUnreadContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationUnreadProvider>
          <ModalDirtyProvider>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={3200}
              hideProgressBar
              newestOnTop
              theme="light"
            />
          </ModalDirtyProvider>
        </NotificationUnreadProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
