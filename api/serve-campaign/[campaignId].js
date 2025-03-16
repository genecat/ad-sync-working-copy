import { createClient } from '@supabase/supabase-js';

// SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://pczzwgluhgrjuxjadyaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async (req, res) => {
  let campaignId = req.query.campaignId || (req.params && req.params.campaignId);

  if (!campaignId) {
    return res.status(400).send('<h1>400 - Bad Request</h1><p>No campaign ID provided.</p>');
  }

  try {
    // Fetch the campaign row
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, campaign_details, selected_publishers')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      console.error('Campaign not found:', error);
      return res.status(404).send('<h1>404 - Campaign Not Found</h1>');
    }

    // Parse campaign details to get target URL
    let targetURL = 'https://default-target.com';
    try {
      const campaignDetails = typeof campaign.campaign_details === 'string'
        ? JSON.parse(campaign.campaign_details)
        : campaign.campaign_details;

      if (campaignDetails && campaignDetails.targetURL) {
        targetURL = campaignDetails.targetURL;
      }
    } catch (parseError) {
      console.error('Error parsing campaign_details:', parseError);
    }

    // Ensure 'selected_publishers' is an object
    let publishers;
    try {
      publishers = typeof campaign.selected_publishers === 'string'
        ? JSON.parse(campaign.selected_publishers)
        : campaign.selected_publishers;
    } catch (parseError) {
      console.error('Error parsing selected_publishers:', parseError);
      return res.status(500).send('<h1>500 - Internal Server Error</h1><p>Error parsing campaign data.</p>');
    }

    // Extract the uploaded ad image
    let uploadedFilePath = null;
    let listingId = '2a4f917f-196f-4584-bf80-10fad4f018c6'; // Hardcoded for now, based on ad_stats
    let frame = 'frame5'; // Hardcoded for now, based on ad_stats
    if (publishers && publishers.length > 0) {
      const firstPub = publishers[0];
      const frames = firstPub.frames_purchased || [];
      uploadedFilePath = frames.length > 0 ? frames[0].uploadedFile : null;
      // Optionally, extract listingId and frame dynamically from selected_publishers if available
    }

    if (!uploadedFilePath) {
      return res.send('<h1>No ad uploaded for this campaign.</h1>');
    }

    // Track impression
    try {
      const { error: impressionError } = await supabase.rpc('increment_impression', {
        p_listing_id: listingId,
        p_frame: frame,
        p_campaign_id: campaignId
      });
      if (impressionError) {
        console.error('Failed to track impression:', impressionError);
      } else {
        console.log('Impression tracked successfully for:', { listingId, frame, campaignId });
      }
    } catch (impressionErr) {
      console.error('Error tracking impression:', impressionErr);
    }

    // Construct the ad image URL
    const adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${uploadedFilePath}`;

    // Use the correct Listing ID and frame from your database
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body { margin: 0; padding: 0; background: #fff; text-align: center; }
            img { max-width: 100%; border: none; cursor: pointer; }
          </style>
          <script>
            function trackClick() {
              fetch('/api/track-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  listingId: '${listingId}', 
                  frame: '${frame}', 
                  campaignId: '${campaignId}'
                })
              }).then(response => {
                if (response.ok) {
                  console.log('Click tracked successfully, redirecting to:', '${targetURL}');
                  window.open('${targetURL}', '_blank');
                } else {
                  console.error('Failed to track click:', response.statusText);
                  window.open('${targetURL}', '_blank');
                }
              }).catch(error => {
                console.error('Error tracking click:', error);
                window.open('${targetURL}', '_blank');
              });
            }
          </script>
        </head>
        <body>
          <a href="javascript:void(0)" onclick="trackClick()">
            <img src="${adImageURL}" alt="Ad Creative" />
          </a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('<h1>500 - Internal Server Error</h1><p>Something went wrong while fetching the ad.</p>');
  }
};