"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { TransparentBadge } from "@/components/TransparentBadge";

export default function EventsPage() {
  const { getCampusEvents, user } = useAuth();
  const campus = user?.campus;
  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["events", campus],
    queryFn: () => getCampusEvents(campus!),
    staleTime: 10 * 60 * 1000,
    enabled: !!campus,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 mb-2" />
                <Skeleton className="h-4 mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                <div className="flex items-center">
                  <Skeleton className="w-4 h-4 mr-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="w-4 h-4 mr-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="w-4 h-4 mr-2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  if (error) return <div>Error loading events</div>;

  return (
    <div className="container mx-auto px-2 py-6">
      <div className="pb-4">
        <TransparentBadge
          text="⚠️ Subscribing is not available yet"
          bgColor="bg-red-500/20"
          textColor="text-red-400"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No events found for your campus.
          </div>
        ) : (
          events.map((event: Event) => {
            const isExpired = new Date(event.end_at) < new Date();
            return (
              <Card
                key={event.id}
                className={`hover:shadow-lg transition-shadow duration-200 flex flex-col ${
                  isExpired ? "opacity-50 grayscale" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle className="line-clamp-2">{event.name}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 0 002 2z"
                      />
                    </svg>
                    {new Date(event.begin_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {event.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {event.location}
                    </div>
                  )}
                  {event.nbr_subscribers && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {event.nbr_subscribers} / {event.max_people}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between mt-auto">
                  <Button
                    variant="outline "
                    className="bg-white text-black"
                    size="sm"
                    onClick={() => handleSubscribe(event.id)}
                    disabled={true}
                  >
                    {event.is_subscribed ? "Unsubscribe" : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>>
    </div>
  );
}
