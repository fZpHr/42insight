"use client";

import UserRelationGraph from "@/components/UserGraph";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

async function fetchRelationData(login: string) {
  try {
    // /scale_teams?page=1&per_page=100&filter[campus_id]=31,41&filter[user_id]=166905
    const response = await fetch(`/api/users/${login}/relation`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    if (data.relation && typeof data.relation === "string") {
      return JSON.parse(data.relation);
    }

    return data.relation || {};
  } catch (error) {
    console.error("Failed to fetch relation data:", error);
    return {};
  }
}

export default function Home() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const {
    data: relationData = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: ["relations", user?.login],
    queryFn: () => fetchRelationData("bapasqui"),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    <main style={{ padding: "20px" }}>
      <UserRelationGraph data={relationData} centerUser="you" />
    </main>
  );
}