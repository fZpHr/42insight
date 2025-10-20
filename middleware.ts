import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const poolRestrictedRoutes = [
  "/query",
  "/rankings",
  "/trombinoscope",
  "/piscine/rankings",
]

const adminStaffOnlyRoutes = [
  "/cluster-map",
  "/peers",
]

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    if (token?.role === "pisciner") {
      const isRestrictedRoute = poolRestrictedRoutes.some(route => 
        pathname.startsWith(route)
      )
      
      if (isRestrictedRoute) {
        return NextResponse.redirect(new URL("/error/forbidden", req.url))
      }
    }

    if (token?.role === "student") {
      const adminStaffOnlyRoutesAccess = adminStaffOnlyRoutes.some(route =>
        pathname.startsWith(route)
      )
      
      if (adminStaffOnlyRoutesAccess) {
        return NextResponse.redirect(new URL("/error/forbidden", req.url))
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = { 
  matcher: [
    "/dashboard/:path*", 
    "/trombinoscope/:path*", 
    "/query/:path*", 
    "/rankings/:path*",
    "/events/:path*",
    "/cluster-map/:path*",
    "/peers/:path*",
    "/exam-tracker/:path*", 
    "/piscine/:path*", 
    "/links/:path*", 
    "/contribute/:path*",
    "/api/proxy/:path*",
    "/api/rate_limit/:path*",
    "/api/current_exam/:path*",
    "/api/users/:path*",
    "/api/staff/:path*",
    "/api/events/:path*",
  ] 
}
