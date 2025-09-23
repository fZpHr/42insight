"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SubscriberItem } from "@/types/index";
import { Loader } from "lucide-react";

export function SubscribersButton({
  isExpired,
  campus,
  eventId,
  eventName,
  getEventsSubscribers,
  buttonClassName,
}: {
  isExpired: boolean;
  campus: string | null | undefined;
  eventId: string | number;
  eventName: string;
  getEventsSubscribers: (
    campus: string,
    eventId: string,
  ) => Promise<SubscriberItem[]>;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SubscriberItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onOpen = async () => {
    if (!campus) return;
    setLoading(true);
    setError(null);
    setItems(null);
    setOpen(true);

    try {
      const subscribers = await getEventsSubscribers(campus, String(eventId));
      setItems(subscribers || []);
    } catch {
      setError("Error loading subscribers for this event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={buttonClassName ?? "flex items-center text-sm w-full"}
        onClick={onOpen}
      >
        View Subscribers
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscribers</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && items && items.length === 0 && (
            <p className="text-sm">No subscribers for this event.</p>
          )}

          {!loading && !error && items && items.length > 0 && (
            <div className="space-y-3">
              <ScrollArea className="h-64 rounded border p-3">
                <ul className="space-y-3">
                  {items.map((subscriber) => (
                    <li key={subscriber.id} className="text-sm">
                      <div className="flex items-center space-x-3 ">
                        <img
                          src={subscriber.user.image.versions.medium}
                          alt={subscriber.user.displayname}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {subscriber.user.displayname}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{subscriber.user.login}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
