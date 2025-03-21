import React, { useEffect, useState } from 'react';
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";

function DashboardLayout({ children, user, onLogout }) {
  const [role, setRole] = useState('');
  const [listingId, setListingId] = useState(null);

  useEffect(() => {
    const fetchRoleAndListing = async () => {
      if (!user) return;

      try {
        // Fetch the role from the 'profiles' table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching role in DashboardLayout:', profileError);
          return;
        }
        setRole(profile.role);

        // If the user is a publisher, fetch one listing ID
        if (profile.role === 'publisher') {
          const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('id')
            .eq('publisher_id', user.id)
            .limit(1)
            .single();

          if (listingError) {
            console.error('Error fetching listing in DashboardLayout:', listingError);
          } else if (listing) {
            setListingId(listing.id);
          }
        }
      } catch (err) {
        console.error('Unexpected error in DashboardLayout:', err);
      }
    };

    fetchRoleAndListing();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 text-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4 fixed top-0 left-0 bottom-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">LOGO</h1>
        </div>
        <nav>
          <ul>
            {role === "publisher" && (
              <>
                <li className="mb-4">
                  <Link to="/publisher-dashboard" className="hover:text-gray-300">
                    Publisher Dashboard
                  </Link>
                </li>
                <li className="mb-4">
                  <Link to="/create-listing-final" className="hover:text-gray-300">
                    Create Listing
                  </Link>
                </li>
                {listingId && (
                  <li className="mb-4 ml-4">
                    <Link to={`/modify-listing/${listingId}`} className="hover:text-gray-300">
                      Modify Listing
                    </Link>
                  </li>
                )}
              </>
            )}
            {role === "advertiser" && (
              <>
                <li className="mb-4">
                  <Link to="/advertiser-dashboard" className="hover:text-gray-300">
                    Advertiser Dashboard
                  </Link>
                </li>
                <li className="mb-4">
                  <Link to="/create-campaign" className="hover:text-gray-300">
                    Create Campaign
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 bg-white text-black">
        {/* Top Navigation */}
        <header className="bg-gray-200 p-4 fixed top-0 left-64 right-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">Dashboard</h2>
            <div>
              <span className="mr-4 text-black">Hello, {user?.email}</span>
              <button
                onClick={onLogout}
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mt-16 p-4 bg-white text-black">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;

