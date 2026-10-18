import { NextRequest } from "next/server";
import { isPasswordValid } from "@/lib/admin-auth";
import {
  generateBotCommunity,
  type BotGenerationConfig,
} from "@/lib/bot-generator";

export const maxDuration = 120; // Support extended generation duration on Next.js/Vercel

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      password,
      botCount = 10,
      postCount = 5,
      commentCount = 15,
      nestedRatio = 0.4,
      simulateVotes = true,
    } = body;

    if (!isPasswordValid(password)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid admin credentials." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const config: BotGenerationConfig = {
      botCount: Number(botCount) || 10,
      postCount: Number(postCount) || 5,
      commentCount: Number(commentCount) || 15,
      nestedRatio: Number(nestedRatio) ?? 0.4,
      simulateVotes: Boolean(simulateVotes),
    };

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (data: Record<string, unknown>) => {
      try {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        await writer.write(encoder.encode(payload));
      } catch {
        // Stream may have closed on client disconnect
      }
    };

    // Execute generation in background while streaming
    (async () => {
      try {
        const result = await generateBotCommunity(config, async (event) => {
          await sendEvent({
            type: "progress",
            step: event.step,
            totalSteps: event.totalSteps,
            message: event.message,
          });
        });

        await sendEvent({
          type: "complete",
          summary: result,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during generation.";
        await sendEvent({
          type: "error",
          error: message,
        });
      } finally {
        try {
          await writer.close();
        } catch {
          // Already closed
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid request payload.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
