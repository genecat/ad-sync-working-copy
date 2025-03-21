import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('Headers set:', res.getHeaders());

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  const { frameId } = req.query;

  if (!frameId) {
    return res.status(400).json({ error: 'Missing frameId' });
  }

  try {
    // Check if the frame exists and is associated with an active campaign
    const { data: frameData, error: frameError } = await supabase
      .from('frames')
      .select('campaign_id')
      .eq('frame_id', frameId)
      .single();

    console.log('Frame Query Result:', { frameData, frameError });

    if (frameError) {
      console.error('Frame Query Error:', frameError);
      return res.status(500).json({ error: 'Error fetching frame data' });
    }

    if (!frameData) {
      return res.status(200).json({ isActive: false });
    }

    // Check if the campaign is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('campaign_details')
      .eq('id', frameData.campaign_id)
      .single();

    console.log('Campaign Query Result:', { campaign, campaignError });

    if (campaignError) {
      console.error('Campaign Query Error:', campaignError);
      return res.status(500).json({ error: 'Error fetching campaign data' });
    }

    if (!campaign) {
      return res.status(200).json({ isActive: false });
    }

    const endDate = new Date(
      campaign.campaign_details.endDate.year,
      campaign.campaign_details.endDate.month - 1,
      campaign.campaign_details.endDate.day
    );
    const today = new Date();
    const isActive = endDate >= today;

    return res.status(200).json({ isActive });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}