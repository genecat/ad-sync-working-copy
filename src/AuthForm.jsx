import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";

const AuthForm = ({ setSession }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      setSession(data.session);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-black">Sign In</h2>
          <form onSubmit={handleSignIn}>
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/signup" className="underline text-blue-600">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;

