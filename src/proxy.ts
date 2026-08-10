import type { NextRequest } from "next/server";
import { protectAppRequest } from "@stock-kan-kan/auth/proxy";

export default async function proxy(request: NextRequest) {
  return protectAppRequest(request);
}

export const config = {
  // Exclude API routes, Next static assets, images, the service worker and the
  // web manifest so they stay publicly reachable without a session.
  matcher: [
    "/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.png$|.*\\.svg$).*)",
  ],
};
