export default async (req, res) => {
    // Comprehensive CORS handling
    const allowedOrigins = [
      'https://genecat-wixsite-com.filesusr.com',
      'https://genecat.wixsite.com',
      'https://www.genecat.wixsite.com'
    ];
    const origin = req.headers.origin;
  
    // Dynamic origin checking
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  
    // Extensive CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, Origin, X-Requested-With, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  
    // Debugging headers
    console.log('[proxy] Incoming Origin:', origin);
    console.log('[proxy] Request Method:', req.method);
    console.log('[proxy] Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[proxy] Request Body:', JSON.stringify(req.body, null, 2));
  
    // Handle OPTIONS preflight request with verbose logging
    if (req.method === 'OPTIONS') {
      console.log('[proxy] Handling OPTIONS preflight');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ 
        message: 'Preflight successful', 
        allowedOrigins: allowedOrigins 
      });
    }
  
    // Validate POST request
    if (req.method !== 'POST') {
      console.error('[proxy] Unsupported method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    // Validate request body
    const { type, frame, campaignId } = req.body || {};
    if (!type || !frame || !campaignId) {
      console.error('[proxy] Invalid request body', { type, frame, campaignId });
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: { type, frame, campaignId } 
      });
    }
  
    // Endpoint selection
    let endpoint;
    switch(type) {
      case 'impression':
        endpoint = 'https://my-ad-agency-mb6lrsvoo-genecats-projects.vercel.app/api/track-impression';
        break;
      case 'click':
        endpoint = 'https://my-ad-agency-mb6lrsvoo-genecats-projects.vercel.app/api/track-click';
        break;
      default:
        console.error('[proxy] Invalid tracking type:', type);
        return res.status(400).json({ error: 'Invalid tracking type' });
    }
  
    try {
      console.log('[proxy] Forwarding request to:', endpoint);
      
      const fetchResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-secret-api-key-12345'
        },
        body: JSON.stringify({ frame, campaignId })
      });
  
      // Log full response details
      console.log('[proxy] Response Status:', fetchResponse.status);
      const responseBody = await fetchResponse.text();
      console.log('[proxy] Response Body:', responseBody);
  
      // Parse response body
      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch (parseError) {
        console.error('[proxy] Failed to parse response body:', parseError);
        parsedBody = { raw: responseBody };
      }
  
      return res.status(fetchResponse.status).json(parsedBody);
  
    } catch (error) {
      console.error('[proxy] Request failed:', {
        message: error.message,
        stack: error.stack
      });
  
      return res.status(500).json({ 
        error: 'Proxy request failed', 
        details: error.message 
      });
    }
  };