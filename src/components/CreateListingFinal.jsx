import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";

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

  // State for creating a new listing
  const [listingDetails, setListingDetails] = useState({
    title: "",
    category: "",
    website: "",
  });
  const [selectedFrames, setSelectedFrames] = useState({});
  const [embedCode, setEmbedCode] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // State for displaying existing listings
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all listings for this publisher
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
        // Parse selected_frames if it's a string
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

  // Handle input change in the form
  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setListingDetails((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle frame selection; when selected, store the dimension and allow price
  const toggleFrame = (frameId) => {
    setSelectedFrames((prev) => {
      if (prev[frameId]) {
        const updated = { ...prev };
        delete updated[frameId];
        return updated;
      }
      const frameInfo = availableFrames.find((f) => f.id === frameId);
      return { ...prev, [frameId]: { size: frameInfo.size, pricePerClick: '' } };
    });
  };

  // Generate embed code based on selected frames
  const generateCode = () => {
    let code = "<!-- Ad Exchange Embed Code Start -->\n";
    Object.keys(selectedFrames).forEach((frameKey) => {
      const frameData = selectedFrames[frameKey];
      const size = frameData.size || "Unknown";
      const [width, height] = size.split("x");
      code += `<iframe src="http://localhost:3000/serve-ad/${listingId}?frame=${frameKey}" `;
      code += `width="${width}" height="${height}" style="border:none;" frameborder="0"></iframe>\n\n`;
    });
    code += "<!-- Ad Exchange Embed Code End -->";
    setEmbedCode(code);
  };

  // Save the new listing to the database
  const saveListing = async () => {
    if (!session) {
      setSaveMessage("You must be logged in to save a listing.");
      return;
    }
    const payload = {
      publisher_id: session.user.id,
      title: listingDetails.title,
      category: listingDetails.category,
      website: listingDetails.website,
      selected_frames: selectedFrames,
    };

    try {
      const { data, error } = await supabase.from("listings").insert([payload]);
      if (error) throw error;
      setSaveMessage("Listing created successfully!");
      console.log("New listing created:", data);
      // Clear the create listing form
      setListingDetails({ title: "", category: "", website: "" });
      setSelectedFrames({});
      // Add the new listing to the existing listings
      if (data && data[0]) {
        setListings((prev) => [...prev, data[0]]);
      }
    } catch (err) {
      console.error("Error creating listing:", err);
      setSaveMessage("Error creating listing: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-10 px-4 space-y-10">
      {/* Create Listing (Add) Form Section */}
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
              <div key={frame.id} className="flex items-center">
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
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button
            onClick={generateCode}
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

      {/* My Listings Section */}
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
                {console.log("Listing Data:", listing)}
                <div className="mt-2">
                  <strong>Ad Frame:</strong>{" "}
                  {listing.selected_frames &&
                    Object.keys(listing.selected_frames).map((key) => (
                      <span
                        key={key}
                        className="inline-block bg-gray-100 text-black px-2 py-1 rounded mr-2"
                      >
                        {listing.selected_frames[key].size}
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



































