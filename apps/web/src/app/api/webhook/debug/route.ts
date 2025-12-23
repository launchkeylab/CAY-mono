import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, validateWebhookUrl } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent webhook logs for this user's timers
    const recentLogs = await db.webhookLog.findMany({
      where: {
        timer: {
          userId: user.id
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        timer: {
          select: {
            id: true,
            status: true,
            webhookUrl: true,
            createdAt: true
          }
        }
      }
    });

    // Get webhook statistics
    const totalLogs = await db.webhookLog.count({
      where: {
        timer: {
          userId: user.id
        }
      }
    });

    const successfulLogs = await db.webhookLog.count({
      where: {
        timer: {
          userId: user.id
        },
        status: {
          gte: 200,
          lt: 300
        }
      }
    });

    const failedLogs = totalLogs - successfulLogs;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

    return NextResponse.json({
      statistics: {
        total: totalLogs,
        successful: successfulLogs,
        failed: failedLogs,
        successRate: Math.round(successRate * 10) / 10
      },
      recentLogs: recentLogs.map((log: any) => ({
        id: log.id,
        timerId: log.timerId,
        url: log.url,
        status: log.status,
        attempt: log.attempt,
        error: log.error,
        response: log.response?.substring(0, 200), // Truncate long responses
        createdAt: log.createdAt,
        timer: log.timer
      }))
    });

  } catch (error) {
    console.error("Webhook debug error:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook debug info" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { webhookUrl } = await req.json();

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "webhookUrl is required" },
        { status: 400 }
      );
    }

    // Validate webhook URL
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error,
        recommendations: [
          "Ensure the URL starts with 'http://' or 'https://'",
          "Check that the hostname is correct and accessible",
          "Use HTTPS for production environments"
        ]
      });
    }

    // Test webhook connectivity
    const testPayload = {
      timerId: "test-connection",
      userId: user.id,
      status: "TEST",
      message: "This is a connectivity test from CAY Safety Timer"
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CAY-Safety-Timer/1.0-Debug'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout for testing
      });

      const responseText = await response.text();

      return NextResponse.json({
        valid: true,
        connectivity: {
          reachable: true,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          response: responseText.substring(0, 500), // Limit response size
          responseTime: response.status // Approximate
        },
        recommendations: response.ok ? 
          ["Webhook URL is working correctly!"] :
          [
            `Server returned status ${response.status}`,
            "Check that your webhook endpoint accepts POST requests",
            "Verify your webhook returns a 2xx status code"
          ]
      });

    } catch (connectivityError: any) {
      return NextResponse.json({
        valid: true, // URL format is valid
        connectivity: {
          reachable: false,
          error: connectivityError.message,
          errorType: connectivityError.name
        },
        recommendations: [
          "Check that the webhook server is running",
          "Verify the URL is correct and accessible",
          "Check firewall/network settings",
          "Ensure the port is correct"
        ]
      });
    }

  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { error: "Failed to test webhook connectivity" },
      { status: 500 }
    );
  }
}