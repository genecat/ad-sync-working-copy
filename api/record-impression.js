import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pczzwgluhgrjuxjadyaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('[record-impression] Incoming request (v2):', {
    method: req.method,
    query: req.query,
    headers: req.headers
  });

  if (req.method === 'OPTIONS') {
    console.log('[record-impression] Handling OPTIONS preflight');
    return res.status(200).json({ message: 'Preflight successful' });
  }

  if (req.method !== 'GET') {
    console.log('[record-impression] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frame, campaignId } = req.query;

  if (!frame || !campaignId) {
    console.log('[record-impression] Missing query parameters:', { frame, campaignId });
    return res.status(400).json({ error: 'Missing required query parameters: frame and campaignId' });
  }

  try {
    console.log('[record-impression] Attempting to test Supabase connection');

    const { data, error } = await supabase
      .from('impressions')
      .select('count', { count: 'exact' });

    if (error) {
      console.error('[record-impression] Supabase select error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to query Supabase', details: error.message || 'Unknown error' });
    }

    console.log('[record-impression] Supabase query successful:', data);
    return res.status(200).json({ message: 'Supabase connection works', rowCount: data[0].count });
  } catch (error) {
    console.error('[record-impression] Server error:', {
      message: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    return res.status(500).json({ error: 'Server error', details: error.message || 'Unknown error' });
  }
};