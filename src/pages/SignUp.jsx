import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Step 1: Sign up the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Step 2: If sign-up is successful, insert the username into the profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id, // Match the user ID from Supabase Auth
            email: data.user.email,
            username: username,
            role: "publisher", // Default role; you can change this later
          },
        ]);

      if (profileError) {
        setError("Error creating profile: " + profileError.message);
        setLoading(false);
        return;
      }

      // Step 3: Redirect to the sign-in page after successful sign-up
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-black">Sign Up</h2>
          <form onSubmit={handleSignUp}>
            <div className="mb-4">
              <label className="block text-black font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border p-2 rounded bg-gray-100 text-black placeholder-gray-500"
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-black font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border p-2 rounded bg-gray-100 text-black placeholder-gray-500"
                placeholder="Choose a username"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-black font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-2 rounded bg-gray-100 text-black placeholder-gray-500"
                placeholder="Enter your password"
                required
              />
            </div>
            {error && (
              <div className="mb-4 text-red-500">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/" className="underline text-blue-600">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;