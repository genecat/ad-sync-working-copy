const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://pczzwgluhgrjuxjadyaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const app = express();

/**
 * ROUTE: /serve-campaign/:campaignId
 * - Fetches the ad image.
 * - Wraps it in a link that redirects to /track-click/:campaignId
 *   with an optional query parameter "listing_id" for publisher listings.
 */
app.get('/serve-campaign/:campaignId', async (req, res) => {
  const { campaignId } = req.params;

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
    if (publishers.length > 0) {
      const firstPub = publishers[0];
      const frames = firstPub.frames_purchased || [];
      uploadedFilePath = frames.length > 0 ? frames[0].uploadedFile : null;
    }

    if (!uploadedFilePath) {
      return res.send('<h1>No ad uploaded for this campaign.</h1>');
    }

    // Construct the ad image URL
    const adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${uploadedFilePath}`;

    // Use the correct Listing ID from your database.
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body { margin: 0; padding: 0; background: #fff; text-align: center; }
            img { max-width: 100%; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <a href="/track-click/${campaignId}?listing_id=c04e2c31-1ea4-440e-a7ce-80cad002da79" target="_blank">
            <img src="${adImageURL}" alt="Ad Creative" />
          </a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).send('<h1>500 - Internal Server Error</h1><p>Something went wrong while fetching the ad.</p>');
  }
});

/**
 * ROUTE: /track-click/:campaignId
 * - Logs the click for the advertiser's campaign.
 * - If a query parameter "listing_id" is provided, also updates the publisher's listing.
 * - Redirects to the advertiser's target URL.
 */
app.get('/track-click/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  const listingId = req.query.listing_id; // Capture listing id from query parameter

  console.log("Listing ID provided:", listingId);

  // Fetch the campaign
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, campaign_details, clicks')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) {
    console.error('Campaign not found:', error);
    return res.status(404).send('<h1>Campaign Not Found</h1>');
  }

  console.log('Tracking Click for Campaign:', campaign);

  // Ensure the advertiser’s target URL exists
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

  // Update campaign click count for the advertiser
  const newClicks = (campaign.clicks || 0) + 1;
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({ clicks: newClicks })
    .eq('id', campaignId);

  if (updateError) {
    console.error('Error updating click count for campaign:', updateError);
  } else {
    console.log(`Click recorded for campaign ${campaignId}, new total: ${newClicks}`);
  }

  // If listingId is provided, update the publisher's listing click count
  if (listingId) {
    // Fetch the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      console.error('Listing not found:', listingError);
    } else {
      // Parse the selected_frames JSON
      let selectedFrames = listing.selected_frames || {};
      if (typeof selectedFrames === 'string') {
        try {
          selectedFrames = JSON.parse(selectedFrames);
        } catch (parseError) {
          console.error(`Error parsing selected_frames for listing id ${listing.id}:`, parseError);
          selectedFrames = {};
        }
      }
      
      // Assume we are updating clicks for frame "frame4"
      const frameKey = 'frame4';
      const currentClicks = parseInt(selectedFrames[frameKey]?.clicks || '0', 10);
      selectedFrames[frameKey] = {
        ...selectedFrames[frameKey],
        clicks: currentClicks + 1
      };

      // Log the new selectedFrames object to verify its content
      console.log("Updating listing, new selectedFrames:", selectedFrames);

      // Update the listing with the new selected_frames JSON (as a string)
      const { error: listingUpdateError } = await supabase
        .from('listings')
        .update({ selected_frames: JSON.stringify(selectedFrames) })
        .eq('id', listingId);

      if (listingUpdateError) {
        console.error('Error updating listing clicks:', listingUpdateError);
      } else {
        console.log(`Listing ${listingId} updated: clicks for ${frameKey} incremented to ${currentClicks + 1}`);
        
        // Fetch the updated listing to verify
        const { data: updatedListing, error: fetchUpdatedError } = await supabase
          .from('listings')
          .select('selected_frames')
          .eq('id', listingId)
          .single();

        if (fetchUpdatedError) {
          console.error("Error fetching updated listing:", fetchUpdatedError);
        } else {
          console.log("Updated listing selected_frames:", updatedListing.selected_frames);
        }
      }
    }
  }

  // Redirect the user to the advertiser's target URL
  res.redirect(targetURL);
});

/**
 * ROUTE: /get-earnings/:campaignId
 * - Computes the publisher's earnings based on clicks and price per click.
 */
app.get('/get-earnings/:campaignId', async (req, res) => {
  const { campaignId } = req.params;

  try {
    // Fetch the campaign details
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, clicks, selected_publishers')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      console.error('Campaign not found:', error);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    console.log('Computing earnings for campaign:', campaign);

    // Parse the selected publishers
    let publishers;
    try {
      publishers = typeof campaign.selected_publishers === 'string'
        ? JSON.parse(campaign.selected_publishers)
        : campaign.selected_publishers;
    } catch (parseError) {
      console.error('Error parsing selected_publishers:', parseError);
      return res.status(500).json({ error: 'Error parsing campaign data' });
    }

    // Extract price per click from the first frame
    let pricePerClick = 0;
    if (publishers.length > 0) {
      const firstPub = publishers[0];
      const frames = firstPub.frames_purchased || [];
      if (frames.length > 0) {
        pricePerClick = parseFloat(frames[0].pricePerClick);
      }
    }

    // Compute earnings
    const earnings = campaign.clicks * pricePerClick;

    console.log(`Earnings for campaign ${campaignId}: $${earnings}`);

    // Return the earnings result
    res.json({
      campaignId: campaign.id,
      clicks: campaign.clicks,
      pricePerClick,
      earnings: earnings.toFixed(2),
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong while calculating earnings' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Ad server listening on port 3000');
});
