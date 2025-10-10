"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star as StarIcon, Loader } from "lucide-react";

type FeedbackItem = {
  user: { login: string };
  comment: string;
  rating: number;
};

export function FeedbackButton({
  isExpired,
  campus,
  eventId,
  eventName,
  getEventsFeedback,
  buttonClassName,
}: {
  isExpired: boolean;
  campus: string | null | undefined;
  eventId: string | number;
  eventName: string;
  getEventsFeedback: (
    campus: string,
    eventId: string,
  ) => Promise<FeedbackItem[]>;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onOpen = async () => {
    if (!isExpired || !campus) return;
    setLoading(true);
    setError(null);
    setItems(null);
    setAvgRating(null);
    setOpen(true);

    try {
      const feedback = await getEventsFeedback(campus, String(eventId));
      if (feedback && feedback.length > 0) {
        const avg =
          feedback.reduce((sum, f) => sum + (f.rating ?? 0), 0) /
          feedback.length;
        setAvgRating(avg);
        setItems(feedback);
      } else {
        setItems([]);
      }
    } catch {
      setError("Error loading feedback for this event.");
    } finally {
      setLoading(false);
    }
  };

  if (!isExpired) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={buttonClassName ?? "flex items-center text-sm"}
        onClick={onOpen}
      >
        <StarIcon className="w-4 h-4 mr-2" />
        Feedbacks
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{eventName}</DialogTitle>
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
            <p className="text-sm">No feedback available for this event.</p>
          )}

          {!loading && !error && items && items.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">
                <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      className={`w-4 h-4 ${
                      star <= (avgRating || 0)
                        ? "fill-[#77767b] text-[#77767b]"
                        : "text-gray-300"
                      }`}
                    />
                    ))}
                  <span className="ml-2 font-semibold">
                    {avgRating?.toFixed(1)}/5
                  </span>
                </div>
              </div>

              <ScrollArea className="h-64 rounded border p-3">
                <ul className="space-y-3">
                  {items.map((f, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="font-medium flex justify-between items-center">
                        <span>{f.user.login}</span>
                        <span className="text-xs text-[#77767b]">
                          {f.rating}/5
                        </span>
                      </div>
                      <div className="text-muted-foreground whitespace-pre-line">
                        {f.comment}
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
