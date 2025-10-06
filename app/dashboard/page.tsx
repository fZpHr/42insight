"use client";

import { useSession, signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading session...</p>;
  }

  if (!session) {
    return <p>You are not signed in.</p>;
  }

  const user = session.user;
  console.log("User session data:", session);

  return (
      <div
      >
        {user?.image && (
          <img
            src={user.image}
            alt="Profile picture"
            style={{
              borderRadius: "50%",
              width: "80px",
              height: "80px",
              marginBottom: "1rem",
            }}
          />
        )}

        <p>
          <strong>Name:</strong> {user?.name}
        </p>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p>
          <strong>ID:</strong> {user?.id ?? "N/A"}
        </p>
        <p>
          <strong>Login:</strong> {user?.login ?? "N/A"}
        </p>
        <p>
          <strong>Campus:</strong> {user?.campus ?? "N/A"}
        </p>
        <p>
          <strong>Cursus:</strong> {user?.cursus ?? "N/A"}
        </p>
        <p>
          <strong>Correction Points:</strong> {user?.correction_point ?? "N/A"}
        </p>
        <p>
          <strong>Wallet:</strong> {user?.wallet ?? "N/A"}
        </p>
        <p>
          <strong>Level:</strong> {user?.level ?? "N/A"}
        </p>
        <p>
          <strong>Role</strong> {user?.role ?? "N/A"}
        </p>
      </div>
  );
}