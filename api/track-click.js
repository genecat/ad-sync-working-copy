import { createClient } from '@supabase/supabase-js';
// Test auto-assignment

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async function handler(req, res) {
  console.log('Track-click request received:', req.method, req.body, new Date().toISOString());

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method, new Date().toISOString());
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listingId, frame, campaignId } = req.body;

  console.log('Parameters received:', { listingId, frame, campaignId }, new Date().toISOString());

  if (!listingId || !frame) {
    console.log('Missing parameters in track-click', new Date().toISOString());
    return res.status(400).json({ error: 'Missing listingId or frame' });
  }

  try {
    console.log('Calling increment_click with:', { p_listing_id: listingId, p_frame: frame, p_campaign_id: campaignId || 'unknown' }, new Date().toISOString());
    const { error } = await supabase.rpc('increment_click', {
      p_listing_id: listingId,
      p_frame: frame,
      p_campaign_id: campaignId || 'unknown'
    });

    if (error) {
      console.error('Supabase RPC error:', { code: error.code, message: error.message, details: error.details }, new Date().toISOString());
      return res.status(500).json({ error: 'Failed to increment click', details: error.message });
    }

    console.log('Click tracked successfully for:', { listingId, frame, campaignId }, new Date().toISOString());
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unexpected error in track-click handler:', error.stack || error.message, new Date().toISOString());
    res.status(500).json({ error: 'Internal server error', details: error.message || 'Unknown error' });
  }
}
