export default async (req, res) => {
    // Set CORS headers to allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    res.setHeader('Vary', 'Origin');
  
    // Log full request details for debugging
    console.log('[proxy] Full request details:', {
      method: req.method,
      headers: req.headers,
      body: req.body,
      origin: req.headers.origin
    });
  
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      console.log('[proxy] Handling OPTIONS request');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
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
  
      // Log full response details
      console.log('[proxy] Response status:', response.status);
      console.log('[proxy] Response headers:', Object.fromEntries(response.headers));
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[proxy] Non-OK response:', errorText);
        return res.status(response.status).json({ error: errorText });
      }
  
      const data = await response.json();
      console.log('[proxy] Response from tracking endpoint:', data);
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('[proxy] Request failed:', error.message, error.stack);
      return res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
      });
    }
  };