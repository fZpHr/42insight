import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const poolRestrictedRoutes = [
  "/query",
  "/rankings",
  "/trombinoscope",
  "/piscine/rankings",
]

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    if (token?.role === "pisciners") {
      const isRestrictedRoute = poolRestrictedRoutes.some(route => 
        pathname.startsWith(route)
      )
      
      if (isRestrictedRoute) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
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
    "/exam-tracker/:path*", 
    "/piscine/:path*", 
    "/links/:path*", 
    "/contribute/:path*",
    "/api/proxy/:path*",
    "/api/rate_limit/:path*",
    "/api/current_exam/:path*",
    "/api/user/:path*",
    "/api/staff/:path*",
    "/api/events/:path*",
  ] 
}