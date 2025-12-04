"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Star } from "lucide-react";
import { TransparentBadge } from "@/components/TransparentBadge";
import { Bug, Activity } from "lucide-react";
import { signIn } from "next-auth/react";


export default function Home() {
  const [loader, setLoader] = useState(false);

  const handleLogin = async () => {
    setLoader(true);
    document.body.style.cursor = "wait";
    await new Promise((resolve) => setTimeout(resolve, 100));
    signIn("42-school", { callbackUrl: `${window.location.origin}/dashboard` });
  };

  return (
    <div className="relative">
      <div className="grid min-h-dvh grid-rows-[20px_1fr_auto] items-center justify-items-center p-8 pb-12 gap-12 sm:p-20 sm:pb-20 sm:gap-16 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-5xl font-bold text-white bg-clip-text p-1">
              42 Insight
            </h1>
            <div className="text-lg text-muted-foreground">
              <TransparentBadge
                text="🌐 One for All"
                bgColor="bg-blue-400/20"
                textColor="text-blue-300"
              />
              <span> website for 42 Students</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 w-full">
            <Button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-gray-100 text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
              disabled={loader}
            >
              {loader ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login with 42 Intra"
              )}
            </Button>
            <div className="flex gap-4">
              <a
                href="https://github.com/fzphr/42insight"
                target="_blank"
                className="text-sm text-muted-foreground underline hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                Star the repository
              </a>
              <a
                href="https://github.com/fzphr/42insight/issues/new?title=[ISSUE]&body=Describe%20your%20issue%20here...&labels=issue"
                target="_blank"
                className="text-sm text-muted-foreground underline hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Bug className="h-3 w-3 text-red-400" />
                Report an issue
              </a>
              <a
                href="https://monitor.bapasqui.duckdns.org/status/42insight"
                target="_blank"
                className="text-sm text-muted-foreground underline hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Activity className="h-3 w-3 text-green-400" />
                Service Status
              </a>
            </div>
          </div>

        </main>

        <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
          <p className="text-xs text-muted-foreground">
            Created by{" "}
            <a
              href="https://github.com/fZpHr"
              target="_blank"
              className="underline hover:text-foreground transition-colors"
            >
              Zeph
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/Haletran"
              target="_blank"
              className="underline hover:text-foreground transition-colors"
            >
              Haletran
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
