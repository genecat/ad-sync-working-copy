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
    console.log('[serve-active-ad] Fetching frames for listingId:', listingId);
    console.log('[serve-active-ad] Supabase URL:', process.env.SUPABASE_URL);

    // Test a simple query to confirm table access
    console.log('[serve-active-ad] Testing table access with a simple query');
    const { data: testFrames, error: testError } = await supabase
      .from('public.frames')
      .select('frame_id')
      .limit(1);

    if (testError) {
      console.error('[serve-active-ad] Error with test query:', testError);
      return res.status(500).json({ error: 'Error with test query', details: testError.message });
    }
    console.log('[serve-active-ad] Test query result:', testFrames);

    // Try the original listingId with explicit schema
    let { data: frames, error: framesError } = await supabase
      .from('public.frames')
      .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
      .eq('listing_id', listingId)
      .order('frame_id', { ascending: true });

    if (framesError) {
      console.error('[serve-active-ad] Error fetching frames with original listingId:', framesError);
      return res.status(500).json({ error: 'Error fetching frames', details: framesError.message });
    }

    console.log('[serve-active-ad] Frames found with original listingId:', frames ? frames.map(f => f.frame_id) : 'None');

    // If no frames found, try with uppercase listingId
    if (!frames || frames.length === 0) {
      console.log('[serve-active-ad] Trying uppercase listingId:', listingId.toUpperCase());
      const { data: upperFrames, error: upperFramesError } = await supabase
        .from('public.frames')
        .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
        .eq('listing_id', listingId.toUpperCase())
        .order('frame_id', { ascending: true });

      if (upperFramesError) {
        console.error('[serve-active-ad] Error fetching frames with uppercase listingId:', upperFramesError);
        return res.status(500).json({ error: 'Error fetching frames with uppercase listingId', details: upperFramesError.message });
      }

      frames = upperFrames;
      console.log('[serve-active-ad] Frames found with uppercase listingId:', frames ? frames.map(f => f.frame_id) : 'None');
    }

    // If still no frames, fetch all frames to debug
    if (!frames || frames.length === 0) {
      console.log('[serve-active-ad] No frames found, fetching all frames for debugging');
      const { data: allFrames, error: allFramesError } = await supabase
        .from('public.frames')
        .select('frame_id, listing_id')
        .limit(10);

      if (allFramesError) {
        console.error('[serve-active-ad] Error fetching all frames:', allFramesError);
      } else {
        console.log('[serve-active-ad] All frames in database:', allFrames);
      }

      console.log('[serve-active-ad] No frames found for listingId:', listingId);
      return res.status(404).send('');
    }

    console.log('[serve-active-ad] Frames found:', frames.map(f => f.frame_id));

    const activeFrames = [];
    for (const frame of frames) {
      console.log('[serve-active-ad] Checking campaign for frame:', frame.frame_id);
      const { data: campaign, error: campaignError } = await supabase
        .from('public.campaigns')
        .select('campaign_details, status')
        .eq('id', frame.campaign_id)
        .single();

      if (campaignError || !campaign) {
        console.log('[serve-active-ad] Campaign not found for frame:', frame.frame_id, 'Error:', campaignError);
        continue;
      }

      console.log('[serve-active-ad] Campaign status for frame', frame.frame_id, ':', campaign.status);
      if (campaign.status !== 'approved') {
        console.log('[serve-active-ad] Campaign not approved for frame:', frame.frame_id);
        continue;
      }

      const endDate = new Date(
        campaign.campaign_details.endDate.year,
        campaign.campaign_details.endDate.month - 1,
        campaign.campaign_details.endDate.day
      );
      const today = new Date();
      console.log('[serve-active-ad] Frame:', frame.frame_id, 'End Date:', endDate, 'Today:', today, 'Is Future:', endDate >= today);

      const { count: clicks, error: clicksError } = await supabase
        .from('public.clicks')
        .select('*', { count: 'exact', head: true })
        .eq('frame_id', frame.frame_id);

      if (clicksError) {
        console.error('[serve-active-ad] Error fetching clicks for frame:', frame.frame_id, clicksError);
        continue;
      }

      const budget = parseFloat(campaign.campaign_details.budget) || 0;
      const pricePerClick = parseFloat(frame.price_per_click) || 0;
      const spent = clicks * pricePerClick;
      console.log('[serve-active-ad] Frame:', frame.frame_id, 'Budget:', budget, 'Price per Click:', pricePerClick, 'Clicks:', clicks, 'Spent:', spent);

      const isActive = endDate >= today && (budget === 0 || spent < budget);
      console.log('[serve-active-ad] Frame:', frame.frame_id, 'Is Active:', isActive);

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
      frame = activeFrames[0]; // Pick the first active frame for slotId=1
    } else if (slotId === '2') {
      frame = activeFrames[1] || activeFrames[0]; // Pick the second frame if available, otherwise the first
    }

    if (!frame) {
      console.log('[serve-active-ad] No matching frame for slotId:', slotId);
      return res.status(404).send('');
    }

    console.log('[serve-active-ad] Selected frame for slotId:', slotId, 'frameId:', frame.frame_id);

    const imageUrl = frame.uploaded_file.startsWith('http')
      ? frame.uploaded_file
      : `${process.env.SUPABASE_URL}/storage/v1/object/public/ad-creatives/${frame.uploaded_file}`;
    const [width, height] = frame.size ? frame.size.split('x').map(Number) : [300, 250];

    return res.status(200).setHeader('Content-Type', 'text/html').send(`
      <div class="ad-slot" id="ad-slot-${frame.frame_id}" style="width: ${width}px; height: ${height}px;" data-frame-id="${frame.frame_id}" data-campaign-id="${frame.campaign_id}" data-target-url="${frame.targetUrl}">
        <a href="${frame.targetUrl}" target="_blank" id="ad-link-${frame.frame_id}">
          <img src="${imageUrl}" style="border:none; max-width: 100%; max-height: 100%;" alt="Ad for ${frame.frame_id}" id="ad-image-${frame.frame_id}"/>
        </a>
      </div>
    `);
  } catch (error) {
    console.error('[serve-active-ad] Server error:', error);
    return res.status(500).send('');
  }
};