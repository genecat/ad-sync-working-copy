import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const ListingStatus = ({ session }) => {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      if (!session || !session.user?.id) {
        setLoading(false);
        return;
      }
      // Fetch the first listing for this publisher
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("publisher_id", session.user.id)
        .limit(1)
        .single();
      if (error) {
        setError(error.message);
      } else {
        setListing(data);
      }
      setLoading(false);
    }
    fetchListing();
  }, [session]);

  if (loading) return <p>Loading listing status...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!listing) return <p>No listing created yet.</p>;

  return (
    <div className="p-4 border rounded bg-gray-50 text-black">
      <h2 className="text-xl font-bold mb-2">Existing Listing</h2>
      <p>
        <strong>Title:</strong> {listing.title}
      </p>
      <p>
        <strong>Category:</strong> {listing.category}
      </p>
      <p>
        <strong>Website:</strong> {listing.website}
      </p>
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Ad Frames:</h3>
        <pre className="bg-gray-100 p-2 rounded text-black">
          {JSON.stringify(listing.selected_frames, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ListingStatus;
