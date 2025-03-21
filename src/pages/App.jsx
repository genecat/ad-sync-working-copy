import React from "react";
import "../styles/index.css";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AuthForm from "./AuthForm";
import CreateListingFinal from "../components/CreateListingFinal";
import NewPublisherDashboard from "../components/NewPublisherDashboard";
import AdvertiserDashboard from "./AdvertiserDashboard";
import CreateCampaign from "./CreateCampaign";
import CampaignDashboard from "./CampaignDashboard";
import DashboardLayout from "./DashboardLayout";
import ModifyListing from "./ModifyListing";

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("");
  const [listingId, setListingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) fetchUserRole(session.user.id);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Error fetching user role:", error);
    } else if (data) {
      setRole(data.role);
      if (data.role === "publisher") fetchListingId(userId);
    }
  };

  const fetchListingId = async (userId) => {
    const { data, error } = await supabase
      .from("listings")
      .select("id")
      .eq("publisher_id", userId)
      .limit(1)
      .single();
    if (error) {
      console.error("Error fetching listing id:", error);
    } else if (data) {
      setListingId(data.id);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
    } else {
      setSession(null);
      setRole("");
      setListingId(null);
    }
  };

  const Navigation = () => (
    <nav className="bg-gray-800 p-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <div>
          {role === "publisher" && (
            <>
              <Link to="/publisher-dashboard" className="text-white mr-4">Publisher Dashboard</Link>
              <Link to="/create-listing-final" className="text-white mr-4">Create Listing</Link>
              {listingId ? (
                <Link to={`/modify-listing/${listingId}`} className="text-white">Modify Listing</Link>
              ) : (
                <span className="text-gray-500 mr-4">Modify Listing (No listings yet)</span>
              )}
            </>
          )}
          {role === "advertiser" && (
            <>
              <Link to="/advertiser-dashboard" className="text-white mr-4">Advertiser Dashboard</Link>
              <Link to="/create-campaign" className="text-white mr-4">Create Campaign</Link>
              <Link to="/campaigns" className="text-white">Campaign Dashboard</Link>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-3 py-2 rounded text-white"
        >
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <BrowserRouter>
      {session && <Navigation />}
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <div className="p-6 min-h-screen bg-white text-black">
                <h1 className="text-2xl mb-4 font-bold">Welcome to AdSync</h1>
                <p>Welcome, {session.user.email} (Role: {role || "unknown"})</p>
              </div>
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/create-listing-final"
          element={
            session && role === "publisher" ? (
              <CreateListingFinal session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/modify-listing/:listingId"
          element={
            session && role === "publisher" ? (
              <ModifyListing session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/publisher-dashboard"
          element={
            session && role === "publisher" ? (
              <NewPublisherDashboard session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/advertiser-dashboard"
          element={
            session && role === "advertiser" ? (
              <AdvertiserDashboard session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/create-campaign"
          element={
            session && role === "advertiser" ? (
              <CreateCampaign session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
        <Route
          path="/campaigns"
          element={
            session && role === "advertiser" ? (
              <CampaignDashboard session={session} />
            ) : (
              <AuthForm setSession={setSession} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;