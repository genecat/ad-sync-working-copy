import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://pczzwgluhgrjuxjadyaq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0"
);

const availableFrames = [
  { id: "frame1", size: "300x250" },
  { id: "frame2", size: "728x90" },
  { id: "frame3", size: "640x480" },
  { id: "frame4", size: "300x90" },
  { id: "frame5", size: "480x640" },
];

function AddFrame({ session }) {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState({});
  const [newFrameSize, setNewFrameSize] = useState(availableFrames[0].size);
  const [newFramePrice, setNewFramePrice] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchListing() {
      if (!session?.user?.id) {
        setError("You must be logged in to view or modify listings.");
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (error) {
        setError("Error fetching listing: " + error.message);
      } else if (data) {
        setListing(data);
        let frames = data.selected_frames;
        if (typeof frames === "string") {
          try {
            frames = JSON.parse(frames);
          } catch (e) {
            frames = {};
          }
        }
        setSelectedFrames(frames || {});
      }
    }
    fetchListing();
  }, [listingId, session]);

  const addFrame = (size, price) => {
    if (!price) {
      setError("Please enter a price per click for the new frame.");
      return;
    }
    const frameKey = `frame${Date.now()}`;
    const updatedFrames = {
      ...selectedFrames,
      [frameKey]: { size, pricePerClick: price },
    };
    setSelectedFrames(updatedFrames);
    setNewFramePrice("");
    setError("");
    generateCode(listingId, frameKey, updatedFrames);
  };

  const generateCode = (listingId, frameKey, frames) => {
    // Change the baseUrl to the correct production domain
    const baseUrl = "https://ad-sync-kqdos6x8j-genecats-projects.vercel.app"; // Updated domain
    const frameData = frames[frameKey];
    if (!frameData) return;

    const size = frameData.size || "Unknown";
    const [width, height] = size.split("x");

    let code = `<!-- Ad Exchange Embed Code Start -->\n`;
    code += `<div class="ad-slot" id="ad-slot-${frameKey}">\n`;
    code += `  <iframe src="${baseUrl}/api/serve-ad/listingId?listingId=${listingId}&frame=${frameKey}" `;
    code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n`;
    code += `</div>\n`;
    code += `<script>\n`;
    code += `  (function() {\n`;
    code += `    const listingId = '${listingId}';\n`;
    code += `    const frameId = '${frameKey}';\n`;
    code += `    const adSlot = document.getElementById('ad-slot-${frameKey}');\n`;
    code += `    async function checkAdStatus() {\n`;
    code += `      try {\n`;
    code += `        const response = await fetch(\`${baseUrl}/api/check-ad-status?listingId=\${listingId}&frameId=\${frameId}\`);\n`;
    code += `        const data = await response.json();\n`;
    code += `        if (!data.isActive) {\n`;
    code += `          adSlot.style.display = 'none';\n`;
    code += `        }\n`;
    code += `      } catch (error) {\n`;
    code += `        console.error('Error checking ad status:', error);\n`;
    code += `        adSlot.style.display = 'none';\n`;
    code += `      }\n`;
    code += `    }\n`;
    code += `    checkAdStatus();\n`;
    code += `    setInterval(checkAdStatus, 5 * 60 * 1000);\n`;
    code += `  })();\n`;
    code += `</script>\n`;
    code += `<!-- Ad Exchange Embed Code End -->\n`;

    setEmbedCode(code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!listingId) {
      setError("Missing or invalid listing ID.");
      return;
    }

    const payload = {
      selected_frames: selectedFrames,
    };

    const { error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", listingId);

    if (error) {
      setError("Error adding frame: " + error.message);
    } else {
      setMessage("Frame added successfully!");
    }
  };

  if (!listing) {
    return <p className="p-4 text-black">Loading listing details...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 text-black">
      <div className="p-8 shadow border border-gray-200 rounded-xl bg-white">
        <h1 className="text-3xl font-bold mb-6">Add New Ad Frame to Listing</h1>
        <p className="mb-4"><strong>Website:</strong> {listing.website}</p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="text-green-500 mb-4">{message}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Add New Ad Frame</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <select
                value={newFrameSize}
                onChange={(e) => setNewFrameSize(e.target.value)}
                className="border p-2 w-full sm:w-1/2 bg-gray-100 text-black rounded"
              >
                {availableFrames.map((frame) => (
                  <option key={frame.id} value={frame.size}>{frame.size}</option>
                ))}
              </select>
              <input
                type="number"
                value={newFramePrice}
                onChange={(e) => setNewFramePrice(e.target.value)}
                placeholder="Price per Click"
                className="border p-2 w-full sm:w-1/2 bg-gray-100 text-black rounded"
              />
            </div>
            <button
              type="button"
              onClick={() => addFrame(newFrameSize, newFramePrice)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Add Frame
            </button>
          </div>
          {embedCode && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Your Embed Code:</h2>
              <textarea
                readOnly
                value={embedCode}
                className="w-full h-40 p-2 border rounded bg-gray-100 text-black placeholder-gray-500"
              />
              <div className="mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(embedCode)}
                  type="button"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}
          <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded">
            Save New Frame
          </button>
        </form>
        <div className="mt-6">
          <Link to="/dashboard" className="text-blue-600 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AddFrame;

