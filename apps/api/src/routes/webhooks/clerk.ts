import { prisma } from "@emplobo/db";
import {
  createClerkClient,
  type ClerkClient,
} from "@clerk/backend";
import { Router, type Request, type Response } from "express";
import { Webhook } from "svix";
import type { Env } from "../../env.js";
import {
  displayName,
  normalizeMember,
  upsertUserFromMembership,
} from "../../lib/membership.js";

type ClerkUserPayload = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{
    id: string;
    email_address: string;
  }>;
};

type ClerkMembershipPayload = {
  id: string;
  role: string;
  organization: { id: string; name?: string };
  public_user_data?: {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    identifier?: string | null;
  };
};

function primaryEmail(user: ClerkUserPayload): string | null {
  const emails = user.email_addresses ?? [];
  const primary =
    emails.find((e) => e.id === user.primary_email_address_id) ?? emails[0];
  return primary?.email_address ?? null;
}

async function updateUserProfile(user: ClerkUserPayload): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (!existing) {
    // No org yet — User rows are created on organizationMembership.* events
    // because orgId is required on the model.
    return;
  }

  const email = primaryEmail(user) ?? existing.email;
  const name = displayName({
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    identifier: email,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: email.slice(0, 320),
      name: name.slice(0, 200),
    },
  });
}

export function createClerkWebhookRouter(env: Env) {
  const router = Router();
  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });

  // Mounted at /webhooks/clerk with express.raw — path here is "/".
  router.post("/", async (req: Request, res: Response) => {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

    const svixId = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];

    if (
      typeof svixId !== "string" ||
      typeof svixTimestamp !== "string" ||
      typeof svixSignature !== "string"
    ) {
      res.status(400).json({ error: "missing svix headers" });
      return;
    }

    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    let evt: { type: string; data: unknown };
    try {
      evt = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as { type: string; data: unknown };
    } catch (err) {
      console.error("[webhook/clerk] signature verification failed", err);
      res.status(400).json({ error: "invalid signature" });
      return;
    }

    try {
      switch (evt.type) {
        case "user.created":
        case "user.updated": {
          await updateUserProfile(evt.data as ClerkUserPayload);
          break;
        }
        case "organizationMembership.created":
        case "organizationMembership.updated": {
          await upsertUserFromMembership(
            clerk,
            evt.data as ClerkMembershipPayload,
          );
          break;
        }
        case "organizationMembership.deleted": {
          const membership = normalizeMember(
            evt.data as ClerkMembershipPayload,
          );
          if (membership.userId && membership.orgId) {
            await prisma.user.deleteMany({
              where: { id: membership.userId, orgId: membership.orgId },
            });
          }
          break;
        }
        default:
          break;
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[webhook/clerk] handler error", err);
      res.status(500).json({ error: "webhook handler failed" });
    }
  });

  return router;
}

export type { ClerkClient };
