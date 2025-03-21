import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const frame = req.query.frame;
  const campaignId = req.query.campaignId;

  console.log("Request URL:", req.url);
  console.log("Frame:", frame, "Campaign ID:", campaignId);

  if (!frame) {
    console.log("Missing Frame Parameter:", { frame });
    res.status(400).send('Missing frame parameter');
    return;
  }

  // Fetch frame data from the frames table
  const { data: frameData, error: frameError } = await supabase
    .from('frames')
    .select('frame_id, campaign_id, uploaded_file, price_per_click, size')
    .eq('frame_id', frame)
    .single();

  console.log("Frame Query Result:", { frameData, frameError });

  if (frameError) {
    console.log("Frame Error:", frameError);
    res.status(404).send('Frame not found');
    return;
  }

  if (!frameData) {
    console.log("No frame data found for frame:", frame);
    res.status(404).send('Frame not found');
    return;
  }

  console.log("Frame Data:", frameData);

  // Fetch campaign data to get target URL and check if active
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, campaign_details')
    .eq('id', frameData.campaign_id)
    .single();

  console.log("Campaign Query Result:", { campaign, campaignError });

  if (campaignError || !campaign) {
    console.log("Campaign Error:", campaignError);
    res.status(404).send('Campaign not found');
    return;
  }
  console.log("Campaign Data:", campaign);

  // Check if campaign is active based on endDate
  const endDate = new Date(
    campaign.campaign_details.endDate.year,
    campaign.campaign_details.endDate.month - 1,
    campaign.campaign_details.endDate.day
  );
  const today = new Date();
  if (endDate < today) {
    res.status(400).send('Campaign has expired');
    return;
  }

  const imageUrl = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frameData.uploaded_file}`;
  const targetUrl = campaign.campaign_details.targetURL || "https://mashdrop.com";

  console.log("Final Image URL:", imageUrl);
  console.log("Target URL:", targetUrl);

  res.status(200).setHeader('Content-Type', 'text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ad</title>
      <script>
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'IMG') {
            e.preventDefault();
            console.log('Click event triggered for ad');
            fetch('https://my-ad-agency-k81keyc90-genecats-projects.vercel.app/api/track-click', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: '${frame}', campaignId: '${campaignId || frameData.campaign_id}' })
            }).then(response => {
              if (response.ok) {
                window.open('${targetUrl}', '_blank');
              } else {
                window.open('${targetUrl}', '_blank');
              }
            }).catch(error => {
              window.open('${targetUrl}', '_blank');
            });
          }
        });
      </script>
    </head>
    <body>
      <img src="${imageUrl}" width="${frameData.size.split('x')[0]}" height="${frameData.size.split('x')[1]}" style="border:none; max-width: 100%; max-height: 100%;" alt="Ad for Frame ${frame}" />
    </body>
    </html>
  `);
};