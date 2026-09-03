import "server-only";

type DashboardAuthResult =
  | { ok: true; email: string; origin: string }
  | { ok: false; status: 401 | 403 | 500; error: string; origin: string | null };

function configuredOrigins() {
  return (process.env.DASHBOARD_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function configuredManagers() {
  return (process.env.DASHBOARD_MANAGER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function dashboardCorsHeaders(origin: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Cache-Control": "private, no-store",
    Vary: "Origin",
  });
  if (origin && configuredOrigins().includes(origin.replace(/\/$/, ""))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export async function authenticateDashboardManager(request: Request): Promise<DashboardAuthResult> {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") ?? null;
  const supabaseUrl = process.env.DASHBOARD_SUPABASE_URL;
  const supabaseKey = process.env.DASHBOARD_SUPABASE_ANON_KEY;
  const allowedManagers = configuredManagers();

  if (!supabaseUrl || !supabaseKey || configuredOrigins().length === 0 || allowedManagers.length === 0) {
    return { ok: false, status: 500, error: "L’accès Dashboard n’est pas configuré.", origin };
  }
  if (!origin || !configuredOrigins().includes(origin)) {
    return { ok: false, status: 403, error: "Origine non autorisée.", origin };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Session Dashboard manquante.", origin };
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: authorization },
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, status: 401, error: "Session Dashboard invalide.", origin };
    }
    const user = (await response.json()) as { email?: string };
    const email = user.email?.trim().toLowerCase();
    if (!email || !allowedManagers.includes(email)) {
      return { ok: false, status: 403, error: "Ce compte n’est pas autorisé à piloter l’équipe.", origin };
    }
    return { ok: true, email, origin };
  } catch {
    return { ok: false, status: 500, error: "La vérification du compte Dashboard a échoué.", origin };
  }
}
