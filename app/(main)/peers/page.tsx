"use client";
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Spinner } from "@/components/ui/spinner";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { Search, TriangleAlert, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Project } from "@/types";
import { PROJECT_ORDER } from "@/lib/forty-two/peer-projects";
import { useSession } from 'next-auth/react';
import { TransparentBadge } from '@/components/TransparentBadge';
import { useCampus } from "@/contexts/CampusContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { fetchJson } from "@/lib/api-client";

async function fetchPeersData(campus?: string) {
    const query = campus ? `?campus=${encodeURIComponent(campus)}` : "";
    return fetchJson<Project[]>(`/api/peers${query}`);
}





export default function PeersPage() {
    const { data: session, status } = useSession();
    const user = session?.user;
    const { selectedCampus } = useCampus();
    const effectiveCampus = selectedCampus || user?.campus;
    const [showTimeoutError, setShowTimeoutError] = React.useState(false);


    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowTimeoutError(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [effectiveCampus]);
    
    const { data, error, isLoading, isSuccess, isFetching } = useQuery<Project[]>({
        queryKey: ['peersData', effectiveCampus],
        queryFn: () => fetchPeersData(effectiveCampus),
        staleTime: 30 * 60 * 1000,
        refetchOnMount: 'always',
    });


    // Keep the loading screen for as long as the request is actually running.
    // The timeout used to dismiss it at 15s while the fetch was still going,
    // so a slow campus rendered "No Peers found" over data that then arrived.
    if ((isLoading || isFetching) && !isSuccess) {
        return <LoadingScreen message="Loading peers..." />;
    }


    function formatDate(isoString: string) {
        const d = new Date(isoString);

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        const hour = String(d.getHours()).padStart(2, "0");
        const minute = String(d.getMinutes()).padStart(2, "0");

        return `${day}/${month}/${year} - ${hour}:${minute}`;
    }

    const filteredProjects = data?.map((project) => {
        let filteredSubscribers = project.subscribers;
        filteredSubscribers = project.subscribers?.filter(sub =>
            effectiveCampus ? sub.campus?.toLowerCase() === effectiveCampus.toLowerCase() : true
        );
        return {
            ...project,
            subscribers: filteredSubscribers?.slice().sort((a, b) =>
                (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
            ),
        };
    })?.filter(project => project.subscribers && project.subscribers.length > 0) ?? [];

    const sortedProjects = filteredProjects?.slice().sort((a, b) => {
        const orderA = Object.values(PROJECT_ORDER).indexOf(a.id);
        const orderB = Object.values(PROJECT_ORDER).indexOf(b.id);

        if (orderA !== -1 && orderB !== -1) {
            return orderA - orderB;
        }
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        return 0;
    });

    // Every row here is "in_progress", so printing that said nothing. How long
    // it has been open does: 42 keeps a registration open until it is closed,
    // and a project untouched for months is not someone to go and pair with.
    const sinceLabel = (updatedAt: string | null) => {
        if (!updatedAt) return "in progress";
        const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
        if (days <= 0) return "started today";
        if (days === 1) return "started yesterday";
        if (days < 31) return `started ${days} days ago`;
        const months = Math.round(days / 30);
        return `started ${months} month${months > 1 ? "s" : ""} ago`;
    };

    const handleLoginClick = (login: string) => {
        window.open(`https://profile.intra.42.fr/users/${login}`, '_blank');
    };

    if (error || !sortedProjects || sortedProjects.length === 0) {
        return <div className="flex items-center justify-center h-full w-full">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <TriangleAlert />
                    </EmptyMedia>
                    <EmptyTitle>No Peers found</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                    <Button variant="outline" size="sm">
                        Refresh
                    </Button>
                </EmptyContent>
            </Empty>
        </div>;
    }

    return (
        <div className="container mx-auto px-2 py-6">
            {/* Message d'erreur après timeout */}
            {showTimeoutError && (!isSuccess || !data || data.length === 0) && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>42 API Issue</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            The 42 API is taking longer than expected to respond. Please wait
                            a moment and refresh the page.
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="ml-4 shrink-0"
                        >
                            Refresh
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
            
            <div className="flex items-center justify-between mb-6">
                <p className="text-xl font-bold">
                    {sortedProjects.reduce((acc, project) => acc + project.subscribers.length, 0)} students
                </p>
                <p className="text-sm text-muted-foreground">
                    Last Updated:{" "}
                    {sortedProjects && sortedProjects.length > 0
                        ? formatDate(sortedProjects[0].updatedAt)
                        : "N/A"}
                </p>
            </div>
            {/* <div className="gap-6 mb-5">
                {session?.user?.campus !== 'Angouleme' &&  session?.user.campus !== "Nice" && (
                    <TransparentBadge
                        text="⚠️ Only available for Angouleme campus for now"
                        bgColor="bg-red-400/20"
                        textColor="text-red-300"
                    />
                )}
            </div> */}
            {/* load all people that dont have groups for your current project and make a tinder like choice to send a dm or a mail to the chosen group user */}
            {sortedProjects?.map((project) => {
                const nonValidatedSubscribers = project.subscribers;
                return (
                    <Card key={project.id} className="mb-6 p-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={`project-${project.id}`}>
                                <AccordionTrigger className="text-2xl font-semibold flex items-center gap-2">
                                    <div className="flex items-center gap-3 text-left">
                                        <span className="truncate">{project.name}</span>
                                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/70">
                                            {nonValidatedSubscribers.length == 1 ? "1 subscriber" : `${nonValidatedSubscribers.length} subscribers`}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4">
                                        <div className="flex gap-4 overflow-x-auto no-scrollbar">
                                            {nonValidatedSubscribers.map((subscriber) => (
                                                <div
                                                    key={subscriber.userId}
                                                    className="flex-shrink-0 flex flex-col items-center space-y-2 gap-2 pb-4"
                                                >
                                                    <img
                                                        className="h-20 w-20 rounded-lg object-cover"
                                                        src={subscriber.photoUrl || undefined}
                                                        alt={subscriber.login}
                                                    />
                                                    <div className="flex flex-col items-center text-center">
                                                        <span
                                                            className="text-lg font-medium cursor-pointer hover:underline transition-colors"
                                                            onClick={() => handleLoginClick(subscriber.login)}
                                                        >
                                                            {subscriber.login}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground mt-1">
                                                            {sinceLabel(subscriber.updatedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                );
            })}
        </div>
    );
}