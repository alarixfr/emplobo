import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  if (isPublicRoute(request)) {
    return;
  }

  const { userId, redirectToSignIn } = await auth();

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
