export default async (req, res) => {
    // Set CORS headers to allow requests from the specific Wix origin
    res.setHeader('Access-Control-Allow-Origin', 'https://genecat-wixsite-com.filesusr.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
  
    // Log the incoming request method and headers for debugging
    console.log('[proxy] Request Method:', req.method);
    console.log('[proxy] Request Headers:', req.headers);
  
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      console.log('[proxy] Handling OPTIONS request');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ message: 'Preflight successful' });
      return;
    }
  
    // Handle POST requests
    if (req.method !== 'POST') {
      console.log('[proxy] Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { type, frame, campaignId } = req.body;
  
    console.log('[proxy] Request Body:', { type, frame, campaignId });
  
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
      console.log('[proxy] Forwarding request to:', endpoint);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-secret-api-key-12345'
        },
        body: JSON.stringify({ frame, campaignId })
      });
      const data = await response.json();
      console.log('[proxy] Response from tracking endpoint:', data);
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('[proxy] Request failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };