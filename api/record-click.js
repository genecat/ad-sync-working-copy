import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('[record-click] Incoming request:', {
    method: req.method,
    query: req.query,
    headers: req.headers
  });

  if (req.method === 'OPTIONS') {
    console.log('[record-click] Handling OPTIONS preflight');
    return res.status(200).json({ message: 'Preflight successful' });
  }

  if (req.method !== 'GET') {
    console.log('[record-click] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frame, campaignId } = req.query;

  if (!frame || !campaignId) {
    console.log('[record-click] Missing query parameters:', { frame, campaignId });
    return res.status(400).json({ error: 'Missing required query parameters: frame and campaignId' });
  }

  try {
    console.log('[record-click] Attempting to insert click:', { frame, campaignId });

    const { data, error } = await supabase
      .from('clicks')
      .insert([
        {
          frame_id: frame,
          campaign_id: campaignId,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('[record-click] Supabase insert error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to record click', details: error.message || 'Unknown error' });
    }

    console.log('[record-click] Click inserted successfully:', data);
    return res.status(200).json({ message: 'Click recorded successfully', data });
  } catch (error) {
    console.error('[record-click] Server error:', {
      message: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    return res.status(500).json({ error: 'Server error', details: error.message || 'Unknown error' });
  }
};