import type { NextRequest } from "next/server";
import { protectAppRequest } from "@stock-kan-kan/auth/proxy";

export default function proxy(request: NextRequest) {
  return protectAppRequest(request, ["/login", "/offline", "/acces-refuse"]);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.png$|.*\\.svg$).*)",
  ],
};
