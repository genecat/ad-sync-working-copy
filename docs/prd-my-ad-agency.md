# Product Requirements Document (PRD): My Ad Agency SaaS App

## 1. Overview

### 1.1 Product Name
My Ad Agency

### 1.2 Product Description
My Ad Agency is a SaaS platform designed to facilitate digital advertising by connecting ad/marketing agencies (representing advertisers) with publishers. The platform allows agencies to create and manage ad campaigns, selecting publishers and ad frames to display ads, while publishers list their websites, define ad frames with custom conditions, and manage campaigns. The app tracks ad activity (clicks and impressions) in dollar terms but leaves billing and payment responsibilities to the agencies, who have existing relationships with publishers and the necessary infrastructure for financial transactions. The app will feature a modern frontend UI style template for an enhanced user experience.

### 1.3 Purpose of the PRD
This PRD outlines the requirements, features, and technical specifications for the My Ad Agency SaaS app. It serves as a blueprint for development, ensuring the product meets the needs of ad/marketing agencies and publishers while addressing technical challenges (e.g., RLS errors, API key issues), planning for scalability, and delivering a modern user interface.

## 2. Goals and Objectives

### 2.1 Business Goals
- Enable ad/marketing agencies to create and manage ad campaigns for their clients, targeting specific publishers and ad frames based on custom conditions.
- Allow publishers to monetize their websites by offering ad spaces (frames) with flexible pricing models (CPC and CPM) and custom conditions (e.g., keywords, minimum rates, relevance).
- Provide a scalable platform that supports large numbers of users, campaigns, and ad interactions (clicks and impressions).
- Track ad activity (clicks and impressions) in dollar terms for agencies to use in their billing processes, without handling payments directly.
- Deliver a modern, user-friendly interface to enhance the experience for both agencies and publishers.

### 2.2 User Goals
- **Ad/Marketing Agencies (representing Advertisers)**:
  - Easily create campaigns with budget, target URL, and end date, extending or terminating campaigns as needed.
  - Select publishers and ad frames that match their campaign goals, based on publisher-defined conditions.
  - View campaign performance (clicks, impressions) in dollar terms on a dashboard.
  - Use messaging to communicate with publishers for campaign approvals.
- **Publishers**:
  - List websites and define ad frames with sizes, pricing (CPC or CPM), and custom conditions (e.g., keywords, minimum rates, relevance to audience interests, preferred products/services).
  - Place multiple ad frames on their webpages, with frames becoming available for new campaigns after termination.
  - Approve campaigns to run on their sites.
  - Generate embed codes to display ads on their websites.
  - View campaign stats (clicks, impressions) in dollar terms on a dashboard.
- **End Users**: Visitors to publisher websites who see and interact with ads (not direct users of the platform).

### 2.3 Technical Goals
- Resolve Row-Level Security (RLS) issues in Supabase by using service keys for backend operations and defining proper RLS policies for frontend operations.
- Ensure correct API routing for ad serving and click tracking (e.g., fixing incorrect URLs like `https://3ed1-72-253-113-239.ngrok-free.app/api/track-click` to `http://localhost:3000/api/track-click`).
- Implement robust error handling and logging in both frontend and backend.
- Track impressions and enforce daily limits for campaigns, with frames becoming available for new campaigns after termination.
- Optimize database queries and add caching to support scalability for large numbers of users and ad interactions.
- Integrate a modern frontend UI style template for a visually appealing and intuitive user experience.

## 3. Stakeholders

- **Product Owner**: [Your Name] – Oversees the vision and direction of My Ad Agency.
- **Developers**: Responsible for implementing the features, fixes, scalability improvements, and UI enhancements outlined in this PRD.
- **Ad/Marketing Agencies**: Represent advertisers, create and manage campaigns, and handle billing with publishers.
- **Publishers**: List websites, manage ad frames with custom conditions, and approve campaigns.
- **End Users**: Visitors to publisher websites who see and interact with ads.

## 4. User Personas

### 4.1 Ad/Marketing Agency: Sarah, Account Manager
- **Age**: 35
- **Goals**: Manage ad campaigns for her clients, ensure campaigns run on relevant publisher sites, track performance in dollar terms for billing, extend campaigns as needed.
- **Pain Points**: Needs a reliable platform to track clicks and impressions, requires easy communication with publishers for approvals, doesn’t want to handle payment logistics within the app, wants an intuitive UI.
- **Usage**: Creates campaigns, uploads ad creatives in standard image formats, selects publishers based on custom conditions, monitors clicks and impressions, messages publishers for approvals, extends or terminates campaigns.

### 4.2 Publisher: Mike, Lifestyle Blogger
- **Age**: 28
- **Goals**: Monetize his blog, control ad placements with custom conditions (e.g., keywords, relevance), place multiple ad frames, ensure frames are reused after campaign termination, get paid by agencies for ad activity.
- **Pain Points**: Wants flexible pricing (CPC/CPM) with minimum rates, needs simple embed codes, requires campaign approval control, expects agencies to handle payments, prefers a modern UI.
- **Usage**: Lists his blog, defines ad frames with custom conditions, places multiple frames on his site, approves campaigns, generates embed codes, tracks earnings in dollar terms, communicates with agencies via messaging.

## 5. Features and Requirements

### 5.1 User Authentication
- **Requirement**: Users must sign up and log in to access the platform.
- **Details**:
  - Email: `genecat@gmail.com` (example user).
  - Password: Stored securely via Supabase Auth.
  - Roles: `advertiser` (for agency users) or `publisher` (stored in a `users` table or similar).
- **Implementation**:
  - Use Supabase Auth for user management.
  - Frontend: `AuthForm.jsx` handles sign-in (`email`, `password`).
  - Backend: `App.jsx` fetches user role after login (`App.jsx:87 Fetched user role: publisher`).

### 5.2 Ad/Marketing Agency Features

#### 5.2.1 Create Campaign
- **Requirement**: Agency users can create a new campaign for their clients.
- **Details**:
  - Fields: Title, Budget, Daily Limit, End Date, Target URL, Ad Creative Upload (standard image formats: JPEG, PNG, GIF).
  - Example: "Honda" campaign (`id: 4c06dfa9-a038-4e09-b9b0-abe51133ca6a`):
    - Title: `Honda`
    - Budget: `100`
    - Daily Limit: `10`
    - End Date: `2025-05-01`
    - Target URL: `http://mashdrop.com`
    - Ad Creative: Uploaded image (e.g., `1743731839373_Honda.jpeg`).
- **Implementation**:
  - Frontend: `CreateCampaign.jsx` provides a form for campaign creation, with file upload validation for JPEG, PNG, and GIF formats.
  - Backend: Store in `campaigns` table with columns `id`, `advertiser_id`, `name`, `budget`, `created_at`, `campaign_details` (JSON), `selected_publishers` (JSON), `clicks`, `impressions`, `is_active`, `is_archived`, `status`.

#### 5.2.2 Select Publishers and Frames
- **Requirement**: Agency users can search for and select publishers and ad frames based on custom conditions.
- **Details**:
  - Search: Filter publishers by keyword search terms, minimum PPC/CPM rates, relevance levels, preferred products/services, and other customizations.
  - Frames: Choose frames defined by the publisher (e.g., `frame1` with size `300x250`).
  - Example: "Honda" campaign selected "SilkCrazy" with `frame1` after searching for "Lifestyle" blogs with a minimum CPC of `.20`.
- **Implementation**:
  - Frontend: `CreateCampaign.jsx` includes a search interface with filters for publisher conditions.
  - Backend: Query `listings` and `frames` tables, filter by custom conditions stored in a new `conditions` column (JSON) in `listings`.

#### 5.2.3 Campaign Management
- **Requirement**: Agency users can extend or terminate campaigns.
- **Details**:
  - Extend: Add more time to the campaign by updating the `endDate` in `campaign_details`.
  - Terminate: Set `is_active` to `false` and `status` to `archived` at will.
  - Example: Agency extends "Honda" campaign end date from `2025-05-01` to `2025-06-01`.
- **Implementation**:
  - Frontend: `AdvertiserDashboard.jsx` provides buttons to extend or terminate campaigns.
  - Backend: Update `campaigns` table (`campaign_details`, `is_active`, `status`).

#### 5.2.4 Advertiser Dashboard
- **Requirement**: Agency users can view and manage their campaigns.
- **Details**:
  - Display: List of campaigns (pending, live, archived).
  - Stats: Clicks, impressions in dollar terms (e.g., "Honda" campaign: `clicks: 1`, `impressions: 0`, calculated as `$0.24` for 1 click at CPC `.24`).
  - Agencies use these stats for billing their clients and paying publishers, but the app does not handle payments.
- **Implementation**:
  - Frontend: `AdvertiserDashboard.jsx` renders campaign lists and stats with a modern UI style template (e.g., clean design, intuitive navigation, responsive layout).
  - Backend: Fetch from `campaigns` table, filter by `advertiser_id`, calculate dollar values based on CPC/CPM rates.

#### 5.2.5 Messaging
- **Requirement**: Agency users can message publishers to notify them of new campaigns.
- **Details**:
  - Agencies can instantly notify publishers when a campaign is created, prompting approval.
  - Example: Agency user messages the publisher of "SilkCrazy" to approve the "Honda" campaign.
- **Implementation**:
  - Frontend: `Messages.jsx` provides a messaging interface with a modern UI style.
  - Backend: Store messages in a `messages` table (assumed schema: `id`, `sender_id`, `receiver_id`, `content`, `created_at`).

### 5.3 Publisher Features

#### 5.3.1 Create Listing with Custom Conditions
- **Requirement**: Publishers can create a listing for their website with custom conditions.
- **Details**:
  - Fields: Website URL, Category, Ad Frames, Custom Conditions.
  - Custom Conditions:
    - Keyword Search Terms: Tags for campaigns to match (e.g., "fashion", "lifestyle").
    - Minimum PPC/CPM Rates: Set thresholds (e.g., minimum CPC `.20`, CPM `$5`).
    - Relevance Levels: Define audience interests (e.g., "young adults", "luxury shoppers").
    - Preferred Products/Services: Specify types of ads (e.g., "clothing", "automotive").
    - Other Customizations: Additional preferences (e.g., "no alcohol ads").
  - Example: "SilkCrazy" listing (`id: 5018fd5a-6316-422e-98c4-2dc4a7b23a7a`):
    - URL: `https://genecat.wixsite.com/silkcrazy`
    - Category: `Lifestyle`
    - Conditions: Keywords (`fashion`, `lifestyle`), Minimum CPC `.20`, Relevance (`young adults`), Preferred Products (`clothing`, `accessories`).
- **Implementation**:
  - Frontend: `CreateListingFinal.jsx` provides a form with fields for custom conditions.
  - Backend: Add a `conditions` column (JSON) to `listings` table to store custom conditions (e.g., `{"keywords": ["fashion", "lifestyle"], "min_cpc": 0.20, "min_cpm": 5, "relevance": "young adults", "preferred_products": ["clothing", "accessories"]}`).

#### 5.3.2 Define Ad Frames
- **Requirement**: Publishers can define ad frames with sizes, pricing, and place multiple frames on their webpages.
- **Details**:
  - Frames: Select from 5 predefined sizes (`300x250`, `728x90`, `640x480`, `300x90`, `480x640`).
  - Pricing: CPC or CPM (e.g., `frame1` with CPC `.24`).
  - Multiple Frames: Publishers can place multiple frames on their webpages (e.g., `frame1` and `frame1743884369328` on the same page).
  - Example: "SilkCrazy" frames in `frames` table:
    - `frame_id: frame1`, `price_per_click: 0.24`, `pricing_model: CPC`, `size: 300x250`.
- **Implementation**:
  - Frontend: `AddFrame.jsx` and `ModifyListing.jsx` allow selecting frame sizes and adding multiple frames.
  - Backend: Store in `frames` table with columns `frame_id`, `listing_id`, `price_per_click`, `cpm`, `pricing_model`, `size`.

#### 5.3.3 Campaign Approval Workflow
- **Requirement**: Publishers can approve campaigns to run on their websites.
- **Details**:
  - Campaigns start as `pending` in the `campaigns` table.
  - Publishers approve campaigns via the dashboard, changing the `status` to `approved`.
  - Once approved, the campaign appears on the publisher’s website (via embed code).
  - Agencies see impressions/clicks only after approval, confirming the campaign is live.
  - Agencies can message publishers to prompt approval (via `Messages.jsx`).
- **Implementation**:
  - Frontend: `NewPublisherDashboard.tsx` displays pending campaigns and provides an "Approve" button with a modern UI style.
  - Backend: Update `status` in `campaigns` table to `approved` upon publisher action.

#### 5.3.4 Campaign Termination and Frame Availability
- **Requirement**: Frames become available for new campaigns after termination, and publishers can terminate campaigns.
- **Details**:
  - Termination: Campaigns terminate due to end date (`endDate`) or ad spend exhaustion (budget reached).
  - Frame Availability: After termination, frames are available in the advertiser’s search for new campaigns.
  - Publisher Termination: Publishers can terminate campaigns at will, setting `is_active` to `false` and `status` to `archived`.
  - Example: "Honda" campaign terminates on `2025-05-01`, making `frame1` available for new campaigns.
- **Implementation**:
  - Backend: Add a `status` check in `/api/serve-ad/listingId` to exclude terminated campaigns.
  - Frontend: `NewPublisherDashboard.tsx` provides a "Terminate" button for campaigns.
  - Backend: Update `campaigns` table (`is_active`, `status`) upon termination.

#### 5.3.5 Generate Embed Code
- **Requirement**: Publishers can generate embed codes to display multiple ad frames on their websites.
- **Details**:
  - Embed Code: `<iframe>` to load ad via `/api/serve-ad/listingId` for each frame.
  - Multiple Frames: Generate embed codes for all selected frames (e.g., `frame1` and `frame1743884369328`).
  - Example: Generated in `ModifyListing.jsx` for `frame1`:
    ```
    <iframe src="http://localhost:3000/api/serve-ad/listingId?listingId=5018fd5a-6316-422e-98c4-2dc4a7b23a7a&frame=frame1" width="300" height="250" style="border:none;" frameborder="0"></iframe>
    ```
- **Implementation**:
  - Frontend: `ModifyListing.jsx` generates embed codes for all frames with a modern UI style.
  - Backend: `/api/serve-ad/listingId` endpoint serves the ad.

#### 5.3.6 Publisher Dashboard
- **Requirement**: Publishers can view and manage campaigns on their listings.
- **Details**:
  - Display: Pending, live, and archived campaigns (e.g., 6 live campaigns, 2 archived).
  - Stats: Total campaigns, impressions, clicks in dollar terms (e.g., 8 campaigns, 85 impressions, 27 clicks, calculated as `$6.48` for 27 clicks at CPC `.24`).
  - Publishers provide these stats to agencies for payment, but the app does not handle payouts.
- **Implementation**:
  - Frontend: `NewPublisherDashboard.tsx` renders campaign lists and stats with a modern UI style template.
  - Backend: Fetch campaigns from `campaigns` table, filter by `selected_publishers`, calculate dollar values based on CPC/CPM rates.

### 5.4 Ad Serving and Tracking

#### 5.4.1 Ad Serving
- **Requirement**: Serve ads for active campaigns via an API endpoint.
- **Details**:
  - Endpoint: `/api/serve-ad/listingId?listingId=<listingId>&frame=<frame>`.
  - Logic: Fetch active campaigns (`is_active: true`, `status: 'approved'`) for the given listing and frame, ensuring the campaign hasn’t terminated.
  - Example: `http://localhost:3000/api/serve-ad/listingId?listingId=5018fd5a-6316-422e-98c4-2dc4a7b23a7a&frame=frame1` loads the "Honda" ad.
- **Implementation**:
  - Backend: `api-server.js` handles the `/api/serve-ad/listingId` endpoint, checks `endDate` and budget.

#### 5.4.2 Click Tracking
- **Requirement**: Track clicks on ads and redirect to the target URL.
- **Details**:
  - Endpoint: `/api/track-click`.
  - Logic: Insert a click into the `clicks` table, then redirect.
  - Example: Click on "Honda" ad inserts a row (`id: 33`, `campaign_id: 4c06dfa9-a038-4e09-b9b0-abe51133ca6a`, `frame_id: frame1`) and redirects to `http://mashdrop.com`.
  - Clicks are calculated in dollar terms (e.g., 1 click at CPC `.24` = `$0.24`).
- **Implementation**:
  - Backend: `api-server.js` handles the `/api/track-click` endpoint.
  - Database: `clicks` table with columns `id`, `frame_id`, `campaign_id`, `created_at`.

#### 5.4.3 Impression Tracking
- **Requirement**: Track impressions when an ad is loaded and enforce daily limits.
- **Details**:
  - Logic: Increment the `impressions` counter in the `campaigns` table when an ad is served.
  - Daily Limit: Continue tracking impressions and clicks, but stop computing earnings (dollar values) once the daily limit is reached until midnight (e.g., "Honda" campaign has `dailyLimit: 10`, so earnings stop after 10 clicks at `$2.40` until the next day).
  - Impressions are calculated in dollar terms for CPM campaigns (e.g., 1,000 impressions at CPM `$5` = `$5`).
- **Implementation**:
  - Backend: Add logic to `/api/serve-ad/listingId` to update `impressions` and check `dailyLimit` before calculating earnings.

### 5.5 Technical Enhancements

#### 5.5.1 Modern Frontend UI Style Template
- **Requirement**: Integrate a modern frontend UI style template for an enhanced user experience.
- **Details**:
  - Design: Clean, intuitive, responsive layout with modern design elements (e.g., minimalistic design, smooth animations, consistent typography).
  - Pages: Apply to all user-facing pages (`AuthForm.jsx`, `CreateCampaign.jsx`, `AdvertiserDashboard.jsx`, `CreateListingFinal.jsx`, `ModifyListing.jsx`, `NewPublisherDashboard.tsx`, `Messages.jsx`).
- **Implementation**:
  - Frontend: Use a modern UI framework like Tailwind CSS or a pre-built template (e.g., Material-UI, Ant Design) to restyle the app.
  - Ensure responsiveness for mobile and desktop users.

#### 5.5.2 RLS Issues
- **Requirement**: Resolve RLS errors for `clicks` and `frames` tables.
- **Details**:
  - `clicks` table: Fixed by using the Supabase service key in `api-server.js`.
  - `frames` table: Temporarily disabled RLS (`ALTER TABLE frames DISABLE ROW LEVEL SECURITY`).
- **Future Improvement**: Re-enable RLS with proper policies for authenticated users (e.g., publishers can only modify their own frames).

#### 5.5.3 API Key and URL Issues
- **Requirement**: Fix incorrect URLs in ad-serving logic.
- **Details**:
  - Fixed: Changed `fetch` URL in `/api/serve-ad/listingId` to `http://localhost:3000/api/track-click`.
  - Fixed: Updated `baseUrl` in `CreateListingFinal.jsx`, `AddFrame.jsx`, and `ModifyListing.jsx` to `http://localhost:3000/api/serve-ad/listingId`.
- **Future Improvement**: Use environment variables for URLs to avoid hardcoding.

#### 5.5.4 Error Handling and Logging
- **Requirement**: Add robust error handling and logging in frontend and backend.
- **Details**:
  - Frontend: Add error logging for form submissions (e.g., `ModifyListing.jsx` silent failures).
  - Backend: Add logging for `/api/track-click` requests in `api-server.js`.
  - Create test files for each feature (e.g., unit tests for campaign creation, ad serving).
- **Implementation**:
  - Frontend: Add `console.error` and user feedback (e.g., toast notifications) for errors.
  - Backend: Add `console.log` for request handling.
  - Tests: Use a testing framework like Jest to create test files (e.g., `CreateCampaign.test.jsx`, `api-server.test.js`).

#### 5.5.5 Scalability
- **Requirement**: Plan for scaling to support large numbers of users, campaigns, and ad interactions.
- **Details**:
  - Optimize database queries for performance (e.g., indexing `listing_id`, `frame_id`).
  - Add caching for frequently accessed data (e.g., active campaigns, publisher listings) using a caching layer like Redis.
  - Ensure the backend can handle high traffic (e.g., load balancing for `api-server.js`).
- **Implementation**:
  - Database: Add indexes on `campaigns` (`selected_publishers`, `is_active`, `status`), `frames` (`listing_id`, `frame_id`).
  - Caching: Implement Redis caching for `/api/serve-ad/listingId` responses.
  - Backend: Deploy `api-server.js` on a scalable server (e.g., AWS ECS).

### 5.6 Database Schema Adjustments

#### 5.6.1 Custom Conditions for Listings
- **Requirement**: Store custom conditions for publisher listings.
- **Details**:
  - Add a `conditions` column to the `listings` table to store custom conditions as JSON.
  - Example: `{"keywords": ["fashion", "lifestyle"], "min_cpc": 0.20, "min_cpm": 5, "relevance": "young adults", "preferred_products": ["clothing", "accessories"], "customizations": {"no_alcohol_ads": true}}`.
- **Implementation**:
  - Backend: Update `listings` table schema to include `conditions` (JSONB).

#### 5.6.2 Foreign Key Relationship
- **Requirement**: Link campaigns and frames directly for better scalability.
- **Details**:
  - Add a new table `campaign_frames` to link campaigns and frames:
    - `campaign_id`: UUID (references `campaigns.id`)
    - `frame_id`: String (references `frames.frame_id`)
    - `listing_id`: UUID (references `frames.listing_id`)
- **Implementation**:
  - Backend: Create `campaign_frames` table, update `api-server.js` to query this table instead of parsing JSON in `selected_publishers`.

## 6. Technical Specifications

### 6.1 Tech Stack
- **Frontend**: React (Vite, `npm run dev` on `http://localhost:5173`)
  - Key Files: `App.jsx`, `AuthForm.jsx`, `CreateListingFinal.jsx`, `ModifyListing.jsx`, `NewPublisherDashboard.tsx`, `AdvertiserDashboard.jsx`, `CreateCampaign.jsx`, `Messages.jsx`.
  - UI Framework: Tailwind CSS or a modern UI template (e.g., Material-UI, Ant Design) for a modern UI style.
- **Backend**: Node.js (`api-server.js` on `http://localhost:3000`)
- **Database**: Supabase (PostgreSQL)
  - Tables: `users`, `listings`, `frames`, `campaigns`, `clicks`, `messages`, `campaign_frames`.
- **Storage**: Supabase Storage for ad creatives (e.g., `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/`), supporting JPEG, PNG, GIF formats.
- **Caching**: Redis for caching active campaigns and listings.
- **Testing**: Jest for unit tests.

### 6.2 Database Schema
- **users**:
  - `id`: UUID (e.g., `352c08a8-05b6-4baf-b584-e5b1997919c3`)
  - `email`: String (e.g., `genecat@gmail.com`)
  - `role`: String (`advertiser` or `publisher`)
- **listings**:
  - `id`: UUID (e.g., `5018fd5a-6316-422e-98c4-2dc4a7b23a7a`)
  - `publisher_id`: UUID
  - `selected_frames`: JSON
  - `created_at`: Timestamp
  - `category`: String (e.g., `Lifestyle`)
  - `conditions`: JSONB (e.g., `{"keywords": ["fashion", "lifestyle"], "min_cpc": 0.20, "min_cpm": 5, "relevance": "young adults", "preferred_products": ["clothing", "accessories"]}`)
- **frames**:
  - `frame_id`: String (e.g., `frame1`)
  - `listing_id`: UUID
  - `price_per_click`: Float (e.g., `0.24`)
  - `cpm`: Float
  - `pricing_model`: String (`CPC` or `CPM`)
  - `size`: String (e.g., `300x250`)
- **campaigns**:
  - `id`: UUID (e.g., `4c06dfa9-a038-4e09-b9b0-abe51133ca6a`)
  - `advertiser_id`: UUID
  - `name`: String (e.g., `Honda`)
  - `budget`: Float
  - `created_at`: Timestamp
  - `campaign_details`: JSON (e.g., `{"title": "Honda", "budget": "100", "endDate": {"day": "1", "year": "2025", "month": "05"}, "targetURL": "http://mashdrop.com", "dailyLimit": "10"}`)
  - `selected_publishers`: JSON (e.g., includes listing ID and frame details)
  - `clicks`: Integer
  - `impressions`: Integer
  - `is_active`: Boolean
  - `is_archived`: Boolean
  - `status`: String (`pending`, `approved`, `archived`)
- **clicks**:
  - `id`: Integer (e.g., `33`)
  - `frame_id`: String (e.g., `frame1`)
  - `campaign_id`: UUID
  - `created_at`: Timestamp
- **messages** (assumed):
  - `id`: UUID
  - `sender_id`: UUID
  - `receiver_id`: UUID
  - `content`: String
  - `created_at`: Timestamp
- **campaign_frames** (new):
  - `campaign_id`: UUID (references `campaigns.id`)
  - `frame_id`: String (references `frames.frame_id`)
  - `listing_id`: UUID (references `frames.listing_id`)

### 6.3 API Endpoints
- **`/api/serve-ad/listingId?listingId=<listingId>&frame=<frame>`**:
  - Method: GET
  - Response: HTML with `<a>` tag containing ad image and click handler.
- **`/api/track-click`**:
  - Method: POST
  - Request: `{ listingId, frameId, campaignId }`
  - Response: Inserts click into `clicks` table, returns success.
- **`/api/search-publishers`** (new):
  - Method: GET
  - Query Params: `keywords`, `min_cpc`, `min_cpm`, `relevance`, `products`
  - Response: List of publishers and frames matching the conditions.

## 7. Success Metrics

- **User Adoption**: Number of ad/marketing agencies and publishers signing up (target: 100 users in the first 3 months).
- **Campaign Activity**: Number of active campaigns (target: 50 campaigns in the first 3 months).
- **Ad Interactions**: Total clicks and impressions (target: 10,000 clicks, 1,000,000 impressions in the first 3 months).
- **Reliability**: Uptime of ad-serving API (target: 99.9% uptime).
- **Error Rate**: Reduce RLS and API errors to 0% after fixes.
- **User Satisfaction**: Positive feedback on the modern UI style (target: 90% user satisfaction rate in beta testing).

## 8. Timeline and Milestones

- **Week 1-2**: Implement impression tracking and daily limit enforcement in `/api/serve-ad/listingId`.
- **Week 3-4**: Add custom conditions for publishers in `CreateListingFinal.jsx` and `listings` table, implement `/api/search-publishers` endpoint.
- **Week 5-6**: Integrate modern UI style template across all frontend pages.
- **Week 7-8**: Add error handling and logging in frontend (`ModifyListing.jsx`) and backend (`api-server.js`), create test files for each feature.
- **Week 9-10**: Optimize database queries, add indexes, implement Redis caching for ad serving.
- **Week 11-12**: Create `campaign_frames` table, update `api-server.js` to use it, re-enable RLS with proper policies.
- **Week 13**: Test ad serving, click tracking, and publisher search with large datasets, fix any remaining bugs.
- **Week 14**: Launch beta version to initial users, gather feedback.

## 9. Risks and Mitigations

- **Risk**: RLS re-enabling might cause new errors.
  - **Mitigation**: Test RLS policies in a staging environment first.
- **Risk**: Incorrect URLs in production (e.g., ngrok vs. localhost).
  - **Mitigation**: Use environment variables for API URLs.
- **Risk**: Database performance issues with large datasets.
  - **Mitigation**: Add indexes on frequently queried columns (e.g., `listing_id`, `frame_id`), implement caching with Redis.
- **Risk**: Silent failures in form submissions (e.g., `ModifyListing.jsx`).
  - **Mitigation**: Add error logging and user feedback for form submissions.
- **Risk**: High traffic overwhelming the backend.
  - **Mitigation**: Deploy `api-server.js` on a scalable server (e.g., AWS ECS), use load balancing.
- **Risk**: Users find the modern UI style template unintuitive.
  - **Mitigation**: Conduct user testing during beta phase, iterate based on feedback.

## 10. Future Enhancements

- Add support for CPM pricing model in ad serving and tracking.
- Implement a notification system for campaign approvals (e.g., email alerts).
- Add analytics dashboards with charts for clicks and impressions over time.
- Support multiple ad creatives per campaign with rotation logic.
- Integrate real-time messaging for faster agency-publisher communication.
- Add support for video ad formats in addition to images.