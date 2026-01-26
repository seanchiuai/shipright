import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: { type: string; data: Record<string, unknown> };

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as { type: string; data: Record<string, unknown> };
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data as {
          id: string;
          email_addresses: { email_address: string }[];
          first_name?: string;
          last_name?: string;
          image_url?: string;
        };

      const email = email_addresses[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ");

      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkUserId: id,
        email: email || "",
        name: name || undefined,
        image: image_url,
      });
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data as { id: string };
      await ctx.runMutation(internal.users.deleteByClerkId, {
        clerkUserId: id,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
