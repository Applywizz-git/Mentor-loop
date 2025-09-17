import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/lib/supabase';

// quick sanity check
console.log('[Supabase URL]', import.meta.env.VITE_SUPABASE_URL);
console.log('[Supabase client]', supabase);


createRoot(document.getElementById("root")!).render(<App />);
