import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

const API_KEY = 'your-secret-api-key-12345';

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    console.log('[track-impression] Handling OPTIONS request');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ message: 'CORS preflight successful' });
  }

  if (req.method !== 'POST') {
    console.log('[track-impression] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    console.log('[track-impression] Invalid or missing API key');
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  const { frame, campaignId } = req.body;

  console.log('[track-impression] Request Body:', { frame, campaignId });

  if (!frame || !campaignId) {
    console.log('[track-impression] Missing frame or campaignId');
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('impressions')
      .eq('id', campaignId)
      .single();

    console.log('[track-impression] Campaign Query Result:', { campaign, campaignError });

    if (campaignError || !campaign) {
      console.log('[track-impression] Campaign not found');
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const newImpressions = (campaign.impressions || 0) + 1;

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ impressions: newImpressions })
      .eq('id', campaignId);

    console.log('[track-impression] Update Result:', { newImpressions, updateError });

    if (updateError) {
      console.error('[track-impression] Update Error:', updateError);
      return res.status(500).json({ error: 'Failed to update impressions' });
    }

    return res.status(200).json({ success: true, impressions: newImpressions });
  } catch (error) {
    console.error('[track-impression] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};