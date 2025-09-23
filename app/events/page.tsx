"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
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
import { SubscribersButton } from "@/components/SubscribersButton";
import { FeedbackButton } from "@/components/FeedbackButton";
import { MapPin, User, Calendar } from "lucide-react";

export default function EventsPage() {
  const { getCampusEvents, getEventsFeedback, user, getEventsSubscribers } =
    useAuth();
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
                    <Calendar className="w-4 h-4 mr-2" />
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
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}
                    </div>
                  )}
                  {event.nbr_subscribers && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="w-4 h-4 mr-2" />
                      {event.nbr_subscribers} / {event.max_people}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between mt-auto">
                  <SubscribersButton
                    isExpired={isExpired}
                    campus={campus}
                    eventId={event.id}
                    getEventsSubscribers={getEventsSubscribers}
                    eventName={event.name}
                    buttonClassName="flex items-center text-sm"
                  />
                  <FeedbackButton
                    isExpired={isExpired}
                    campus={campus}
                    eventId={event.id}
                    getEventsFeedback={getEventsFeedback}
                    eventName={event.name}
                    buttonClassName="flex items-center text-sm"
                  />
                  {!isExpired && (
                    <Button
                      variant="outline "
                      className="bg-white text-black"
                      size="sm"
                      onClick={() => handleSubscribe(event.id)}
                      disabled={true}
                    >
                      {event.is_subscribed ? "Unsubscribe" : "Subscribe"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
