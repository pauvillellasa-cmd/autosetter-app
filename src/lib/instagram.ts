const META_API_BASE = "https://graph.facebook.com/v21.0";

/**
 * Intercambia el code de OAuth por un access token de corta duración
 */
export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const res = await fetch(`${META_API_BASE}/oauth/access_token`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  // Usar el endpoint correcto con query params
  const url = new URL(`${META_API_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data as { access_token: string; token_type: string };
}

/**
 * Intercambia un token de corta duración por uno de larga duración (60 días)
 */
export async function getLongLivedToken(shortToken: string) {
  const url = new URL(`${META_API_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  url.searchParams.set("fb_exchange_token", shortToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data as { access_token: string; token_type: string; expires_in: number };
}

/**
 * Obtiene las páginas del usuario y sus tokens
 */
export async function getUserPages(accessToken: string) {
  const url = new URL(`${META_API_BASE}/me/accounts`);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.data as Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
}

/**
 * Obtiene la cuenta de Instagram conectada a una página
 */
export async function getInstagramAccount(pageId: string, pageAccessToken: string) {
  const url = new URL(`${META_API_BASE}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account");
  url.searchParams.set("access_token", pageAccessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.instagram_business_account?.id as string | undefined;
}

/**
 * Obtiene el perfil de Instagram
 */
export async function getInstagramProfile(igAccountId: string, accessToken: string) {
  const url = new URL(`${META_API_BASE}/${igAccountId}`);
  url.searchParams.set("fields", "id,username,name,profile_picture_url");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data as {
    id: string;
    username: string;
    name: string;
    profile_picture_url?: string;
  };
}

/**
 * Envía un mensaje de Instagram vía la API de Meta
 */
export async function sendInstagramMessage(
  pageId: string,
  pageAccessToken: string,
  recipientId: string,
  messageText: string
) {
  const url = `${META_API_BASE}/${pageId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data;
}

/**
 * Suscribe la página a webhooks de mensajes
 */
export async function subscribePageToWebhooks(pageId: string, pageAccessToken: string) {
  const url = `${META_API_BASE}/${pageId}/subscribed_apps`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscribed_fields: ["messages"],
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data;
}
