import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3000;

// Initialize Supabase client with the service key
const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDE2NjQxNCwiZXhwIjoyMDU1NzQyNDE0fQ.jelj5kPitIzSObPgE4mgV4DsZlYLhiKPdfBLP2Gva2s'
);

// API Key for authentication
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDE2NjQxNCwiZXhwIjoyMDU1NzQyNDE0fQ.jelj5kPitIzSObPgE4mgV4DsZlYLhiKPdfBLP2Gva2s'; // Replace with a secure key in production

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning', 'X-API-Key']
}));

// Parse JSON bodies for POST requests
app.use(express.json());

// Handle preflight OPTIONS requests
app.options('*', cors());

// Middleware to check API key for protected routes
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    console.log('[API] Invalid or missing API key');
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// API route: /api/check-ad-status
app.get('/api/check-ad-status', async (req, res) => {
  const { listingId, frameId } = req.query;

  if (!listingId || !frameId) {
    return res.status(400).json({ error: 'Missing listingId or frameId' });
  }

  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, is_active, status, selected_publishers')
      .eq('status', 'approved')
      .eq('is_active', true);

    if (error) throw error;

    let isActive = false;
    for (const campaign of campaigns) {
      const publishers = campaign.selected_publishers || [];
      const publisherMatch = publishers.some(publisher =>
        publisher.id === listingId &&
        publisher.extra_details?.framesChosen?.[frameId]
      );
      if (publisherMatch) {
        isActive = true;
        break;
      }
    }

    res.json({ isActive });
  } catch (error) {
    console.error('Error checking ad status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API route: /api/serve-ad/listingId
app.get('/api/serve-ad/listingId', async (req, res) => {
  const { listingId, frame } = req.query;

  if (!listingId || !frame) {
    return res.status(400).send('Missing listingId or frame');
  }

  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, campaign_details, selected_publishers')
      .eq('status', 'approved')
      .eq('is_active', true);

    if (error) throw error;

    let adUrl = null;
    let targetUrl = null;
    let campaignId = null;

    for (const campaign of campaigns) {
      const publishers = campaign.selected_publishers || [];
      const publisherMatch = publishers.find(publisher =>
        publisher.id === listingId &&
        publisher.extra_details?.framesChosen?.[frame]
      );

      if (publisherMatch) {
        adUrl = publisherMatch.frames_purchased?.[0]?.uploadedFile;
        targetUrl = campaign.campaign_details?.targetURL;
        campaignId = campaign.id;
        break;
      }
    }

    if (adUrl && targetUrl) {
      // Track impression
      const { error: impressionError } = await supabase
        .from('impressions')
        .insert({ campaign_id: campaignId, frame_id: frame });

      if (impressionError) {
        console.error('Error tracking impression:', impressionError.message);
      }

      // Serve the ad with a click handler
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <a href="javascript:void(0)" onclick="handleClick('${targetUrl}', '${frame}', '${campaignId}')">
          <img src="${adUrl}" alt="Advertisement" style="width: 100%; height: 100%;" />
        </a>
        <script>
          function handleClick(targetUrl, frame, campaignId) {
            fetch('http://localhost:3000/api/track-click', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-API-Key': '${API_KEY}'
              },
              body: JSON.stringify({ frame, campaignId })
            })
            .then(response => response.json())
            .then(data => {
              console.log('Click tracked:', data);
              window.open(targetUrl, '_blank');
            })
            .catch(error => {
              console.error('Error tracking click:', error);
              window.open(targetUrl, '_blank');
            });
          }
        </script>
      `);
    } else {
      res.status(404).send('No active ad found for this frame');
    }
  } catch (error) {
    console.error('Error fetching ad:', error.message);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// API route: /api/track-impression (protected)
app.post('/api/track-impression', checkApiKey, async (req, res) => {
  const { frame, campaignId } = req.body;

  if (!frame || !campaignId) {
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    const { error } = await supabase
      .from('impressions')
      .insert({ campaign_id: campaignId, frame_id: frame });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking impression:', error.message);
    res.status(500).json({ error: 'Failed to track impression' });
  }
});

// API route: /api/track-click (protected)
app.post('/api/track-click', checkApiKey, async (req, res) => {
  const { frame, campaignId } = req.body;

  if (!frame || !campaignId) {
    return res.status(400).json({ error: 'Missing frame or campaignId' });
  }

  try {
    const { error } = await supabase
      .from('clicks')
      .insert({ campaign_id: campaignId, frame_id: frame });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error.message);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// API route: /api/analytics
app.get('/api/analytics', async (req, res) => {
  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({ error: 'Missing campaignId' });
  }

  try {
    const { data: impressions, error: impressionsError } = await supabase
      .from('impressions')
      .select('id')
      .eq('campaign_id', campaignId);

    if (impressionsError) throw impressionsError;

    const { data: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('id')
      .eq('campaign_id', campaignId);

    if (clicksError) throw clicksError;

    res.json({
      impressions: impressions.length,
      clicks: clicks.length,
      ctr: clicks.length / (impressions.length || 1) // Click-through rate
    });
  } catch (error) {
    console.error('Error fetching analytics:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// API route: /api/cpm
app.get('/api/cpm', async (req, res) => {
  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({ error: 'Missing campaignId' });
  }

  try {
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('campaign_details')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) throw new Error('Campaign not found');

    const budget = campaign.campaign_details?.budget || 0;

    const { data: impressions, error: impressionsError } = await supabase
      .from('impressions')
      .select('id')
      .eq('campaign_id', campaignId);

    if (impressionsError) throw impressionsError;

    const impressionCount = impressions.length;
    const cpm = impressionCount > 0 ? (budget / impressionCount) * 1000 : 0;

    res.json({ campaignId, impressions: impressionCount, budget, cpm });
  } catch (error) {
    console.error('Error calculating CPM:', error.message);
    res.status(500).json({ error: 'Failed to calculate CPM' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});