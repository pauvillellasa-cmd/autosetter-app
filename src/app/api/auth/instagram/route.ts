import { NextResponse } from "next/server";

/**
 * GET — Redirige al OAuth de Instagram/Meta
 */
export async function GET() {
  const appId = process.env.META_APP_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

  const scopes = [
    "instagram_basic",
    "instagram_manage_messages",
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
  ].join(",");

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
