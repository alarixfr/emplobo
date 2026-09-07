import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/docs",
  "/privacy",
  "/terms",
  "/kinetic",
  "/beams",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, redirectToSignIn } = await auth();

  // Clerk's B2B default after sign-in/sign-up navigates to /organization
  // (create-org) when no redirect is configured. We never use that route —
  // bounce it to our onboarding flow so a regular employee is never forced
  // into org creation (they get the join/create choice instead).
  if (request.nextUrl.pathname.startsWith("/organization")) {
    if (!userId) {
      return redirectToSignIn();
    }
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isPublicRoute(request)) {
    return;
  }

  // Signed-out users get sent to /sign-in (with ?redirect_url back to where
  // they were going) instead of Clerk's default 404 rewrite for protected
  // routes — a judge clicking a deep link shouldn't hit "not found".
  if (!userId) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
