import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pczzwgluhgrjuxjadyaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MjMxMzcsImV4cCI6MjA0MTQ5OTEzN30.-i7uL-3n0L4DmiH2UoxXNsZ5vO6NaTLH-Zm4hQ0L7L8';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async (req, res) => {
  // Allow CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'Preflight successful' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get query parameters
  const { frame, campaignId } = req.query;

  // Validate query parameters
  if (!frame || !campaignId) {
    return res.status(400).json({ error: 'Missing required query parameters: frame and campaignId' });
  }

  try {
    // Insert impression into Supabase
    const { error } = await supabase
      .from('impressions')
      .insert([
        {
          frame_id: frame,
          campaign_id: campaignId,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('[record-impression] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to record impression', details: error.message });
    }

    return res.status(200).json({ message: 'Impression recorded successfully' });
  } catch (error) {
    console.error('[record-impression] Server error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};