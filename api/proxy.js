export default async (req, res) => {
    // Set CORS headers to allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      console.log('[proxy] Handling OPTIONS request');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ message: 'CORS preflight successful' });
    }
  
    // Handle POST requests
    if (req.method !== 'POST') {
      console.log('[proxy] Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { type, frame, campaignId } = req.body;
  
    if (!type || !frame || !campaignId) {
      console.log('[proxy] Missing type, frame, or campaignId');
      return res.status(400).json({ error: 'Missing type, frame, or campaignId' });
    }
  
    let endpoint;
    if (type === 'impression') {
      endpoint = 'https://my-ad-agency-mb6lrsvoo-genecats-projects.vercel.app/api/track-impression';
    } else if (type === 'click') {
      endpoint = 'https://my-ad-agency-mb6lrsvoo-genecats-projects.vercel.app/api/track-click';
    } else {
      console.log('[proxy] Invalid type:', type);
      return res.status(400).json({ error: 'Invalid type' });
    }
  
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-secret-api-key-12345'
        },
        body: JSON.stringify({ frame, campaignId })
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('[proxy] Request failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };