import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";

const availableFrames = [
  { id: "frame1", size: "300x250" },
  { id: "frame2", size: "728x90" },
  { id: "frame3", size: "640x480" },
  { id: "frame4", size: "300x90" },
  { id: "frame5", size: "480x640" },
];

function CreateListingFinal({ session }) {
  console.log("CreateListingFinal loaded");

  const navigate = useNavigate();
  const [listingDetails, setListingDetails] = useState({
    title: "",
    category: "",
    website: "",
  });
  const [selectedFrames, setSelectedFrames] = useState({});
  const [embedCode, setEmbedCode] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentListingId, setCurrentListingId] = useState(null);

  useEffect(() => {
    async function fetchListings() {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }
      console.log("Fetching listings for user:", session.user.id);
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("publisher_id", session.user.id);
      if (error) {
        console.error("Error fetching listings:", error);
      } else {
        const parsedListings = data.map((listing) => {
          if (typeof listing.selected_frames === "string") {
            try {
              listing.selected_frames = JSON.parse(listing.selected_frames);
            } catch (err) {
              console.error("Error parsing selected_frames for listing", listing.id, err);
              listing.selected_frames = {};
            }
          }
          return listing;
        });
        setListings(parsedListings || []);
      }
      setIsLoading(false);
    }
    fetchListings();
  }, [session]);

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
      return { ...prev, [frameId]: { size: frameInfo.size, pricingModel: "CPC", pricePerClick: "", cpm: "" } };
    });
  };

  const handlePricingModelChange = (frameId, model) => {
    setSelectedFrames((prev) => ({
      ...prev,
      [frameId]: { ...prev[frameId], pricingModel: model, pricePerClick: "", cpm: "" },
    }));
  };

  const handlePriceChange = (frameId, value) => {
    setSelectedFrames((prev) => ({
      ...prev,
      [frameId]: { ...prev[frameId], pricePerClick: value },
    }));
  };

  const handleCpmChange = (frameId, value) => {
    setSelectedFrames((prev) => ({
      ...prev,
      [frameId]: { ...prev[frameId], cpm: value },
    }));
  };

  const generateCode = () => {
    if (!currentListingId) {
      setEmbedCode("Please save the listing first to generate the embed code.");
      return;
    }

    const baseUrl = "http://localhost:3000/api/serve-ad/listingId";
    let code = "<!-- Ad Exchange Embed Code Start -->\n";
    const frameKeys = Object.keys(selectedFrames);

    frameKeys.forEach((frameKey) => {
      const frameId = frameKey;
      const frameData = selectedFrames[frameKey];
      const size = frameData.size || "300x250";
      const [width, height] = size.split("x");

      code += `<div class="ad-slot" id="ad-slot-${frameId}">\n`;
      code += `  <iframe src="${baseUrl}?listingId=${currentListingId}&frame=${frameId}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n`;
      code += `</div>\n`;

      code += `<script>\n`;
      code += `  (function() {\n`;
      code += `    const listingId = "${currentListingId}";\n`;
      code += `    const frameId = "${frameId}";\n`;
      code += `    const adSlot = document.getElementById("ad-slot-${frameId}");\n`;
      code += `    async function checkAdStatus() {\n`;
      code += `      try {\n`;
      code += `        const url = "http://localhost:5173/api/check-ad-status?listingId=" + listingId + "&frameId=" + frameId;\n`;
      code += `        const response = await fetch(url);\n`;
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
      const frame = selectedFrames[frameId];
      if (frame.pricingModel === "CPC" && !frame.pricePerClick) {
        setSaveMessage(`Please enter a price per click for frame ${frameId}.`);
        return;
      }
      if (frame.pricingModel === "CPM" && !frame.cpm) {
        setSaveMessage(`Please enter a CPM for frame ${frameId}.`);
        return;
      }
    }

    const payload = {
      publisher_id: session.user.id,
      title: listingDetails.title,
      category: listingDetails.category,
      website: listingDetails.website,
      selected_frames: selectedFrames,
    };

    try {
      const { data: existingListing, error: fetchError } = await supabase
        .from("listings")
        .select("id, selected_frames")
        .eq("website", listingDetails.website)
        .eq("publisher_id", session.user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error("Error checking existing listing: " + fetchError.message);
      }

      let updatedListingId;
      if (existingListing) {
        const existingFrames = existingListing.selected_frames || {};
        const updatedFrames = { ...existingFrames, ...selectedFrames };

        const { data, error: updateError } = await supabase
          .from("listings")
          .update({
            selected_frames: updatedFrames,
            category: listingDetails.category,
            title: listingDetails.title,
          })
          .eq("id", existingListing.id)
          .select();

        if (updateError) {
          throw new Error("Error updating listing: " + updateError.message);
        }
        setSaveMessage("Listing updated successfully!");
        updatedListingId = existingListing.id;
        setCurrentListingId(updatedListingId);
        setListings((prev) =>
          prev.map((listing) =>
            listing.id === updatedListingId ? { ...listing, selected_frames: updatedFrames, category: listingDetails.category, title: listingDetails.title } : listing
          )
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("listings")
          .insert([payload])
          .select();

        if (insertError) {
          throw new Error("Error creating listing: " + insertError.message);
        }
        setSaveMessage("Listing created successfully!");
        updatedListingId = data[0].id;
        setCurrentListingId(updatedListingId);
        setListings((prev) => [...prev, data[0]]);
      }

      // Insert or update frames in the frames table
      for (const frameId in selectedFrames) {
        const frameData = selectedFrames[frameId];
        const { data: existingFrame, error: fetchFrameError } = await supabase
          .from("frames")
          .select("frame_id")
          .eq("frame_id", frameId)
          .eq("listing_id", updatedListingId)
          .single();

        if (fetchFrameError && fetchFrameError.code !== "PGRST116") {
          throw new Error("Error checking existing frame: " + fetchFrameError.message);
        }

        if (existingFrame) {
          const { error: updateFrameError } = await supabase
            .from("frames")
            .update({
              price_per_click: frameData.pricingModel === "CPC" ? parseFloat(frameData.pricePerClick) : 0,
              cpm: frameData.pricingModel === "CPM" ? parseFloat(frameData.cpm) : 0,
              pricing_model: frameData.pricingModel,
            })
            .eq("frame_id", frameId)
            .eq("listing_id", updatedListingId);

          if (updateFrameError) {
            throw new Error("Error updating frame: " + updateFrameError.message);
          }
        } else {
          const { error: insertFrameError } = await supabase
            .from("frames")
            .insert({
              frame_id: frameId,
              listing_id: updatedListingId,
              price_per_click: frameData.pricingModel === "CPC" ? parseFloat(frameData.pricePerClick) : 0,
              cpm: frameData.pricingModel === "CPM" ? parseFloat(frameData.cpm) : 0,
              pricing_model: frameData.pricingModel,
            });

          if (insertFrameError) {
            throw new Error("Error inserting frame: " + insertFrameError.message);
          }
        }
      }

      generateCode();
      setListingDetails({ title: "", category: "", website: "" });
      setSelectedFrames({});
    } catch (err) {
      console.error("Error saving listing:", err);
      setSaveMessage("Error saving listing: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-10 px-4 space-y-10">
      <div className="p-8 shadow border border-gray-200 rounded-xl bg-white text-black">
        <h1 className="text-3xl font-bold mb-4">
          Create Listing <span className="text-sm text-gray-500">(Add)</span>
        </h1>
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
            <label className="block mb-1 font-medium">
              Publisher Website URL:
            </label>
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
                  <label htmlFor={frame.id} className="mr-2 text-black">
                    {frame.size}
                  </label>
                </div>
                {isSelected && (
                  <div className="ml-7 space-y-2">
                    <div>
                      <label className="block text-sm text-gray-600">
                        Select Pricing Model for this Ad Frame:
                      </label>
                      <select
                        value={selectedFrames[frame.id].pricingModel}
                        onChange={(e) => handlePricingModelChange(frame.id, e.target.value)}
                        className="border p-1 w-full bg-gray-100 text-black rounded"
                      >
                        <option value="CPC">CPC (Cost Per Click)</option>
                        <option value="CPM">CPM (Cost Per 1,000 Impressions)</option>
                      </select>
                    </div>
                    {selectedFrames[frame.id].pricingModel === "CPC" && (
                      <div>
                        <label className="block text-sm text-gray-600">
                          Price per Click ($):
                        </label>
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
                    {selectedFrames[frame.id].pricingModel === "CPM" && (
                      <div>
                        <label className="block text-sm text-gray-600">
                          CPM ($):
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selectedFrames[frame.id].cpm}
                          onChange={(e) => handleCpmChange(frame.id, e.target.value)}
                          className="border p-1 w-full bg-gray-100 text-black rounded"
                          placeholder="e.g., 10.00"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button
            onClick={() => generateCode()}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Generate HTML Code
          </button>
          <button
            onClick={saveListing}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
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
              <button
                onClick={() => navigator.clipboard.writeText(embedCode)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Copy Code
              </button>
            </div>
          </div>
        )}

        {saveMessage && (
          <p className="mt-2 text-sm text-black">{saveMessage}</p>
        )}

        <div className="mt-4">
          <p className="font-medium mb-1">Selected Frames JSON:</p>
          <pre className="bg-gray-100 p-2 rounded text-black">
            {JSON.stringify(selectedFrames, null, 2)}
          </pre>
        </div>
      </div>

      <div className="p-6 shadow border border-gray-200 rounded-xl bg-white text-black">
        <h2 className="text-2xl font-bold mb-4">My Listings</h2>
        {isLoading ? (
          <p>Loading listings...</p>
        ) : listings.length === 0 ? (
          <p>No listings found.</p>
        ) : (
          <div className="space-y-6">
            {listings.map((listing, index) => (
              <div
                key={listing.id}
                className="p-6 shadow border border-gray-200 rounded-xl"
              >
                <h3 className="text-xl font-semibold mb-2">
                  Listing #{index + 1}
                </h3>
                <p>
                  <strong>Title:</strong> {listing.title}
                </p>
                <p>
                  <strong>Category:</strong> {listing.category}
                </p>
                <p>
                  <strong>Website:</strong> {listing.website}
                </p>
                <div className="mt-2">
                  <strong>Ad Frames:</strong>{" "}
                  {listing.selected_frames &&
                    Object.keys(listing.selected_frames).map((key) => {
                      const frame = listing.selected_frames[key];
                      return (
                        <span
                          key={key}
                          className="inline-block bg-gray-100 text-black px-2 py-1 rounded mr-2"
                        >
                          {frame.size} - {frame.pricingModel}: $
                          {frame.pricingModel === "CPC" ? frame.pricePerClick || "N/A" : frame.cpm || "N/A"}
                        </span>
                      );
                    })}
                </div>
                <div className="mt-4">
                  <Link
                    to={`/edit-listing/${listing.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Modify Listing
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateListingFinal;



