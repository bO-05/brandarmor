import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { isClerkConfigured, isPilotRuntime } from "@/lib/auth/config";

const CONTROLLED_DEMO_RUNTIME_MODE = "controlled_demo";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PILOT_NEON_MUTATION_ROUTES = new Set(["/api/brands", "/api/products", "/api/listings", "/api/investigations", "/api/discovery", "/api/evaluation"]);

function isPilotNeonMutationRoute(pathname: string): boolean {
  return PILOT_NEON_MUTATION_ROUTES.has(pathname) || /^\/api\/investigations\/[^/]+\/(run|review|report)$/.test(pathname) || /^\/api\/listings\/[^/]+\/assets$/.test(pathname);
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isPilotRuntime() && request.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        error: "Authentication is required for pilot access.",
        code: "pilot_auth_required",
      }, { status: 401 });
    }
  }
  return NextResponse.next();
});

function isProviderOrMutationRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/health/");
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Inngest validates its own signed webhook requests; Clerk must not intercept it.
  if (request.nextUrl.pathname === "/api/inngest") return NextResponse.next();

  if (
    process.env.BRANDARMOR_RUNTIME_MODE === CONTROLLED_DEMO_RUNTIME_MODE &&
    MUTATION_METHODS.has(request.method) &&
    isProviderOrMutationRoute(request.nextUrl.pathname)
  ) {
    return NextResponse.json({
      error: "This hosted workspace is in controlled demo mode.",
      code: "controlled_demo_read_only",
      detail: "Viewing seeded evidence remains available. Creating data, applying labels, and running provider-backed actions are temporarily disabled.",
    }, { status: 423 });
  }

  if (
    isPilotRuntime() &&
    MUTATION_METHODS.has(request.method) &&
    request.nextUrl.pathname.startsWith("/api/") &&
    !isPilotNeonMutationRoute(request.nextUrl.pathname)
  ) {
    return NextResponse.json({
      error: "This pilot route has not completed its Neon-backed cutover.",
      code: "pilot_route_not_implemented",
    }, { status: 501 });
  }

  if (isPilotRuntime() && isClerkConfigured()) {
    return clerkProxy(request, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
