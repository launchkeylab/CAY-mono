import { NextRequest, NextResponse } from "next/server";

import { time } from "console";

export async function POST(req: NextRequest) {
  try {
    // Process the webhook payload
    const payload = await req.json();
    console.log("Webhook received:", payload);

    // TODO extract timer info from payload and handle accordingly
    // Send a response to acknowledge receipt of the webhook
    return NextResponse.json({ message: "Webhook received successfully" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
