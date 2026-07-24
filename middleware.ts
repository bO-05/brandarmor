import { NextResponse, type NextRequest } from "next/server";

const CONTROLLED_DEMO_RUNTIME_MODE = "controlled_demo";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isProviderOrMutationRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/health/");
}

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
