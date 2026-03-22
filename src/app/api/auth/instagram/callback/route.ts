import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getInstagramAccount,
  getInstagramProfile,
  subscribePageToWebhooks,
} from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_denied`
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

    // 1. Intercambiar code por short-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(
      code,
      redirectUri
    );

    // 2. Convertir a long-lived token
    const { access_token: longToken } = await getLongLivedToken(shortToken);

    // 3. Obtener páginas del usuario
    const pages = await getUserPages(longToken);
    if (pages.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_pages`
      );
    }

    // 4. Buscar la primera página con Instagram conectado
    let instagramId: string | undefined;
    let selectedPage = pages[0];

    for (const page of pages) {
      const igId = await getInstagramAccount(page.id, page.access_token);
      if (igId) {
        instagramId = igId;
        selectedPage = page;
        break;
      }
    }

    if (!instagramId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=no_instagram`
      );
    }

    // 5. Obtener perfil de Instagram
    const profile = await getInstagramProfile(
      instagramId,
      selectedPage.access_token
    );

    // 6. Suscribir página a webhooks
    await subscribePageToWebhooks(selectedPage.id, selectedPage.access_token);

    // 7. Crear o actualizar usuario en DB
    const user = await prisma.user.upsert({
      where: { instagramId: instagramId },
      update: {
        instagramUsername: profile.username,
        accessToken: longToken,
        pageId: selectedPage.id,
        pageAccessToken: selectedPage.access_token,
      },
      create: {
        instagramId: instagramId,
        instagramUsername: profile.username,
        accessToken: longToken,
        pageId: selectedPage.id,
        pageAccessToken: selectedPage.access_token,
        config: {
          create: {
            agentName: profile.name || profile.username,
            brandName: profile.username,
          },
        },
      },
    });

    // 8. Crear JWT y setear cookie
    const token = signToken({
      userId: user.id,
      instagramUsername: user.instagramUsername,
    });

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`
    );
  }
}
