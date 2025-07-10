'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner"
import { Copy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Query() {
    const { user  } = useAuth();
    const [query, setQuery] = useState<string>('');
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const fetchRateLimit = async (): Promise<number> => {
        const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1];
        
        const response = await fetch(`/api/rate_limit`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Error getting the rate limit');
        }
        
        return response.json();
    };

    const { data: requestCount = 0, error: rateLimitError, refetch: refetchRateLimit } = useQuery({
        queryKey: ['rateLimit'],
        queryFn: fetchRateLimit,
        staleTime: 1000 * 60, // 1 minute
        retry: 3,
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'An error occurred', {
                duration: 2000,
                position: 'bottom-right',
            });
            console.error('Error getting the rate limit', error);
        }
    });

    const fetchQueryResults = async (query: string) => {
        try {
            if (requestCount >= 10 && !(user?.name === "bapasqui" || user?.name === "hbelle")) {
                toast.error('Rate limit exceeded', {
                    duration: 2000,
                    position: 'bottom-right',
                });
                return;
            }
            setIsLoading(true);
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];
            const response = await fetch(`/api/proxy/${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch query results');
            }
            const data = await response.json();
            setIsLoading(false);
            setResults(data);
            refetchRateLimit();
            return data;
        } catch (error) {
            setIsLoading(false)
            toast.error(error instanceof Error ? error.message : 'An error occurred', {
                duration: 2000,
                position: 'bottom-right',
            });
            console.error('Error fetching query results:', error);
            return [];
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                toast.success('Copied to clipboard!', {
                    duration: 2000,
                    position: 'bottom-right',
                });
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    }

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="space-y-6">

            <Card>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="query-input" className="text-sm font-medium">
                            API Endpoint
                        </label>
                        <div className="flex items-center">
                            <span className="bg-muted px-3 py-2 text-sm text-muted-foreground border border-r-0 rounded-l-md">
                                https://api.intra.42.fr/v2/
                            </span>
                            <Input
                                id="query-input"
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`users/${user?.name || 'username'}`}
                                className="flex-1 rounded-l-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && query.trim() && !isLoading) {
                                        fetchQueryResults(query);
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        See the{' '}
                        <a
                            href="https://api.intra.42.fr/apidoc"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                        >
                            API documentation
                        </a>{' '}
                        for available endpoints.
                    </p>
                    {!(user?.name === "bapasqui" || user?.name === "hbelle") && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Rate Limit</label>
                            <span className="text-sm text-muted-foreground">{requestCount}/10</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                                className="bg-gray-100 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(requestCount / 10) * 100}%` }}
                            />
                        </div>
                    </div>
                    )}
                    <Button
                        onClick={() => fetchQueryResults(query)}
                        className="w-full"
                        disabled={isLoading || !query.trim()}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Send'
                        )}
                    </Button>
                </CardContent>
            </Card>

            {results && (
                <Card>
                    <CardHeader>
                        <Button 
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(JSON.stringify(results, null, 2))}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                <CardContent>
                    <ScrollArea className="h-200 w-full">
                    <pre className="text-sm">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                    </ScrollArea>
                </CardContent>
                </Card>
            )}
            </div>
        </div>
    )

}