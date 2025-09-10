"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isAuthenticated } = useAuth()
  const router = useRouter();
  const [loading, startLoadingAnimation] = useTransition();

  useEffect(() => {
    const checkAuth = async () => {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          router.push('/dashboard');
        }
    };

    checkAuth();
  }, [isAuthenticated]);

  const handleLogin = async () => {
    startLoadingAnimation(async () => {
      document.body.style.cursor = 'wait';
      const loginUrl = new URL('https://api.intra.42.fr/oauth/authorize');
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
      if (!clientId) {
        throw new Error('NEXT_PUBLIC_CLIENT_ID is not defined');
      }
      loginUrl.searchParams.set('client_id', clientId);
      loginUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_REDIRECT_URI + '/api/auth');
      loginUrl.searchParams.set('response_type', 'code');
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = loginUrl.toString();
    });
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00BABC] to-[#0066CC] bg-clip-text text-transparent">
            42 Insight
          </h1>
          <p className="text-lg text-muted-foreground">
            <div className="relative inline-block group">
              <span className="hover:text-[#00BABC] transition-colors cursor-default">One for All</span>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="w-[480px] h-[269px] overflow-hidden rounded">
                  <iframe src="https://giphy.com/embed/57NztNfDPBz9BC2nAm" width="100%" height="100%" frameBorder="0" className="giphy-embed scale-110" allowFullScreen></iframe>
                </div>
              </div>
            </div> website for 42 Students
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 w-full">
          <Button
            onClick={handleLogin}
            className="w-full bg-[#00BABC] hover:bg-[#00A3A5] text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login with 42"
            )}
          </Button>
          <a href="https://github.com/fzphr/42insight/issues/new?title=[ISSUE]&body=Describe%20your%20issue%20here...&labels=issue"
            target="_blank" className="text-sm text-muted-foreground underline hover:text-foreground transition-colors">
            Report an issue
          </a>
        </div>
      </main>
    </div>
  );
}
