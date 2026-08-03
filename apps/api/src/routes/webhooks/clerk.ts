import { prisma, type AppRole } from "@emplobo/db";
import {
  createClerkClient,
  type ClerkClient,
} from "@clerk/backend";
import { Router, type Request, type Response } from "express";
import { Webhook } from "svix";
import type { Env } from "../../env.js";
import { mapClerkOrgRole } from "../../types.js";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserPayload = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
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

function displayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  identifier?: string | null;
}): string {
  const full = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (full) return full.slice(0, 200);
  if (user.username) return user.username.slice(0, 200);
  if (user.identifier) return user.identifier.slice(0, 200);
  return "User";
}

function primaryEmail(user: ClerkUserPayload): string | null {
  const emails = user.email_addresses ?? [];
  const primary =
    emails.find((e) => e.id === user.primary_email_address_id) ?? emails[0];
  return primary?.email_address ?? null;
}

async function resolveMembershipEmail(
  clerk: ClerkClient,
  membership: ClerkMembershipPayload,
): Promise<{ email: string; name: string }> {
  const pud = membership.public_user_data;
  const name = displayName(pud ?? {});
  const identifier = pud?.identifier;

  if (identifier?.includes("@")) {
    return { email: identifier.slice(0, 320), name };
  }

  const userId = pud?.user_id;
  if (!userId) {
    return { email: "unknown@placeholder.local", name };
  }

  try {
    const user = await clerk.users.getUser(userId);
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "unknown@placeholder.local";
    const clerkName = displayName({
      first_name: user.firstName,
      last_name: user.lastName,
      username: user.username,
      identifier: email,
    });
    return { email: email.slice(0, 320), name: clerkName };
  } catch (err) {
    console.warn("[webhook/clerk] failed to fetch user for email", err);
    return { email: "unknown@placeholder.local", name };
  }
}

async function upsertUserFromMembership(
  clerk: ClerkClient,
  membership: ClerkMembershipPayload,
): Promise<void> {
  const userId = membership.public_user_data?.user_id;
  if (!userId) {
    console.warn("[webhook/clerk] membership missing public_user_data.user_id");
    return;
  }

  const orgId = membership.organization.id;
  const role: AppRole = mapClerkOrgRole(membership.role);
  const { email, name } = await resolveMembershipEmail(clerk, membership);

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      orgId,
      email,
      name,
      role,
    },
    update: {
      orgId,
      name,
      role,
      ...(email !== "unknown@placeholder.local" ? { email } : {}),
    },
  });
}

async function updateUserProfile(user: ClerkUserPayload): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (!existing) {
    // No org yet — User rows are created on organizationMembership.* events
    // because orgId is required on the model.
    return;
  }

  const email = primaryEmail(user) ?? existing.email;
  const name = displayName(user);

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
          const membership = evt.data as ClerkMembershipPayload;
          const userId = membership.public_user_data?.user_id;
          if (userId) {
            await prisma.user.deleteMany({
              where: { id: userId, orgId: membership.organization.id },
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
