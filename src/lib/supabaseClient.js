// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://pczzwgluhgrjuxjadyaq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDE2NjQxNCwiZXhwIjoyMDU1NzQyNDE0fQ.jelj5kPitIzSObPgE4mgV4DsZlYLhiKPdfBLP2Gva2s';

// Create a single Supabase client instance for the entire application
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false, // Disable session persistence to ensure service key is used
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Adjust if needed for your use case
    },
  },
});