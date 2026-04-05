import { auth } from "@/auth"

const publicRoutes = ["/", "/sign-in", "/sign-up", "/check-email", "/api/auth", "/api/saves", "/api/score-product", "/vibe", "/look", "/product", "/brand", "/season", "/style", "/match", "/search", "/saves", "/sitemap.xml", "/api/webhook", "/capsule", "/most-worn"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (!req.auth && !isPublic) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin)
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
