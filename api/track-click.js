import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pczzwgluhgrjuxjadyaq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0');

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listingId, frameId, campaignId } = req.body;
  if (!listingId || !frameId || !campaignId) {
    return res.status(400).json({ error: 'Missing listingId, frameId, or campaignId' });
  }

  const { data: campaignData, error: campaignError } = await supabase
    .from('campaigns')
    .select('clicks')
    .eq('id', campaignId)
    .single();
  if (campaignError || !campaignData) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const currentClicks = campaignData.clicks || 0;

  const { error: updateError } = await supabase
    .from('campaigns')
    .update({ clicks: currentClicks + 1 })
    .eq('id', campaignId);
  if (updateError) {
    return res.status(500).json({ error: 'Failed to track click' });
  }

  res.status(200).json({ success: true });
};
