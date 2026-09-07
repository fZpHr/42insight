"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";

/**
 * Shown in place of a page whose data needs a key the visitor has not set.
 */
export function ApiKeyGate({ what = "this page" }: { what?: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-xl mx-auto">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-muted p-3 w-fit">
            <KeyRound className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="mt-3">Your 42 API key is needed</CardTitle>
          <CardDescription>
            {what} is read live from the 42 API. Connect your own key so your
            browsing runs on your own quota — the site key is reserved for
            signing in, and sharing it would eventually lock people out of
            logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <KeyRound className="h-4 w-4" />
            Connect my key
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Takes a minute: intra → Settings → API → Register a new app.
          </p>
        </CardContent>
      </Card>

      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
