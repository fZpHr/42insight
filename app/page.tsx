"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        window.location.href = '/dashboard';
      }
    };

    checkAuth();
  }, [isAuthenticated]);


  const handleLogin = async () => {
    const loginUrl = new URL('https://api.intra.42.fr/oauth/authorize');
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
    if (!clientId) {
      throw new Error('NEXT_PUBLIC_CLIENT_ID is not defined');
    }
    loginUrl.searchParams.set('client_id', clientId);
    loginUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_REDIRECT_URI + '/api/auth');
    loginUrl.searchParams.set('response_type', 'code');
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false)
    window.location.href = loginUrl.toString();
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold text-center sm:text-left">
          Welcome to 42 Insight
        </h1>
        <Button
          onClick={handleLogin}
          className="w-full bg-[#00BABC] hover:bg-[#00A3A5] text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Login with 42'
          )}
        </Button>
      </main>
    </div>
  );
}
