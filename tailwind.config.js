/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom Colors for Ad-Sync (Modern Theme)
      colors: {
        'modern-bg': '#F9FAFB', // Very light gray background (replacing light-bg)
        'modern-card': '#FFFFFF', // White for cards (replacing light-gray)
        'modern-primary': '#2C7A7B', // Green for publishers (replacing accent-blue)
        'modern-secondary': '#6B46C1', // Purple for advertisers (replacing accent-purple)
        'modern-text': '#0A0C1F', // Dark text for readability (replacing text-dark)
        'modern-muted': '#6B7280', // Muted text for secondary info (replacing text-muted)
      },
      // Custom Fonts (unchanged)
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        heading: ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      // Custom Spacing and Shadows for Cards (unchanged shadow for now)
      spacing: {
        '18': '4.5rem',
      },
      boxShadow: {
        'card': '0 10px 15px rgba(0, 0, 0, 0.2)', // Keeping the 3D shadow for now
      },
    },
  },
  plugins: [],
};
