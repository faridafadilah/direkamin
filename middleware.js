import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(req) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await sb.auth.getUser();
  const p = req.nextUrl.pathname;
  const open =
    p === "/login" || p.startsWith("/auth") || p.startsWith("/share/");
  if (!user && !open) {
    if (p.startsWith("/api"))
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const u = req.nextUrl.clone();
    u.pathname = "/login";
    return NextResponse.redirect(u);
  }
  if (user && p === "/login") {
    const u = req.nextUrl.clone();
    u.pathname = "/";
    return NextResponse.redirect(u);
  }
  return res;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
