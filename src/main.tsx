import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UpdateBanner } from './ui/UpdateBanner';
import 'galmuri/dist/galmuri.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
        <UpdateBanner />
    </StrictMode>,
);
