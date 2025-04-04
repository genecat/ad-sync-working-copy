import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const availableFrames = [
  { id: "frame1", size: "300x250" },
  { id: "frame2", size: "728x90" },
  { id: "frame3", size: "640x480" },
  { id: "frame4", size: "300x90" },
  { id: "frame5", size: "480x640" },
];

function EditListing({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listingDetails, setListingDetails] = useState({
    title: "",
    category: "",
    website: "",
  });
  const [selectedFrames, setSelectedFrames] = useState({});
  const [embedCode, setEmbedCode] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchListing() {
      if (!session?.user?.id || !id) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .eq("publisher_id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching listing:", error);
        setSaveMessage("Error loading listing.");
      } else if (data) {
        setListingDetails({
          title: data.title || "",
          category: data.category || "",
          website: data.website || "",
        });
        setSelectedFrames(data.selected_frames || {});
      }
      setIsLoading(false);
    }
    fetchListing();
  }, [session, id]);

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setListingDetails((prev) => ({ ...prev, [name]: value }));
  };

  const toggleFrame = (frameId) => {
    setSelectedFrames((prev) => {
      if (prev[frameId]) {
        const updated = { ...prev };
        delete updated[frameId];
        return updated;
      }
      const frameInfo = availableFrames.find((f) => f.id === frameId);
      if (!frameInfo) return prev; // Safety check for undefined frameInfo
      return { ...prev, [frameId]: { size: frameInfo.size, pricePerClick: prev[frameId]?.pricePerClick || "" } };
    });
  };

  const handlePriceChange = (frameId, value) => {
    setSelectedFrames((prev) => ({
      ...prev,
      [frameId]: { ...prev[frameId], pricePerClick: value },
    }));
  };

  const generateCode = () => {
    if (!id) {
      setEmbedCode("Please save the listing first to generate the embed code.");
      return;
    }

    const baseUrl = "https://adsync.vendomedia.net/api/serve-active-ad";
    let code = "<!-- Ad Exchange Embed Code Start -->\n";
    const frameKeys = Object.keys(selectedFrames);

    frameKeys.forEach((frameKey, index) => {
      const slotId = index + 1;
      const frameData = selectedFrames[frameKey];
      const size = frameData.size || "300x250";
      const [width, height] = size.split("x");

      code += `<div class="ad-slot" id="ad-slot-${slotId}">\n`;
      code += `  <iframe src="${baseUrl}?listingId=${id}&slotId=${slotId}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n`;
      code += `</div>\n`;
    });

    code += "<!-- Ad Exchange Embed Code End -->\n";
    setEmbedCode(code);
  };

  const saveListing = async () => {
    if (!session) {
      setSaveMessage("You must be logged in to save a listing.");
      return;
    }
    if (!listingDetails.title || !listingDetails.category || !listingDetails.website) {
      setSaveMessage("Please fill in all fields.");
      return;
    }
    if (Object.keys(selectedFrames).length === 0) {
      setSaveMessage("Please select at least one ad frame.");
      return;
    }
    for (const frameId in selectedFrames) {
      if (!selectedFrames[frameId].pricePerClick) {
        setSaveMessage(`Please enter a price for frame ${frameId}.`);
        return;
      }
    }

    const payload = {
      title: listingDetails.title,
      category: listingDetails.category,
      website: listingDetails.website,
      selected_frames: selectedFrames,
    };

    try {
      const { error } = await supabase
        .from("listings")
        .update(payload)
        .eq("id", id)
        .eq("publisher_id", session.user.id);

      if (error) throw new Error("Error updating listing: " + error.message);
      setSaveMessage("Listing updated successfully!");
      generateCode();
    } catch (err) {
      console.error("Error saving listing:", err);
      setSaveMessage("Error saving listing: " + err.message);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-10 px-4 space-y-10">
      <div className="p-8 shadow border border-gray-200 rounded-xl bg-white text-black">
        <h1 className="text-3xl font-bold mb-4">Modify Listing</h1>
        <h2 className="text-xl font-semibold mb-3">Listing Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block mb-1 font-medium">Title:</label>
            <input
              type="text"
              name="title"
              value={listingDetails.title}
              onChange={handleDetailChange}
              className="border p-2 w-full bg-gray-100 text-black placeholder-gray-500 rounded"
              placeholder="Enter a listing title"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Category:</label>
            <select
              name="category"
              value={listingDetails.category}
              onChange={handleDetailChange}
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
          <div>
            <label className="block mb-1 font-medium">Publisher Website URL:</label>
            <input
              type="text"
              name="website"
              value={listingDetails.website}
              onChange={handleDetailChange}
              className="border p-2 w-full bg-gray-100 text-black placeholder-gray-500 rounded"
              placeholder="https://example.com"
            />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-3">Available Ad Frames</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {availableFrames.map((frame) => {
            const isSelected = !!selectedFrames[frame.id];
            return (
              <div key={frame.id} className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={frame.id}
                    checked={isSelected}
                    onChange={() => toggleFrame(frame.id)}
                    className="mr-2 form-checkbox h-5 w-5 text-blue-500"
                  />
                  <label htmlFor={frame.id} className="mr-2 text-black">{frame.size}</label>
                </div>
                {isSelected && (
                  <div className="ml-7">
                    <label className="block text-sm text-gray-600">Price per Click ($):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedFrames[frame.id].pricePerClick}
                      onChange={(e) => handlePriceChange(frame.id, e.target.value)}
                      className="border p-1 w-full bg-gray-100 text-black rounded"
                      placeholder="e.g., 0.50"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button onClick={() => generateCode()} className="bg-blue-600 text-white px-4 py-2 rounded">
            Generate HTML Code
          </button>
          <button onClick={saveListing} className="bg-purple-600 text-white px-4 py-2 rounded">
            Save Listing
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
              <button onClick={() => navigator.clipboard.writeText(embedCode)} className="bg-green-600 text-white px-4 py-2 rounded">
                Copy Code
              </button>
            </div>
          </div>
        )}
        {saveMessage && <p className="mt-2 text-sm text-black">{saveMessage}</p>}
        <div className="mt-4">
          <p className="font-medium mb-1">Selected Frames JSON:</p>
          <pre className="bg-gray-100 p-2 rounded text-black">{JSON.stringify(selectedFrames, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export default EditListing;