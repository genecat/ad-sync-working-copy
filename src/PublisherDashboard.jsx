import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";

/* ----------------------------------------------------------------
   Supabase Client Initialization
---------------------------------------------------------------- */
const supabase = createClient(
  "https://pczzwgluhgrjuxjadyaq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
);

/* ----------------------------------------------------------------
   PublisherDashboard Component
---------------------------------------------------------------- */
function PublisherDashboard({ session }) {
  // State for listings
  const [listings, setListings] = useState([]);
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  // Error state
  const [error, setError] = useState("");

  /* ----------------------------------------------------------------
     Fetch all listings for the current publisher
  ---------------------------------------------------------------- */
  useEffect(() => {
    async function fetchListings() {
      // If user session is invalid, skip
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }
      console.log("PublisherDashboard: Session user id:", session.user.id);

      // Query the listings table
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("publisher_id", session.user.id);

      if (error) {
        console.error("Error fetching listings:", error);
        setError(error.message);
      } else {
        console.log("Fetched Listings:", data);
        setListings(data || []);
      }
      setIsLoading(false);
    }
    fetchListings();
  }, [session]);

  /* ----------------------------------------------------------------
     Loading UI
  ---------------------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="p-4 text-black">
        <p>Loading...</p>
      </div>
    );
  }

  /* ----------------------------------------------------------------
     Helper function to parse selected_frames
  ---------------------------------------------------------------- */
  function parseSelectedFrames(selected_frames) {
    let frames = selected_frames || {};
    if (typeof frames === "string") {
      try {
        frames = JSON.parse(frames);
      } catch (err) {
        console.error("Error parsing selected_frames:", err);
        frames = {};
      }
    }
    return frames;
  }

  /* ----------------------------------------------------------------
     Render the Dashboard
  ---------------------------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto my-10 px-4 bg-white text-black">
      {/* Dashboard Heading */}
      <h1 className="text-3xl font-bold mb-6">Publisher Dashboard</h1>

      {/* Error display if any */}
      {error && (
        <div className="text-red-500 mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Check if listings exist */}
      {listings.length === 0 ? (
        <p>No listings found.</p>
      ) : (
        // Display each listing in a card
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing, index) => {
            // Parse selected_frames
            const framesObj = parseSelectedFrames(listing.selected_frames);

            // We sum up clicks, earnings, etc.
            let totalClicks = 0;
            let totalEarnings = 0;
            let frameSize = "";
            let framePricePerClick = 0;
            let adImageURL = "";

            // Iterate over frames
            Object.keys(framesObj).forEach((frameKey) => {
              const frame = framesObj[frameKey];
              const clicks = parseInt(frame?.clicks || 0, 10);
              const pricePerClick = parseFloat(frame?.pricePerClick) || 0;
              totalClicks += clicks;
              totalEarnings += clicks * pricePerClick;
              frameSize = frame?.size || "N/A";
              framePricePerClick = pricePerClick;

              // Ad image if uploaded
              if (frame.uploadedFile) {
                adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frame.uploadedFile}`;
              }
            });

            return (
              <div
                key={listing.id}
                className="p-6 shadow border border-gray-200 rounded-xl"
              >
                {/* Listing Label */}
                <h2 className="text-xl font-semibold mb-2">
                  Listing #{index + 1}
                </h2>

                {/* Show listing ID */}
                <p className="mb-1">
                  <strong>Listing ID:</strong> {listing.id}
                </p>

                {/* Possibly display an Ad Image */}
                {adImageURL ? (
                  <div className="my-2">
                    <img
                      src={adImageURL}
                      alt="Ad Creative"
                      className="w-32 h-auto"
                    />
                  </div>
                ) : (
                  <p className="mb-2 text-gray-600">No Ad Uploaded</p>
                )}

                {/* Frame Size */}
                <p className="mb-1">
                  <strong>Frame Size:</strong> {frameSize}
                </p>

                {/* Price per Click */}
                <p className="mb-1">
                  <strong>Price per Click:</strong>{" "}
                  ${framePricePerClick.toFixed(2)}
                </p>

                {/* Total Clicks */}
                <p className="mb-1">
                  <strong>Total Clicks:</strong> {totalClicks}
                </p>

                {/* Total Earnings */}
                <p className="mb-1">
                  <strong>Total Earnings:</strong> ${totalEarnings.toFixed(2)}
                </p>

                {/* Created At */}
                <p className="mb-1">
                  <strong>Created At:</strong> {listing.created_at}
                </p>

                {/* Modify / Delete Actions */}
                <div className="mt-4 flex space-x-2">
                  <Link
                    to={`/modify-listing/${listing.id}`}
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    Modify Listing
                  </Link>
                  <button className="bg-red-500 text-white px-3 py-1 rounded">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   Export the PublisherDashboard
---------------------------------------------------------------- */
export default PublisherDashboard;





