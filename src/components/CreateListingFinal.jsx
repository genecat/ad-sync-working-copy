import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";

// Single Supabase client
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
      return { ...prev, [frameId]: { size: frameInfo.size, pricePerClick: "" } };
    });
  };

  const handlePriceChange = (frameId, value) => {
    setSelectedFrames((prev) => ({
      ...prev,
      [frameId]: { ...prev[frameId], pricePerClick: value },
    }));
  };

  const generateCode = () => {
    const baseUrl = "https://my-ad-agency.vercel.app";
    let code = "<!-- Ad Exchange Embed Code Start -->\n";
    Object.keys(selectedFrames).forEach((frameKey) => {
      const frameData = selectedFrames[frameKey];
      const size = frameData.size || "Unknown";
      const [width, height] = size.split("x");
      code += `<div class="ad-slot" id="ad-slot-${frameKey}">\n`;
      code += `  <iframe src="${baseUrl}/serve-ad?frame=${frameKey}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n`;
      code += `</div>\n`;
      code += `<script>\n`;
      code += `  (function() {\n`;
      code += `    const frameId = "${frameKey}";\n`;
      code += `    const adSlot = document.getElementById("ad-slot-${frameKey}");\n`;
      code += `    async function checkAdStatus() {\n`;
      code += `      try {\n`;
      code += `        const response = await fetch(\`${baseUrl}/api/check-ad-status?frameId=\${frameId}\`);\n`;
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
      if (!selectedFrames[frameId].pricePerClick) {
        setSaveMessage(`Please enter a price for frame ${frameId}.`);
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
      // Check if a listing already exists for the website
      const { data: existingListing, error: fetchError } = await supabase
        .from("listings")
        .select("id, selected_frames")
        .eq("website", listingDetails.website)
        .eq("publisher_id", session.user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error("Error checking existing listing: " + fetchError.message);
      }

      if (existingListing) {
        // Listing exists, update it by merging the new frames
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
        const updatedListingId = existingListing.id;
        setCurrentListingId(updatedListingId);
        setListings((prev) =>
          prev.map((listing) =>
            listing.id === updatedListingId ? { ...listing, selected_frames: updatedFrames, category: listingDetails.category, title: listingDetails.title } : listing
          )
        );
        generateCode();
      } else {
        // No existing listing, create a new one
        const { data, error: insertError } = await supabase
          .from("listings")
          .insert([payload])
          .select();

        if (insertError) {
          throw new Error("Error creating listing: " + insertError.message);
        }
        setSaveMessage("Listing created successfully!");
        const newListingId = data[0].id;
        setCurrentListingId(newListingId);
        setListings((prev) => [...prev, data[0]]);
        generateCode();
      }

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
                  <div className="ml-7">
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
                    Object.keys(listing.selected_frames).map((key) => (
                      <span
                        key={key}
                        className="inline-block bg-gray-100 text-black px-2 py-1 rounded mr-2"
                      >
                        {listing.selected_frames[key].size} - $
                        {listing.selected_frames[key].pricePerClick || "N/A"} per click
                      </span>
                    ))}
                </div>
                <div className="mt-4">
                  <Link
                    to={`/modify-listing/${listing.id}`}
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



































