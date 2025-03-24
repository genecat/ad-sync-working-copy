import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { frame, campaignId } = req.body;

  if (!frame || !campaignId) {
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    // Increment the impressions count in the campaigns table
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('impressions')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('Error fetching campaign:', fetchError);
      return res.status(500).json({ error: 'Error fetching campaign' });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const newImpressions = (campaign.impressions || 0) + 1;

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ impressions: newImpressions })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating impressions:', updateError);
      return res.status(500).json({ error: 'Error updating impressions' });
    }

    return res.status(200).json({ success: true, impressions: newImpressions });
  } catch (error) {
    console.error('Error in track-impression:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};