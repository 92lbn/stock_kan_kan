import type { NextRequest } from "next/server";
import { protectAppRequest } from "@stock-kan-kan/auth/proxy";

export default function proxy(request: NextRequest) {
  return protectAppRequest(request, ["/login"]);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|manifest\\.webmanifest|.*\\.png$|.*\\.svg$).*)"],
};
