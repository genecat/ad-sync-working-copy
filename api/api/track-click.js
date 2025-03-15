import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async function handler(req, res) {
  console.log('Track-click request received:', req.method, req.body);

  if (req.method === 'POST') {
    const { listingId, frame, campaignId } = req.body;

    console.log('Parameters:', { listingId, frame, campaignId });

    if (!listingId || !frame) {
      console.log('Missing parameters in track-click');
      return res.status(400).json({ error: 'Missing listingId or frame' });
    }

    try {
      const { error } = await supabase.rpc('increment_click', {
        p_listing_id: listingId,
        p_frame: frame,
        p_campaign_id: campaignId || 'unknown'
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        return res.status(500).json({ error: 'Failed to increment click', details: error.message });
      }

      console.log('Click tracked successfully for:', { listingId, frame, campaignId });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in track-click handler:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } else {
    console.log('Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
  }
}