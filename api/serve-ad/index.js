export default async function handler(req, res) {
    const { query } = req;
    const { listingId, frameId } = query;
  
    if (!listingId || !frameId) {
      return res.status(400).json({ error: "Missing listingId or frameId" });
    }
  
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
  
      const { data, error } = await supabase
        .from("campaigns")
        .select("status")
        .eq("listing_id", listingId)
        .eq("frame", frameId)
        .single();
  
      if (error) {
        console.error("Supabase error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
      }
  
      const isActive = data?.status === "approved";
      return res.status(200).json({ isActive });
    } catch (err) {
      console.error("Unexpected error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  