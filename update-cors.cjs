const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const projectRef = 'pczzwgluhgrjuxjadyaq';
const accessToken = 'sbp_04b6a660843593f204f9f8e5399c4588b2e7a55e'; // Replace with your Personal Access Token

const url = `https://api.supabase.com/v1/projects/${projectRef}/config`;

const newCorsSettings = {
  http: {
    cors_allowed_origins: 'http://localhost:5173,https://*.vercel.app,https://*.wixsite.com,https://*.filesusr.com'
  }
};

async function updateCorsSettings() {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newCorsSettings)
    });

    if (!response.ok) {
      throw new Error(`Failed to update CORS settings: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('CORS settings updated successfully:', data);
  } catch (error) {
    console.error('Error updating CORS settings:', error.message);
  }
}

updateCorsSettings();