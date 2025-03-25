import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[check-ad-status] Handling OPTIONS request');
    return res.status(200).end();
  }

  const { listingId, frameId } = req.query;

  console.log('[check-ad-status] Request Query:', { listingId, frameId });

  if (!listingId || !frameId) {
    console.log('[check-ad-status] Missing listingId or frameId');
    return res.status(400).json({ error: 'Missing listingId or frameId' });
  }

  try {
    const { data: frameData, error: frameError } = await supabase
      .from('frames')
      .select('campaign_id')
      .eq('frame_id', frameId)
      .single();

    console.log('[check-ad-status] Frame Query Result:', { frameData, frameError });

    if (frameError || !frameData) {
      console.log('[check-ad-status] Frame not found');
      return res.status(404).json({ isActive: false, error: 'Frame not found' });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('campaign_details, budget, impressions, clicks')
      .eq('id', frameData.campaign_id)
      .single();

    console.log('[check-ad-status] Campaign Query Result:', { campaign, campaignError });

    if (campaignError || !campaign) {
      console.log('[check-ad-status] Campaign not found');
      return res.status(404).json({ isActive: false, error: 'Campaign not found' });
    }

    const endDate = new Date(
      campaign.campaign_details.endDate.year,
      campaign.campaign_details.endDate.month - 1,
      campaign.campaign_details.endDate.day
    );
    const today = new Date();
    const budget = parseFloat(campaign.budget) || 0;
    const spent = (campaign.clicks || 0) * 0.24; // Assuming $0.24 per click

    const isNotExpired = endDate >= today;
    const isWithinBudget = spent < budget;
    const isActive = isNotExpired && isWithinBudget;

    console.log('[check-ad-status] Ad Status Details:', {
      isActive,
      endDate: endDate.toISOString(),
      today: today.toISOString(),
      budget,
      spent,
      clicks: campaign.clicks,
      impressions: campaign.impressions
    });

    return res.status(200).json({ isActive });
  } catch (error) {
    console.error('[check-ad-status] Error:', error);
    return res.status(500).json({ isActive: false, error: 'Internal server error' });
  }
};