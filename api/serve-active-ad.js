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

  const { listingId, slotId } = req.query;

  if (!listingId || !slotId) {
    return res.status(400).json({ error: 'Missing required query parameters: listingId and slotId' });
  }

  try {
    const { data: frames, error: framesError } = await supabase
      .from('frames')
      .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
      .eq('listing_id', listingId)
      .order('frame_id', { ascending: true });

    if (framesError) {
      console.error('[serve-active-ad] Error fetching frames:', framesError);
      return res.status(500).json({ error: 'Error fetching frames' });
    }

    if (!frames || frames.length === 0) {
      console.log('[serve-active-ad] No frames found for listingId:', listingId);
      return res.status(404).send('');
    }

    const activeFrames = [];
    for (const frame of frames) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('campaign_details')
        .eq('id', frame.campaign_id)
        .single();

      if (campaignError || !campaign) {
        console.log('[serve-active-ad] Campaign not found for frame:', frame.frame_id);
        continue;
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
        .eq('frame_id', frame.frame_id);

      if (clicksError) {
        console.error('[serve-active-ad] Error fetching clicks:', clicksError);
        continue;
      }

      const budget = parseFloat(campaign.campaign_details.budget) || 0;
      const pricePerClick = parseFloat(frame.price_per_click) || 0;
      const spent = clicks * pricePerClick;

      const isActive = endDate >= today && (budget === 0 || spent < budget);

      if (isActive) {
        activeFrames.push({ ...frame, targetUrl: campaign.campaign_details.targetURL || 'https://mashdrop.com' });
      }
    }

    console.log('[serve-active-ad] Active frames for listingId:', listingId, activeFrames.map(f => f.frame_id));

    if (activeFrames.length === 0) {
      console.log('[serve-active-ad] No active frames found for listingId:', listingId);
      return res.status(404).send('');
    }

    let frame;
    if (slotId === '1') {
      frame = activeFrames.find(f => f.frame_id === 'frame1742779287494'); // Maui-Surfboards
    } else if (slotId === '2') {
      frame = activeFrames.find(f => f.frame_id === 'frame1741684967676'); // Ad-Sync
    }

    if (!frame) {
      console.log('[serve-active-ad] No matching frame for slotId:', slotId);
      return res.status(404).send('');
    }

    console.log('[serve-active-ad] Selected frame for slotId:', slotId, 'frameId:', frame.frame_id);

    const imageUrl = frame.uploaded_file.startsWith('http')
      ? frame.uploaded_file
      : `${process.env.SUPABASE_URL}/storage/v1/object/public/ad