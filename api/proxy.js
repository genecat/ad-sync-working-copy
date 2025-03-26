export default async (req, res) => {
    const { type, frame, campaignId } = req.body;
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    if (!type || !frame || !campaignId) {
      return res.status(400).json({ error: 'Missing type, frame, or campaignId' });
    }
  
    let endpoint;
    if (type === 'impression') {
      endpoint = 'https://my-ad-agency-mb6lrsvoo-genecats-projects.vercel.app/api/track-impression';
    } else if (type === 'click') {
      endpoint = 'https://my-ad-agency-mb6lrsvoo-genecats-projects.vercel.app/api/track-click';
    } else {
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
      console.error('[Proxy] Request failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };