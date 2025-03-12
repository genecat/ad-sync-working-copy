import React from "react";

interface ListingCardProps {
  listing: any;
  onDelete: (id: string) => void;
  animationDelay?: number;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onDelete, animationDelay = 0 }) => {
  let selectedFrames = listing.selected_frames || {};
  if (typeof selectedFrames === "string") {
    try {
      selectedFrames = JSON.parse(selectedFrames);
    } catch (error) {
      console.error("Error parsing selected_frames for listing", listing.id, error);
      selectedFrames = {};
    }
  }

  let frameSize = "";
  let framePricePerClick = 0;
  let totalClicks = 0;
  let totalEarnings = 0;
  let adImageURL = "";

  Object.keys(selectedFrames).forEach((key) => {
    const frame = selectedFrames[key];
    // Try to get clicks from either "clicks" or "clickCount"
    const clicks = parseInt(frame?.clicks || frame?.clickCount || "0", 10);
    // Try to get price per click from either "pricePerClick" or "price"
    const pricePerClick = parseFloat(frame?.pricePerClick || frame?.price || "0") || 0;
    totalClicks += clicks;
    totalEarnings += clicks * pricePerClick;
    frameSize = frame?.size || "N/A";
    framePricePerClick = pricePerClick;
    if (frame.uploadedFile) {
      adImageURL = `https://pczzwgluhgrjuxjadyaq.supabase.co/storage/v1/object/public/ad-creatives/${frame.uploadedFile}`;
    }
  });

  return (
    <div
      className="border p-4 rounded-xl shadow-sm"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="mb-2">
        <p className="text-sm font-medium">Listing ID: {listing.id}</p>
      </div>
      <div className="mb-2">
        {adImageURL ? (
          <img src={adImageURL} alt="Ad Creative" className="w-full h-auto" />
        ) : (
          <p className="text-sm text-gray-500">No Ad Uploaded</p>
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
        <button className="bg-yellow-500 text-white px-2 py-1 rounded mr-2" onClick={() => alert("Edit action")}>
          Edit
        </button>
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={() => onDelete(listing.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ListingCard;

