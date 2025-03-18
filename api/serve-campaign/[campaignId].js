// Test minimal serverless function
export default async (req, res) => {
  console.log('Test: Function executed for campaignId:', req.query.campaignId || (req.params && req.params.campaignId), 'at:', new Date().toISOString());
  res.send('<h1 style="font-family: Arial; text-align: center; margin-top: 50px;">Test Response for Campaign ID</h1><p style="text-align: center;">This is a test response for 
campaignId: ' + (req.query.campaignId || (req.params && req.params.campaignId)) + '</p>');
};
