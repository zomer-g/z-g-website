import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Redirect uppercase paths to lowercase (old site compat)
  if (
    pathname !== pathname.toLowerCase() &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/admin")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 301);
  }

  // Only protect /admin routes (except /admin/login)
  const isAdminRoute =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  if (isAdminRoute && !req.auth) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    // Exclude /api/mcp/* and /.well-known/* from middleware entirely.
    // The MCP server does its own Bearer auth check; running the NextAuth
    // auth() wrapper on every JSON-RPC POST adds latency, may interfere
    // with header forwarding, and shows up in production as the MCP route
    // handler never being invoked (no [mcp/foi-guide] logs despite live
    // traffic). well-known metadata endpoints are also static spec
    // documents — no need to involve session auth.
    "/((?!_next/static|_next/image|favicon.ico|images|api/mcp|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
