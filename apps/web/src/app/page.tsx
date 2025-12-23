import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims) {
    redirect("/protected/timer");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-8">CAY Safety Timer</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access the safety timer feature.
          </p>
          
          <div className="space-y-3">
            <Link 
              href="/auth/login"
              className="block w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/sign-up"
              className="block w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}