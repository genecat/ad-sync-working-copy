import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pczzwgluhgrjuxjadyaq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0');

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { listingId, frameId } = req.query;
  if (!listingId || !frameId) {
    return res.status(400).json({ error: 'Missing listingId or frameId' });
  }

  const { data: frameData, error: frameError } = await supabase
    .from('frames')
    .select('uploaded_file, campaign_id')
    .eq('listing_id', listingId)
    .eq('frame_id', frameId)
    .single();
  if (frameError || !frameData) {
    return res.status(404).json({ error: 'Ad not found' });
  }

  const campaignId = frameData.campaign_id;
  const imageUrl = frameData.uploaded_file;

  const { data: campaignData, error: campaignError } = await supabase
    .from('campaigns')
    .select('campaign_details')
    .eq('id', campaignId)
    .single();
  if (campaignError || !campaignData) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const targetUrl = campaignData.campaign_details?.targetURL || 'https://mashdrop.com';

  await supabase.rpc('increment_impression', {
    p_listing_id: listingId,
    p_frame: frameId,
    p_campaign_id: campaignId
  });

  res.status(200).json({ imageUrl, targetUrl, listingId, frameId, campaignId });
};