import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

export default async (req, res) => {
  const listingId = req.query.listingId || req.url.split('/').pop().split('?')[0];
  const frame = req.query.frame;
  const campaignId = req.query.campaignId;

  console.log("Request URL:", req.url);
  console.log("Listing ID:", listingId, "Frame:", frame, "Campaign ID:", campaignId);

  if (!listingId || !frame) {
    console.log("Missing Parameters:", { listingId, frame });
    res.status(400).send('Missing listingId or frame parameter');
    return;
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, selected_frames')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) {
    console.log("Listing Error:", listingError);
    res.status(404).send('Listing not found');
    return;
  }
  console.log("Listing Data:", listing);

  let campaignQuery = supabase
    .from('campaigns')
    .select('id, selected_publishers, campaign_details')
    .contains('selected_publishers', JSON.stringify([{ id: listingId }]))
    .limit(1);

  if (campaignId) {
    campaignQuery = campaignQuery.eq('id', campaignId);
  }

  const { data: campaign, error: campaignError } = await campaignQuery;

  if (campaignError) {
    console.log("Campaign Query Error:", campaignError);
  }
  console.log("Campaign Data:", campaign);

  let imageUrl = null;
  let targetUrl = "https://mashdrop.com"; // Default target URL
  if (campaign && campaign.length > 0) {
    const publisher = campaign[0].selected_publishers.find(p => p.id === listingId);
    console.log("Publisher Found:", publisher);
    if (publisher && publisher.extra_details && publisher.extra_details.uploads) {
      const uploadedFile = publisher.extra_details.uploads[frame];
      console.log("Uploaded File for Frame:", uploadedFile);
      if (uploadedFile) {
        imageUrl = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${uploadedFile}`;
        await supabase.rpc('increment_impression', {
          p_listing_id: listingId,
          p_frame: frame,
          p_campaign_id: campaignId || 'unknown'
        });
      }
      if (campaign[0].campaign_details && campaign[0].campaign_details.targetURL) {
        targetUrl = campaign[0].campaign_details.targetURL;
      } else if (publisher.url) {
        targetUrl = publisher.url;
      }
    }
  }

  if (!imageUrl) {
    const frames = typeof listing.selected_frames === 'string' ? JSON.parse(listing.selected_frames) : listing.selected_frames;
    console.log("Frames from Listing:", frames);
    const frameData = frames[frame];
    console.log("Frame Data:", frameData);
    imageUrl = frameData && frameData.uploadedFile
      ? `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frameData.uploadedFile}`
      : null;
    if (imageUrl) {
      await supabase.rpc('increment_impression', {
        p_listing_id: listingId,
        p_frame: frame,
        p_campaign_id: campaignId || 'unknown'
      });
    }
  }

  console.log("Final Image URL:", imageUrl);
  console.log("Target URL:", targetUrl);

  if (imageUrl) {
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
              console.log('Sending fetch to https://my-ad-agency.vercel.app/api/track-click with:', { listingId: '${listingId}', frame: '${frame}', campaignId: '${campaignId || 'unknown'}' });
              fetch('https://my-ad-agency.vercel.app/api/track-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: '${listingId}', frame: '${frame}', campaignId: '${campaignId || 'unknown'}' })
              }).then(response => {
                console.log('Fetch response:', response);
                if (response.ok) {
                  console.log('Click tracked successfully, redirecting to:', '${targetUrl}');
                  window.open('${targetUrl}', '_blank');
                } else {
                  console.error('Failed to track click:', response.statusText);
                  window.open('${targetUrl}', '_blank');
                }
              }).catch(error => {
                console.error('Error tracking click:', error);
                window.open('${targetUrl}', '_blank');
              });
            }
          });
        </script>
      </head>
      <body>
        <img src="${imageUrl}" width="300" height="250" style="border:none; max-width: 100%; max-height: 100%;" alt="Ad for Listing ${listingId}" />
      </body>
      </html>
    `);
  } else {
    res.status(400).setHeader('Content-Type', 'text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ad</title>
      </head>
      <body>
        <div style="width: 100%; height: 100%; background-color: #f0f0f0; display: flex; justify-content: center; align-items: center;">
          <h2>Ad Placeholder for Listing ${listingId} (${frame})</h2>
        </div>
      </body>
      </html>
    `);
  }
};