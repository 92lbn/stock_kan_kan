import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "./session";

export async function protectAppRequest(
  request: NextRequest,
  publicRoutes: readonly string[] = ["/login", "/offline"]
) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}
