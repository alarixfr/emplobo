import type { AppRole } from "@emplobo/db";

export type AuthContext = {
  userId: string;
  orgId: string;
  orgRole: "org:admin" | "org:member" | string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function mapClerkOrgRole(orgRole: string | undefined | null): AppRole {
  if (orgRole === "org:admin") {
    return "ADMIN";
  }
  return "EMPLOYEE";
}

export {};
