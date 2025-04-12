# To-Do List: Building My Ad Agency SaaS App

This to-do list outlines the steps to develop the "My Ad Agency" SaaS app as per the Product Requirements Document (PRD). The tasks are organized by the 14-week timeline, with each week focusing on specific features, enhancements, or testing. Each task includes a description, estimated time, and dependencies.

## Week 1-2: Impression Tracking and Daily Limit Enforcement

### Task 1.1: Add Impression Tracking to `/api/serve-ad/listingId`
- **Description**: Modify the `/api/serve-ad/listingId` endpoint in `api-server.js` to increment the `impressions` counter in the `campaigns` table each time an ad is served.
- **Steps**:
  1. Open `api-server.js` in VS Code.
  2. Locate the `/api/serve-ad/listingId` endpoint.
  3. After fetching the active campaign, add a Supabase query to increment the `impressions` column: `UPDATE campaigns SET impressions = impressions + 1 WHERE id = <campaign_id>`.
  4. Test the endpoint by loading an ad (e.g., `http://localhost:3000/api/serve-ad/listingId?listingId=5018fd5a-6316-422e-98c4-2dc4a7b23a7a&frame=frame1`) and verify the `impressions` count increases in the `campaigns` table.
- **Estimated Time**: 4 hours
- **Dependencies**: None

### Task 1.2: Enforce Daily Limits in `/api/serve-ad/listingId`
- **Description**: Add logic to `/api/serve-ad/listingId` to stop computing earnings (dollar values) once the daily limit is reached until midnight.
- **Steps**:
  1. In `api-server.js`, within the `/api/serve-ad/listingId` endpoint, fetch the `dailyLimit` from the campaign’s `campaign_details`.
  2. Query the `clicks` table to count clicks for the campaign on the current day: `SELECT COUNT(*) FROM clicks WHERE campaign_id = <campaign_id> AND created_at >= <start_of_day>`.
  3. If the click count exceeds `dailyLimit`, stop calculating earnings (e.g., don’t include the click in dollar terms for the dashboard).
  4. Test by simulating clicks on an ad until the daily limit is reached, then verify earnings stop accumulating until the next day.
- **Estimated Time**: 6 hours
- **Dependencies**: Task 1.1 (for impression tracking)

### Task 1.3: Calculate Impressions in Dollar Terms for CPM Campaigns
- **Description**: Update the dashboard logic to calculate impressions in dollar terms for CPM campaigns.
- **Steps**:
  1. In `AdvertiserDashboard.jsx` and `NewPublisherDashboard.tsx`, fetch the `pricing_model` and `cpm` from the `frames` table for each campaign.
  2. For CPM campaigns, calculate earnings as `(impressions / 1000) * cpm` (e.g., 1,000 impressions at CPM `$5` = `$5`).
  3. Display the calculated dollar values on the dashboards.
  4. Test by serving an ad for a CPM campaign and verifying the dashboard shows correct earnings.
- **Estimated Time**: 4 hours
- **Dependencies**: Task 1.1

## Week 3-4: Custom Conditions for Publishers and Search Endpoint

### Task 2.1: Add `conditions` Column to `listings` Table
- **Description**: Update the Supabase database schema to add a `conditions` column to the `listings` table for storing custom conditions as JSONB.
- **Steps**:
  1. Log in to your Supabase dashboard.
  2. Go to the "SQL Editor" section.
  3. Run the following SQL command: `ALTER TABLE listings ADD COLUMN conditions JSONB;`.
  4. Verify the column is added by checking the `listings` table schema.
- **Estimated Time**: 1 hour
- **Dependencies**: None

### Task 2.2: Update `CreateListingFinal.jsx` to Include Custom Conditions
- **Description**: Modify the listing creation form to allow publishers to input custom conditions (keywords, minimum PPC/CPM, relevance, preferred products, other customizations).
- **Steps**:
  1. Open `src/pages/CreateListingFinal.jsx` in VS Code.
  2. Add form fields for:
     - Keywords (text input, comma-separated).
     - Minimum CPC and CPM (number inputs).
     - Relevance (dropdown: e.g., "young adults", "luxury shoppers").
     - Preferred Products/Services (text input, comma-separated).
     - Other Customizations (e.g., checkbox for "No alcohol ads").
  3. On form submission, structure the data as a JSON object (e.g., `{"keywords": ["fashion", "lifestyle"], "min_cpc": 0.20, "min_cpm": 5, "relevance": "young adults", "preferred_products": ["clothing", "accessories"], "customizations": {"no_alcohol_ads": true}}`).
  4. Update the Supabase insert query to include the `conditions` field.
  5. Test by creating a new listing and verifying the `conditions` are saved in the `listings` table.
- **Estimated Time**: 8 hours
- **Dependencies**: Task 2.1

### Task 2.3: Implement `/api/search-publishers` Endpoint
- **Description**: Create a new API endpoint to allow agencies to search for publishers based on custom conditions.
- **Steps**:
  1. Open `api-server.js` in VS Code.
  2. Add a new endpoint `/api/search-publishers` with query parameters: `keywords`, `min_cpc`, `min_cpm`, `relevance`, `products`.
  3. Query the `listings` table, filtering by the `conditions` column using JSONB operators (e.g., `WHERE conditions->'keywords' ?| array[<keywords>]`).
  4. Join with the `frames` table to include available frames.
  5. Return a list of matching publishers and their frames.
  6. Test by calling the endpoint (e.g., `http://localhost:3000/api/search-publishers?keywords=fashion,lifestyle&min_cpc=0.20`) and verifying the response.
- **Estimated Time**: 6 hours
- **Dependencies**: Task 2.1

### Task 2.4: Update `CreateCampaign.jsx` to Use `/api/search-publishers`
- **Description**: Modify the campaign creation form to allow agencies to search for publishers using the new endpoint.
- **Steps**:
  1. Open `src/pages/CreateCampaign.jsx` in VS Code.
  2. Add a search form with fields for keywords, minimum CPC/CPM, relevance, and products.
  3. On search, call the `/api/search-publishers` endpoint with the form data.
  4. Display the results in a list, allowing the agency to select a publisher and frame.
  5. Test by searching for a publisher and creating a campaign with the selected frame.
- **Estimated Time**: 6 hours
- **Dependencies**: Task 2.3

## Week 5-6: Modern UI Style Template Integration

### Task 3.1: Select and Install a Modern UI Framework
- **Description**: Choose a modern UI framework (e.g., Tailwind CSS) and install it in the project.
- **Steps**:
  1. Open the terminal in VS Code.
  2. Run the following command to install Tailwind CSS:
     ```bash
     npm install -D tailwindcss postcss autoprefixer
     npx tailwindcss init -p
     ```
  3. Configure Tailwind by updating `tailwind.config.js` to include your project files:
     ```javascript
     module.exports = {
       content: ["./src/**/*.{js,jsx,ts,tsx}"],
       theme: { extend: {} },
       plugins: [],
     }
     ```
  4. Add Tailwind directives to your CSS file (e.g., `src/index.css`):
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```
- **Estimated Time**: 2 hours
- **Dependencies**: None

### Task 3.2: Restyle All Frontend Pages with Modern UI
- **Description**: Apply the modern UI style to all user-facing pages (`AuthForm.jsx`, `CreateCampaign.jsx`, `AdvertiserDashboard.jsx`, `CreateListingFinal.jsx`, `ModifyListing.jsx`, `NewPublisherDashboard.tsx`, `Messages.jsx`).
- **Steps**:
  1. For each file, replace existing styles with Tailwind CSS classes (e.g., `className="w-full border p-2 rounded bg-gray-100 text-black placeholder-gray-500"` becomes `className="w-full border p-2 rounded bg-gray-100 text-black placeholder-gray-500"` with Tailwind equivalents like `className="w-full border p-2 rounded bg-gray-100 text-black placeholder-gray-500"`).
  2. Ensure a consistent design (e.g., minimalistic layout, smooth animations, responsive design).
  3. Test each page on both mobile and desktop to ensure responsiveness.
- **Estimated Time**: 16 hours (2 hours per page, 8 pages)
- **Dependencies**: Task 3.1

## Week 7-8: Error Handling, Logging, and Testing

### Task 4.1: Add Error Handling and Logging in Frontend
- **Description**: Add error handling and logging for form submissions in `ModifyListing.jsx` and other frontend files.
- **Steps**:
  1. Open `src/pages/ModifyListing.jsx` in VS Code.
  2. Wrap form submission logic in a try-catch block, logging errors with `console.error` and displaying a toast notification (e.g., using `react-toastify`).
  3. Install `react-toastify` if not already present:
     ```bash
     npm install react-toastify
     ```
  4. Add toast notifications for success and error messages (e.g., "Listing updated successfully" or "Failed to update listing").
  5. Repeat for other form submissions (e.g., `CreateCampaign.jsx`, `CreateListingFinal.jsx`).
  6. Test by submitting forms with invalid data and verifying errors are logged and displayed.
- **Estimated Time**: 6 hours
- **Dependencies**: None

### Task 4.2: Add Logging for `/api/track-click` in Backend
- **Description**: Add logging for click-tracking events in `api-server.js`.
- **Steps**:
  1. Open `api-server.js` in VS Code.
  2. In the `/api/track-click` endpoint, add `console.log` statements for incoming requests and responses (e.g., `console.log("Tracking click for campaign:", campaignId)`).
  3. Test by clicking an ad and verifying logs appear in the terminal.
- **Estimated Time**: 2 hours
- **Dependencies**: None

### Task 4.3: Create Test Files for Each Feature
- **Description**: Set up Jest and create unit tests for key features (campaign creation, ad serving, etc.).
- **Steps**:
  1. Install Jest and React Testing Library:
     ```bash
     npm install --save-dev jest @testing-library/react @testing-library/jest-dom
     ```
  2. Configure Jest by updating `package.json` with a test script:
     ```json
     "scripts": {
       "test": "jest"
     }
     ```
  3. Create test files (e.g., `CreateCampaign.test.jsx`, `api-server.test.js`).
  4. Write tests for:
     - Campaign creation (`CreateCampaign.jsx`): Test form submission.
     - Ad serving (`api-server.js`): Test `/api/serve-ad/listingId` endpoint.
     - Click tracking (`api-server.js`): Test `/api/track-click` endpoint.
  5. Run tests with `npm test` and ensure they pass.
- **Estimated Time**: 12 hours
- **Dependencies**: None

## Week 9-10: Database Optimization and Caching

### Task 5.1: Add Indexes to Database Tables
- **Description**: Add indexes to frequently queried columns in `campaigns` and `frames` tables for better performance.
- **Steps**:
  1. Log in to your Supabase dashboard.
  2. Go to the "SQL Editor" section.
  3. Run the following SQL commands:
     ```sql
     CREATE INDEX idx_campaigns_selected_publishers ON campaigns USING GIN (selected_publishers);
     CREATE INDEX idx_campaigns_is_active ON campaigns (is_active);
     CREATE INDEX idx_campaigns_status ON campaigns (status);
     CREATE INDEX idx_frames_listing_id ON frames (listing_id);
     CREATE INDEX idx_frames_frame_id ON frames (frame_id);
     ```
  4. Verify the indexes are created by checking the table schema.
- **Estimated Time**: 2 hours
- **Dependencies**: None

### Task 5.2: Implement Redis Caching for `/api/serve-ad/listingId`
- **Description**: Add Redis caching to cache active campaigns and reduce database load.
- **Steps**:
  1. Install Redis on your system (or use a cloud service like AWS ElastiCache).
  2. Install the Redis client for Node.js:
     ```bash
     npm install redis
     ```
  3. In `api-server.js`, initialize a Redis client and connect to Redis.
  4. In the `/api/serve-ad/listingId` endpoint, check Redis for a cached response using a key like `ad:<listingId>:<frame>`.
  5. If not found, query the database, cache the result in Redis with a TTL (e.g., 1 hour), and return the response.
  6. Test by loading an ad multiple times and verifying the database is queried only once.
- **Estimated Time**: 8 hours
- **Dependencies**: None

## Week 11-12: Database Schema Adjustments and RLS

### Task 6.1: Create `campaign_frames` Table
- **Description**: Create a new table to link campaigns and frames directly.
- **Steps**:
  1. Log in to your Supabase dashboard.
  2. Go to the "SQL Editor" section.
  3. Run the following SQL command:
     ```sql
     CREATE TABLE campaign_frames (
       campaign_id UUID REFERENCES campaigns(id),
       frame_id TEXT REFERENCES frames(frame_id),
       listing_id UUID REFERENCES frames(listing_id),
       PRIMARY KEY (campaign_id, frame_id, listing_id)
     );
     ```
  4. Migrate existing data from `selected_publishers` JSON to the new table.
  5. Verify the table is created and populated.
- **Estimated Time**: 4 hours
- **Dependencies**: None

### Task 6.2: Update `api-server.js` to Use `campaign_frames`
- **Description**: Modify the `/api/serve-ad/listingId` endpoint to query the `campaign_frames` table instead of parsing `selected_publishers` JSON.
- **Steps**:
  1. Open `api-server.js` in VS Code.
  2. Update the `/api/serve-ad/listingId` endpoint to join the `campaign_frames` table with `campaigns` and `frames` to fetch active campaigns.
  3. Test by loading an ad and verifying the correct campaign is served.
- **Estimated Time**: 4 hours
- **Dependencies**: Task 6.1

### Task 6.3: Re-enable RLS with Proper Policies
- **Description**: Re-enable RLS on the `frames` table with policies for authenticated users.
- **Steps**:
  1. Log in to your Supabase dashboard.
  2. Go to the "SQL Editor" section.
  3. Re-enable RLS: `ALTER TABLE frames ENABLE ROW LEVEL SECURITY;`.
  4. Add policies:
     ```sql
     CREATE POLICY "Publishers can modify their frames" ON frames
     FOR ALL TO authenticated
     USING (listing_id IN (SELECT id FROM listings WHERE publisher_id = auth.uid()));
     ```
  5. Test by logging in as a publisher and attempting to modify frames (should succeed for their own frames, fail for others).
- **Estimated Time**: 4 hours
- **Dependencies**: None

## Week 13: Testing with Large Datasets

### Task 7.1: Test Ad Serving and Click Tracking with Large Datasets
- **Description**: Simulate a large number of campaigns, frames, and ad interactions to ensure performance.
- **Steps**:
  1. Create a script to populate the database with 1,000 campaigns and 5,000 frames.
  2. Simulate 10,000 ad loads and 1,000 clicks using a tool like Postman or a custom script.
  3. Monitor performance (e.g., response time, database load) and fix any bottlenecks.
- **Estimated Time**: 8 hours
- **Dependencies**: Task 5.1, Task 5.2

### Task 7.2: Test Publisher Search with Large Datasets
- **Description**: Test the `/api/search-publishers` endpoint with a large number of listings.
- **Steps**:
  1. Ensure the database has 1,000 listings with varied conditions.
  2. Perform searches with different parameters and verify the results are accurate and fast.
  3. Optimize queries if necessary (e.g., add more indexes).
- **Estimated Time**: 4 hours
- **Dependencies**: Task 2.3

## Week 14: Beta Launch and Feedback

### Task 8.1: Deploy to a Staging Environment
- **Description**: Deploy the app to a staging environment for beta testing.
- **Steps**:
  1. Set up a staging environment (e.g., on Heroku, Vercel, or AWS).
  2. Deploy the frontend (`npm run build` and deploy to Vercel) and backend (`api-server.js` to Heroku).
  3. Update API URLs to point to the staging environment.
  4. Test all features in the staging environment.
- **Estimated Time**: 6 hours
- **Dependencies**: All previous tasks

### Task 8.2: Launch Beta and Gather Feedback
- **Description**: Launch the beta version to initial users and gather feedback.
- **Steps**:
  1. Invite 10-20 initial users (agencies and publishers) to test the app.
  2. Provide a feedback form focusing on usability, UI, and performance.
  3. Collect feedback and prioritize fixes or improvements.
- **Estimated Time**: 6 hours
- **Dependencies**: Task 8.1