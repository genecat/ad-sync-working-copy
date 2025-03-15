import React from "react";

interface ListingCardProps {
  listing: any;
  onDelete: (id: string) => void;
  animationDelay?: number;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onDelete, animationDelay = 0 }) => {
  console.log("Listing data:", listing);
  let selectedFrames = listing.selected_frames || {};
  if (typeof selectedFrames === "string") {
    try {
      selectedFrames = JSON.parse(selectedFrames);
    } catch (error) {
      console.error("Error parsing selected_frames for listing", listing.id, error);
      selectedFrames = {};
    }
  }

  let frameSize = "N/A";
  let framePricePerClick = 0;
  let totalClicks = 0;
  let totalEarnings = 0;
  let adImageURL = "";

  Object.keys(selectedFrames).forEach((key) => {
    const frame = selectedFrames[key];
    if (frame.uploadedFile) {
      frameSize = frame.size || "N/A";
      adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frame.uploadedFile}`;
    }
  });

  Object.keys(selectedFrames).forEach((key) => {
    const frame = selectedFrames[key];
    const clicks = parseInt(frame?.clicks || frame?.clickCount || "0", 10);
    const pricePerClick = parseFloat(frame?.pricePerClick || frame?.price || "0") || 0;
    totalClicks += clicks;
    totalEarnings += clicks * pricePerClick;
    if (!adImageURL) {
      frameSize = frameSize === "N/A" ? frame?.size || "N/A" : frameSize;
      framePricePerClick = pricePerClick;
    } else if (frame.uploadedFile) {
      framePricePerClick = pricePerClick;
    }
  });

  return (
    <div
      className="border p-4 rounded-xl shadow-sm"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="mb-2">
        <p className="text-sm font-medium">Listing ID: {listing.id}</p>
        <p className="text-sm font-medium">Title: {listing.title}</p>
      </div>
      <div className="mb-2">
        {listing.website ? (
          <p className="text-sm break-all">{listing.website}</p>
        ) : (
          <p className="text-sm text-gray-500">No Website Listed</p>
        )}
      </div>
      <div className="mb-2">
        <p className="text-sm">Frame Size: {frameSize}</p>
        <p className="text-sm">Price per Click: ${framePricePerClick.toFixed(2)}</p>
      </div>
      <div className="mb-2">
        <p className="text-sm">Total Clicks: {totalClicks}</p>
        <p className="text-sm">Total Earnings: ${totalEarnings.toFixed(2)}</p>
      </div>
      <div className="mb-2">
        <p className="text-sm">Created At: {listing.created_at}</p>
      </div>
      <div>
        <button
          className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
          onClick={() => {
            console.log("Edit button clicked for listing ID:", listing.id);
            alert("Edit action");
          }}
        >
          Edit
        </button>
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

