import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'Preflight successful' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listingId, frameId } = req.query;

  if (!listingId || !frameId) {
    return res.status(400).json({ error: 'Missing required query parameters: listingId and frameId' });
  }

  try {
    const { data: frame, error: frameError } = await supabase
      .from('frames')
      .select('campaign_id, price_per_click')
      .eq('listing_id', listingId)
      .eq('frame_id', frameId)
      .single();

    if (frameError || !frame) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('campaign_details')
      .eq('id', frame.campaign_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const endDate = new Date(
      campaign.campaign_details.endDate.year,
      campaign.campaign_details.endDate.month - 1,
      campaign.campaign_details.endDate.day
    );
    const today = new Date();

    const { count: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('*', { count: 'exact', head: true })
      .eq('frame_id', frameId);

    if (clicksError) {
      console.error('[check-ad-status] Error fetching clicks:', clicksError);
      return res.status(500).json({ error: 'Error fetching clicks' });
    }

    const { count: impressions, error: impressionsError } = await supabase
      .from('impressions')
      .select('*', { count: 'exact', head: true })
      .eq('frame_id', frameId);

    if (impressionsError) {
      console.error('[check-ad-status] Error fetching impressions:', impressionsError);
      return res.status(500).json({ error: 'Error fetching impressions' });
    }

    const budget = parseFloat(campaign.campaign_details.budget) || 0;
    const pricePerClick = parseFloat(frame.price_per_click) || 0;
    const spent = clicks * pricePerClick;

    const isActive = endDate >= today && (budget === 0 || spent < budget);

    console.log('[check-ad-status] Ad Status Details:', {
      isActive,
      endDate: endDate.toISOString(),
      today: today.toISOString(),
      budget,
      spent,
      clicks,
      impressions
    });

    return res.status(200).json({ isActive });
  } catch (error) {
    console.error('[check-ad-status] Server error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};