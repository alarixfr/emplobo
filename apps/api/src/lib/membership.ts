import { prisma, type AppRole } from "@emplobo/db";
import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { Env } from "../env.js";
import { mapClerkOrgRole } from "../types.js";

/**
 * Shared Clerk-membership → local User sync helpers.
 *
 * The local `User` table is a read-mostly mirror of Clerk organizations.
 * It is written by the svix webhook, but webhooks only fire for NEW events —
 * members who joined before the webhook was configured never appear. This
 * module also powers on-demand sync (admin endpoints that list users) so the
 * directory, dashboard counts, and assignment panels are always correct.
 */

type MemberLike = {
  role?: string | null;
  organization?: { id?: string | null; name?: string | null };
  // Clerk SDK shape (camelCase)
  publicUserData?: {
    userId?: string | null;
    identifier?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  // Clerk webhook payload shape (snake_case)
  public_user_data?: {
    user_id?: string | null;
    identifier?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

type NormalizedMember = {
  userId: string | null;
  orgId: string | null;
  role: string;
  identifier: string | null;
  firstName: string | null;
  lastName: string | null;
};

export function normalizeMember(m: MemberLike): NormalizedMember {
  // Both the Clerk SDK (camelCase) and webhook (snake_case) shapes are
  // accepted; flatten through a loose record so either key set works.
  const pud = (m.publicUserData ?? m.public_user_data) as
    | {
        userId?: string | null;
        user_id?: string | null;
        identifier?: string | null;
        firstName?: string | null;
        first_name?: string | null;
        lastName?: string | null;
        last_name?: string | null;
      }
    | null
    | undefined;
  return {
    userId: pud?.userId ?? pud?.user_id ?? null,
    orgId: m.organization?.id ?? null,
    role: m.role ?? "org:member",
    identifier: pud?.identifier ?? null,
    firstName: pud?.firstName ?? pud?.first_name ?? null,
    lastName: pud?.lastName ?? pud?.last_name ?? null,
  };
}

export function displayName(member: {
  firstName?: string | null;
  lastName?: string | null;
  identifier?: string | null;
  username?: string | null;
}): string {
  const full = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  if (full) return full.slice(0, 200);
  if (member.username) return member.username.slice(0, 200);
  if (member.identifier) return member.identifier.slice(0, 200);
  return "User";
}

const PLACEHOLDER_EMAIL = "unknown@placeholder.local";

async function resolveMemberEmail(
  clerk: ClerkClient,
  member: NormalizedMember,
): Promise<string> {
  const identifier = member.identifier;
  if (identifier && identifier.includes("@")) {
    return identifier.slice(0, 320);
  }
  if (!member.userId) return PLACEHOLDER_EMAIL;
  try {
    const user = await clerk.users.getUser(member.userId);
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      PLACEHOLDER_EMAIL;
    return email.slice(0, 320);
  } catch (err) {
    console.warn("[membership] failed to fetch user email", err);
    return PLACEHOLDER_EMAIL;
  }
}

/** Upsert one Clerk membership into the local User mirror. */
export async function upsertUserFromMembership(
  clerk: ClerkClient,
  membership: MemberLike,
): Promise<void> {
  const member = normalizeMember(membership);
  if (!member.userId || !member.orgId) {
    console.warn("[membership] membership missing user_id or org id");
    return;
  }

  const role: AppRole = mapClerkOrgRole(member.role);
  const name = displayName({
    firstName: member.firstName,
    lastName: member.lastName,
    identifier: member.identifier,
  });
  const email = await resolveMemberEmail(clerk, member);

  await prisma.user.upsert({
    where: { id: member.userId },
    create: {
      id: member.userId,
      orgId: member.orgId,
      email,
      name,
      role,
    },
    update: {
      orgId: member.orgId,
      name,
      role,
      ...(email !== PLACEHOLDER_EMAIL ? { email } : {}),
    },
  });
}

/** Pull every member of an org from Clerk into the local User table. */
export async function syncOrgMembers(
  clerk: ClerkClient,
  orgId: string,
): Promise<number> {
  const result = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });
  const memberships = result.data ?? [];
  for (const membership of memberships) {
    await upsertUserFromMembership(clerk, membership as MemberLike);
  }
  return memberships.length;
}

export function createClerk(env: Env): ClerkClient {
  return createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
}

// In-memory cooldown so admin endpoints that list users don't hammer Clerk's
// API on every page load (a real sync runs at most once a minute per org).
const SYNC_COOLDOWN_MS = 60_000;
const lastSyncByOrg = new Map<string, number>();

/**
 * Best-effort on-demand member sync with a 60s per-org cooldown. Never
 * throws into the request path — a sync failure must not break the page.
 */
export async function syncOrgMembersIfStale(
  env: Env,
  orgId: string,
): Promise<void> {
  const now = Date.now();
  const last = lastSyncByOrg.get(orgId);
  if (last !== undefined && now - last < SYNC_COOLDOWN_MS) return;

  try {
    const clerk = createClerk(env);
    const count = await syncOrgMembers(clerk, orgId);
    lastSyncByOrg.set(orgId, Date.now());
    if (count > 0) {
      console.log(`[membership] synced ${count} member(s) for org ${orgId}`);
    }
  } catch (err) {
    console.warn(`[membership] sync failed for org ${orgId}`, err);
  }
}
