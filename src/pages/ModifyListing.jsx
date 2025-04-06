import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pczzwgluhgrjuxjadyaq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenp3Z2x1aGdyanV4amFkeWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjY0MTQsImV4cCI6MjA1NTc0MjQxNH0.dpVupxUEf8be6aMG8jJZFduezZjaveCnUhI9p7G7ud0'
);

const availableFrames = [
  { id: "frame1", size: "300x250" },
  { id: "frame2", size: "728x90" },
  { id: "frame3", size: "640x480" },
  { id: "frame4", size: "300x90" },
  { id: "frame5", size: "480x640" },
];

const ModifyListing = ({ session }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState({});
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newFrameSize, setNewFrameSize] = useState(availableFrames[0].size);
  const [newFramePrice, setNewFramePrice] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [selectedFrameToCopy, setSelectedFrameToCopy] = useState('all');

  useEffect(() => {
    console.log("ModifyListing component mounted with id:", id);
    console.log("Session:", session);

    if (!id) {
      console.error("No id provided in URL");
      setError("Invalid listing ID");
      return;
    }

    if (!session) {
      console.error("No session provided");
      setError("You must be logged in to modify a listing");
      return;
    }

    async function fetchListing() {
      try {
        console.log("Fetching listing for ID:", id);
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          console.error('Error fetching listing:', error);
          throw new Error('Error fetching listing: ' + error.message);
        }
        if (!data) {
          console.error('No listing found for ID:', id);
          throw new Error('Listing not found');
        }
        console.log("Fetched listing data:", data);
        setListing(data);
        let frames = data.selected_frames;
        if (typeof frames === 'string') {
          try {
            frames = JSON.parse(frames);
          } catch (e) {
            console.error('Error parsing selected_frames:', e);
            frames = {};
          }
        }
        setSelectedFrames(frames || {});
        setCategory(data.category || '');
        generateCode(frames || {});
      } catch (err) {
        console.error("Fetch listing error:", err);
        setError(err.message);
      }
    }
    fetchListing();
  }, [id, session]);

  const handleFramePriceChange = (frameKey, newPrice) => {
    setSelectedFrames((prev) => {
      const updatedFrames = {
        ...prev,
        [frameKey]: {
          ...prev[frameKey],
          pricePerClick: newPrice,
        },
      };
      generateCode(updatedFrames);
      return updatedFrames;
    });
  };

  const addFrame = (size, price) => {
    console.log("Adding new frame - Size:", size, "Price:", price);
    if (!price) {
      console.error("No price provided for new frame");
      setError('Please enter a price per click for the new frame.');
      return;
    }
    const frameKey = `frame${Date.now()}`;
    setSelectedFrames((prev) => {
      const updatedFrames = {
        ...prev,
        [frameKey]: { size, pricePerClick: price },
      };
      console.log("Updated selectedFrames after adding:", updatedFrames);
      generateCode(updatedFrames);
      return updatedFrames;
    });
    setNewFramePrice('');
    setError('');
  };

  const removeFrame = (frameKey) => {
    setSelectedFrames((prev) => {
      const updated = { ...prev };
      delete updated[frameKey];
      generateCode(updated);
      return updated;
    });
  };

  const generateCode = (frames) => {
    console.log("Generating embed code for frames:", frames);
    if (!id) {
      console.error("Cannot generate embed code: id is not defined");
      setError("Cannot generate embed code: Invalid listing ID");
      return;
    }
    const baseUrl = "https://my-ad-agency.vercel.app";
    let code = "<!-- Ad Exchange Embed Code Start -->\n";
    Object.keys(frames).forEach((frameKey) => {
      const frameData = frames[frameKey];
      const size = frameData.size || "Unknown";
      const [width, height] = size.split("x");
      code += `<div class="ad-slot" id="ad-slot-${frameKey}">\n`;
      code += `  <iframe src="${baseUrl}/api/serve-ad/listingId?listingId=${id}&frame=${frameKey}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n`;
      code += `</div>\n`;
      code += `<script>\n`;
      code += `  (function() {\n`;
      code += `    const listingId = "${id}";\n`;
      code += `    const frameId = "${frameKey}";\n`;
      code += `    const adSlot = document.getElementById("ad-slot-${frameKey}");\n`;
      code += `    async function checkAdStatus() {\n`;
      code += `      try {\n`;
      code += `        const response = await fetch(\`${baseUrl}/api/check-ad-status?listingId=\${listingId}&frameId=\${frameId}\`);\n`;
      code += `        const data = await response.json();\n`;
      code += `        if (!data.isActive) {\n`;
      code += `          adSlot.style.display = "none";\n`;
      code += `        }\n`;
      code += `      } catch (error) {\n`;
      code += `        console.error("Error checking ad status:", error);\n`;
      code += `        adSlot.style.display = "none";\n`;
      code += `      }\n`;
      code += `    }\n`;
      code += `    checkAdStatus();\n`;
      code += `    setInterval(checkAdStatus, 5 * 60 * 1000);\n`;
      code += `  })();\n`;
      code += `</script>\n`;
    });
    code += "<!-- Ad Exchange Embed Code End -->\n";
    setEmbedCode(code);
  };

  const generateCodeForSelected = () => {
    if (!id) {
      console.error("Cannot generate embed code: id is not defined");
      setError("Cannot generate embed code: Invalid listing ID");
      return;
    }
    const baseUrl = "https://my-ad-agency.vercel.app";
    if (selectedFrameToCopy === 'all') {
      generateCode(selectedFrames);
      return;
    }
    const frameKey = selectedFrameToCopy;
    const frameData = selectedFrames[frameKey];
    if (frameData) {
      const size = frameData.size || "Unknown";
      const [width, height] = size.split("x");
      let code = `<!-- Ad Exchange Embed Code Start -->\n`;
      code += `<div class="ad-slot" id="ad-slot-${frameKey}">\n`;
      code += `  <iframe src="${baseUrl}/api/serve-ad/listingId?listingId=${id}&frame=${frameKey}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n`;
      code += `</div>\n`;
      code += `<script>\n`;
      code += `  (function() {\n`;
      code += `    const listingId = "${id}";\n`;
      code += `    const frameId = "${frameKey}";\n`;
      code += `    const adSlot = document.getElementById("ad-slot-${frameKey}");\n`;
      code += `    async function checkAdStatus() {\n`;
      code += `      try {\n`;
      code += `        const response = await fetch(\`${baseUrl}/api/check-ad-status?listingId=\${listingId}&frameId=\${frameId}\`);\n`;
      code += `        const data = await response.json();\n`;
      code += `        if (!data.isActive) {\n`;
      code += `          adSlot.style.display = "none";\n`;
      code += `        }\n`;
      code += `      } catch (error) {\n`;
      code += `        console.error("Error checking ad status:", error);\n`;
 rotate13      code += `        adSlot.style.display = "none";\n`;
      code += `      }\n`;
      code += `    }\n`;
      code += `    checkAdStatus();\n`;
      code += `    setInterval(checkAdStatus, 5 * 60 * 1000);\n`;
      code += `  })();\n`;
      code += `</script>\n`;
      code += `<!-- Ad Exchange Embed Code End -->\n`;
      setEmbedCode(code);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting updated listing with payload:", { selectedFrames, category });
    const payload = {
      selected_frames: selectedFrames,
      category: category,
    };
    try {
      console.log("Sending update to Supabase with ID:", id, "Payload:", payload);
      const { error } = await supabase
        .from('listings')
        .update(payload)
        .eq('id', id);
      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Error updating listing: ' + error.message);
      }
      console.log("Update successful, setting success message");
      setMessage('Listing updated successfully!');
      console.log("Listing updated successfully with payload:", payload);
      generateCode(selectedFrames);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || 'Failed to save listing. Please try again.');
    }
  };

  console.log("Current state - listing:", listing, "error:", error, "selectedFrames:", selectedFrames);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-black">
        <div className="p-8 shadow border border-gray-200 rounded-xl bg-white">
          <h1 className="text-3xl font-bold mb-6">Error</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/publisher-dashboard" className="text-blue-600 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) {
    return <p className="p-4 text-black">Loading listing details...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 text-black">
      <div className="p-8 shadow border border-gray-200 rounded-xl bg-white">
        <h1 className="text-3xl font-bold mb-6">Modify Listing</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {message && <p className="text-green-500 mb-4">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block mb-2 font-semibold">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border p-2 w-full bg-gray-100 text-black rounded"
            >
              <option value="">Select a category</option>
              <option value="Technology">Technology</option>
              <option value="Sports">Sports</option>
              <option value="Lifestyle">Lifestyle</option>
              <option value="Finance">Finance</option>
              <option value="Entertainment">Entertainment</option>
            </select>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Ad Frames</h2>
            {Object.keys(selectedFrames).length > 0 ? (
              Object.keys(selectedFrames).map((frameKey, index) => (
                <div key={frameKey} className="mb-4 p-4 border rounded bg-gray-50">
                  <p className="mb-2">
                    <strong>Frame #{index + 1}:</strong> {frameKey} - Size: {selectedFrames[frameKey].size}
                  </p>
                  <label className="block mb-2">
                    Price per Click:
                    <input
                      type="number"
                      value={selectedFrames[frameKey].pricePerClick}
                      onChange={(e) => handleFramePriceChange(frameKey, e.target.value)}
                      className="ml-2 border p-1 bg-gray-100 text-black rounded"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeFrame(frameKey)}
                    className="mt-1 px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Remove Frame
                  </button>
                </div>
              ))
            ) : (
              <p>No ad frames selected.</p>
            )}
            <div className="mt-4">
              <label className="block mb-2 font-semibold">Add New Frame:</label>
              <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <select
                  value={newFrameSize}
                  onChange={(e) => setNewFrameSize(e.target.value)}
                  className="border p-2 w-full sm:w-1/2 bg-gray-100 text-black rounded"
                >
                  {availableFrames.map((frame) => (
                    <option key={frame.id} value={frame.size}>
                      {frame.size}
                    </option>
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
                Add New Frame
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="block mb-2 font-semibold">Select Frame to Copy:</label>
            <select
              value={selectedFrameToCopy}
              onChange={(e) => setSelectedFrameToCopy(e.target.value)}
              className="border p-2 w-full bg-gray-100 text-black rounded mb-2"
            >
              <option value="all">All Frames</option>
              {Object.keys(selectedFrames).map((frameKey, index) => (
                <option key={frameKey} value={frameKey}>
                  Frame #{index + 1}: {frameKey} ({selectedFrames[frameKey].size})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={generateCodeForSelected}
              className="mb-2 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Generate HTML Code
            </button>
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
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded">
            Save Modifications
          </button>
        </form>

        <div className="mt-6">
          <Link to="/publisher-dashboard" className="text-blue-600 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ModifyListing;


