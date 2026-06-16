import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store.js'
import { Provider } from 'react-redux'
import { ClerkProvider } from '@clerk/react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if(!clerkPubKey) {
    throw new Error('Clerk publishable key is not defined in environment variables')
}
createRoot(document.getElementById('root')).render(
    <BrowserRouter>
    <ClerkProvider publishableKey={clerkPubKey}>
            <Provider store={store}>
                <App />
            </Provider>
    </ClerkProvider>
    </BrowserRouter>,
)