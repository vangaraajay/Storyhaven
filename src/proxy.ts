import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: NextRequest) {
  try {
    return await auth0.middleware(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
