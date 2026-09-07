"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { isKeyRequired } from "@/lib/api-client";

interface TanstackProviderProps {
    children: React.ReactNode;
}

export const TanstackProvider = ({children}: TanstackProviderProps) => {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        /**
                         * A missing key is a settled answer, not a hiccup.
                         *
                         * React Query retries a failed query three times by
                         * default, backing off 1s, 2s then 4s -- so a visitor
                         * with no key watched a spinner for the better part of
                         * ten seconds before the page got round to asking for
                         * one. Retrying could never have helped: the answer is
                         * the same every time.
                         */
                        retry: (failureCount, error) =>
                            !isKeyRequired(error) && failureCount < 2,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
