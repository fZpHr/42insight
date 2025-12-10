"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coalition } from "@/types";
import { Shield } from "lucide-react";

interface CoalitionInfoProps {
  login: string;
}

export function CoalitionInfo({ login }: CoalitionInfoProps) {
  const { data: coalitions, isLoading } = useQuery<Coalition[]>({
    queryKey: ["coalition", login],
    queryFn: async () => {
      const response = await fetch(`/api/users/${login}/coalitions`);
      if (!response.ok) {
        throw new Error("Failed to fetch coalition");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) {
    return (
      <Card className="w-full md:w-[200px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Coalition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 md:h-16 w-12 md:w-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 md:h-5 w-24 md:w-32" />
              <Skeleton className="h-3 md:h-4 w-20 md:w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  
  const coalition = coalitions?.[0];


  if (!coalition) {
    return null;
  }

  return (
    <Card
      className="w-full md:w-[200px] h-full relative overflow-hidden"
      style={{
        borderColor: coalition.color,
        borderWidth: '2px',
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url(${coalition.cover_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <CardContent className="relative p-4 md:p-6">
        <div className="flex flex-col items-center justify-center gap-2 md:gap-4 text-center">
          <div
            className="h-12 w-12 md:h-20 md:w-20 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: coalition.color }}
          >
            {coalition.image_url ? (
              <img
                src={coalition.image_url}
                alt={coalition.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <Shield className="h-6 w-6 md:h-10 md:w-10 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-base md:text-xl font-bold">{coalition.name}</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Score: <span className="font-semibold">{coalition.score.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
