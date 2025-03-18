export default async (req, res) => {
  console.log('Test API route executed at:', new Date().toISOString());
  res.send('<h1 style="font-family: Arial; text-align: center; margin-top: 50px;">Test API Route</h1><p style="text-align: center;">This is a test API route.</p>');
};
