"use client";

import { useState } from "react";
import TimerForm from "@/components/TimerForm";
import ActiveTimer from "@/components/ActiveTimer";
import { auth0 } from "@/lib/auth0";
import LoginButton from "@/components/LoginButton";
import LogoutButton from "@/components/LogoutButton";
import Profile from "@/components/Profile";

export default async function HomePage() {
  const [activeTimer, setActiveTimer] = useState<{
    id: string;
    expiresAt: string;
  } | null>(null);

  const handleTimerStart = async (
    duration: number,
    emails: string[],
    names: string[]
  ) => {
    try {
      const response = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration,
          notifyEmails: emails,
          notifyNames: names,
        }),
      });

      if (response.ok) {
        const timer = await response.json();
        setActiveTimer({
          id: timer.id,
          expiresAt: timer.expiresAt,
        });
      }
    } catch (error) {
      console.error("Failed to start timer:", error);
    }
  };

  const handleCheckIn = async () => {
    if (!activeTimer) return;

    try {
      const response = await fetch(`/api/timers/${activeTimer.id}/checkin`, {
        method: "POST",
      });

      if (response.ok) {
        setActiveTimer(null);
      }
    } catch (error) {
      console.error("Failed to check in:", error);
    }
  };

  const handleCancel = async () => {
    if (!activeTimer) return;

    try {
      const response = await fetch(`/api/timers/${activeTimer.id}/cancel`, {
        method: "POST",
      });

      if (response.ok) {
        setActiveTimer(null);
      }
    } catch (error) {
      console.error("Failed to cancel timer:", error);
    }
  };

  const session = await auth0.getSession();
  const user = session?.user;
  console.log("User session:", session);
  console.log("User info:", user);

  return (
    <div>
      <div className="action-card">
        {user ? (
          <div className="logged-in-section">
            <div className="app-container">
              <div className="main-card-wrapper">
                <h1 className="main-title">Next.js + Auth0</h1>
              </div>
            </div>
            <p className="logged-in-message">✅ Successfully logged in!</p>
            {/* <Profile /> */}
            <div className="profile-card action-card">
              <img
                src={
                  user.picture ||
                  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2363b3ed'/%3E%3Cpath d='M50 45c7.5 0 13.64-6.14 13.64-13.64S57.5 17.72 50 17.72s-13.64 6.14-13.64 13.64S42.5 45 50 45zm0 6.82c-9.09 0-27.28 4.56-27.28 13.64v3.41c0 1.88 1.53 3.41 3.41 3.41h47.74c1.88 0 3.41-1.53 3.41-3.41v-3.41c0-9.08-18.19-13.64-27.28-13.64z' fill='%23fff'/%3E%3C/svg%3E`
                }
                alt={user.name || "User profile"}
                className="profile-picture"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2363b3ed'/%3E%3Cpath d='M50 45c7.5 0 13.64-6.14 13.64-13.64S57.5 17.72 50 17.72s-13.64 6.14-13.64 13.64S42.5 45 50 45zm0 6.82c-9.09 0-27.28 4.56-27.28 13.64v3.41c0 1.88 1.53 3.41 3.41 3.41h47.74c1.88 0 3.41-1.53 3.41-3.41v-3.41c0-9.08-18.19-13.64-27.28-13.64z' fill='%23fff'/%3E%3C/svg%3E`;
                }}
              />
              <h2 className="profile-name">{user.name}</h2>
              <p className="profile-email">{user.email}</p>
            </div>
            <LogoutButton />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg">
                <h1 className="text-3xl font-bold text-center mb-8">
                  CAY Safety Timer
                </h1>

                {activeTimer ? (
                  <ActiveTimer
                    timerId={activeTimer.id}
                    expiresAt={activeTimer.expiresAt}
                    onCheckIn={handleCheckIn}
                    onCancel={handleCancel}
                  />
                ) : (
                  <TimerForm onTimerStart={handleTimerStart} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="action-text">
              Welcome! Please log in to access your protected content.
            </p>
            <LoginButton />
          </>
        )}
      </div>
    </div>
  );
}
