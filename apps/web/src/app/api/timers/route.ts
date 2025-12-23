import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, validateWebhookUrl } from "@/lib/auth";

import { Queue } from "bullmq";
import Redis from "ioredis";
import { db } from "@/lib/db";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  }
);

const timerQueue = new Queue("timers", { connection });

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user's active timer
    const activeTimer = await db.timer.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(activeTimer);
  } catch (error) {
    console.error("Timer fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch timer" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has an active timer
    const existingActiveTimer = await db.timer.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE"
      }
    });

    if (existingActiveTimer) {
      return NextResponse.json(
        { error: "You already have an active timer. Please check in or cancel it first." },
        { status: 400 }
      );
    }

    const {
      duration,
      notifyEmails,
      notifyNames,
      webhookUrl = "localhost:3000/api/webhook",
      latitude,
      longitude,
      accuracy,
    } = await request.json();

    if (!duration || !notifyEmails?.length || !notifyNames?.length) {
      return NextResponse.json(
        { error: "Duration, emails, and names are required" },
        { status: 400 }
      );
    }

    // // TODO Validate webhook URL if provided
    // if (webhookUrl && !validateWebhookUrl(webhookUrl)) {
    //   return NextResponse.json(
    //     { error: "Invalid webhook URL. Must use HTTPS (except localhost)" },
    //     { status: 400 }
    //   );
    // }

    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    // Create timer in database
    const timer = await db.timer.create({
      data: {
        userId: user.id,
        duration,
        expiresAt,
        notifyEmails,
        notifyNames,
        webhookUrl,
        latitude,
        longitude,
        accuracy,
        status: "ACTIVE",
      },
    });

    // Schedule job for when timer expires
    await timerQueue.add(
      "timer-expired",
      { timerId: timer.id },
      {
        delay: duration * 60 * 1000, // Convert minutes to milliseconds
        jobId: timer.id, // Use timer ID as job ID for easy cancellation
      }
    );

    return NextResponse.json(timer);
  } catch (error) {
    console.error("Timer creation error:", error);
    return NextResponse.json(
      { error: "Failed to create timer" },
      { status: 500 }
    );
  }
}
