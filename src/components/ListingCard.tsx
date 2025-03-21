import React from "react";

interface ListingCardProps {
  listing: any;
  stats: { impression_count: number; click_count: number; frames?: { [frame: string]: { impression_count: number; click_count: number } } };
  onDelete: (id: string) => void;
  animationDelay?: number;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, stats, onDelete, animationDelay = 0 }) => {
  console.log("Listing data:", listing);
  console.log("Stats data:", stats);

  // Parse selected_frames if it's a string
  let selectedFrames = listing.selected_frames || {};
  if (typeof selectedFrames === "string") {
    try {
      selectedFrames = JSON.parse(selectedFrames);
    } catch (error) {
      console.error("Error parsing selected_frames for listing", listing.id, error);
      selectedFrames = {};
    }
  }

  // Find the frame with clicks in ad_stats
  let pricePerClick = 0;
  let frameSize = "N/A";
  let adImageURL = "";
  const framesWithStats = stats.frames || {};
  Object.keys(framesWithStats).forEach(frame => {
    if (framesWithStats[frame].click_count > 0) {
      const frameData = selectedFrames[frame];
      if (frameData) {
        pricePerClick = parseFloat(frameData.pricePerClick || "0");
        frameSize = frameData.size || "N/A";
        if (frameData.uploadedFile) {
          adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frameData.uploadedFile}`;
        }
      }
    }
  });

  // If no clicks, use the first frame
  if (!pricePerClick) {
    const firstFrame = Object.values(selectedFrames)[0] as any;
    pricePerClick = firstFrame ? parseFloat(firstFrame.pricePerClick || "0") : 0;
    frameSize = firstFrame?.size || "N/A";
    if (firstFrame?.uploadedFile) {
      adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${firstFrame.uploadedFile}`;
    }
  }

  const clicks = stats.click_count || 0;
  const impressions = stats.impression_count || 0;
  const earnings = clicks * pricePerClick;

  return (
    <div
      className="border p-4 rounded-xl shadow-sm animate-fade-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="mb-2">
        <p className="text-sm font-medium">Listing ID: {listing.id}</p>
        <p className="text-sm font-medium">Title: {listing.title}</p>
      </div>
      <div className="mb-2">
        {listing.website ? (
          <p className="text-sm break-all">Website: {listing.website}</p>
        ) : (
          <p className="text-sm text-gray-500">No Website Listed</p>
        )}
      </div>
      <div className="mb-2">
        <p className="text-sm">Frame Size: {frameSize}</p>
        <p className="text-sm">Price per Click: ${pricePerClick.toFixed(2)}</p>
      </div>
      <div className="mb-2">
        <p className="text-sm">Total Clicks: {clicks}</p>
        <p className="text-sm">Total Impressions: {impressions}</p>
        <p className="text-sm">Total Earnings: ${earnings.toFixed(2)}</p>
      </div>
      <div className="mb-2">
        <p className="text-sm">Created At: {new Date(listing.created_at).toLocaleString()}</p>
      </div>
      <div className="flex space-x-2">
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={() => {
            console.log("Delete button clicked for listing ID:", listing.id);
            onDelete(listing.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ListingCard;

