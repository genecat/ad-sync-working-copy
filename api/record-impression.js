import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pczzwgluhgrjuxjadyaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MjMxMzcsImV4cCI6MjA0MTQ5OTEzN30.-i7uL-3n0L4DmiH2UoxXNsZ5vO6NaTLH-Zm4hQ0L7L8';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async (req, res) => {
  // Allow CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Log the incoming request
  console.log('[record-impression] Incoming request:', {
    method: req.method,
    query: req.query,
    headers: req.headers
  });

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    console.log('[record-impression] Handling OPTIONS preflight');
    return res.status(200).json({ message: 'Preflight successful' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log('[record-impression] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get query parameters
  const { frame, campaignId } = req.query;

  // Validate query parameters
  if (!frame || !campaignId) {
    console.log('[record-impression] Missing query parameters:', { frame, campaignId });
    return res.status(400).json({ error: 'Missing required query parameters: frame and campaignId' });
  }

  try {
    console.log('[record-impression] Attempting to insert impression:', { frame, campaignId });

    // Insert impression into Supabase
    const { data, error } = await supabase
      .from('impressions')
      .insert([
        {
          frame_id: frame,
          campaign_id: campaignId,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('[record-impression] Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to record impression', details: error.message });
    }

    console.log('[record-impression] Impression inserted successfully:', data);
    return res.status(200).json({ message: 'Impression recorded successfully', data });
  } catch (error) {
    console.error('[record-impression] Server error:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};