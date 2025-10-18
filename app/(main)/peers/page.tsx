"use client";
import React from 'react';
import { useQuery } from "@tanstack/react-query";

async function fetchPeersData() {
    try {
        const response = await fetch('/api/peers');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching peers data:', error);
        throw error;
    }
}


export default function PeersPage() {

    const { data, error, isLoading } = useQuery({
        queryKey: ['peersData'],
        queryFn: fetchPeersData,
    });

    if (isLoading) {
        return <div className="container mx-auto p-6">Loading...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-6">Error loading peers data.</div>;
    }


    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Peers</h1>
            <div className="bg-white rounded-lg shadow p-6">
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    );
}