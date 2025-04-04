import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const API_KEY = 'your-secret-api-key-12345';

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    console.log('[track-click] Handling OPTIONS request');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ message: 'CORS preflight successful' });
  }

  if (req.method !== 'POST') {
    console.log('[track-click] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    console.log('[track-click] Invalid or missing API key');
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  const { frame, campaignId } = req.body;

  console.log('[track-click] Request Body:', { frame, campaignId });

  if (!frame || !campaignId) {
    console.log('[track-click] Missing frame or campaignId');
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('clicks')
      .eq('id', campaignId)
      .single();

    console.log('[track-click] Campaign Query Result:', { campaign, campaignError });

    if (campaignError || !campaign) {
      console.log('[track-click] Campaign not found');
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const newClicks = (campaign.clicks || 0) + 1;

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ clicks: newClicks })
      .eq('id', campaignId);

    console.log('[track-click] Update Result:', { newClicks, updateError });

    if (updateError) {
      console.error('[track-click] Update Error:', updateError);
      return res.status(500).json({ error: 'Failed to update clicks' });
    }

    return res.status(200).json({ success: true, clicks: newClicks });
  } catch (error) {
    console.error('[track-click] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};