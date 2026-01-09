import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { rateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit"

const poolRestrictedRoutes = [
  "/query",
  "/rankings",
  "/trombinoscope",
  "/piscine/rankings",
]

const adminStaffOnlyRoutes = [
  "/cluster-map",
]

const supportedCampuses = [
  "Angouleme",
  "Nice"
]

const campusRestrictedRoutes = [
  "/rankings",
  "/exam-tracker",
  "/trombinoscope",
  "/cluster-map",
  "/peers",
  "/events",
  "/piscine/:path*",
]


export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Block API routes if not authenticated (except public auth routes)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
      const ip = getClientIp(req);
      const identifier = token?.login || ip;
      
      const limit = token ? 100 : 50;
      const result = await rateLimit(identifier, limit, 60);
      
      if (!result.success) {
        return NextResponse.json(
          { 
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil((result.reset * 1000 - Date.now()) / 1000)} seconds.`
          },
          { 
            status: 429,
            headers: getRateLimitHeaders(result)
          }
        );
      }
    }

    if (token?.role === "pisciner") {
      const isRestrictedRoute = poolRestrictedRoutes.some(route => 
        pathname.startsWith(route)
      )
      
      if (isRestrictedRoute) {
        return NextResponse.redirect(new URL("/error/forbidden", req.url))
      }
    }

    // if (token?.role === "student") {
    //   const adminStaffOnlyRoutesAccess = adminStaffOnlyRoutes.some(route =>
    //     pathname.startsWith(route)
    //   )
      
    //   if (adminStaffOnlyRoutesAccess) {
    //     return NextResponse.redirect(new URL("/error/forbidden", req.url))
    //   }
    // }

    // Staff and admin can bypass campus restrictions
    const isStaffOrAdmin = token?.role === "staff" || token?.role === "admin"
    
    if (token?.campus && !isStaffOrAdmin) {
      const isCampusRestrictedRoute = campusRestrictedRoutes.some(route => {
        const base = route.replace(":path*", "").replace(/\/$/, "")
        return pathname === base || pathname.startsWith(base + "/")
      })

      if (isCampusRestrictedRoute && !supportedCampuses.includes(token.campus)) {
        return NextResponse.redirect(new URL("/error/forbidden", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => token && !token.error
    },
  }
)

export const config = { 
  matcher: [
    "/dashboard/:path*", 
    "/trombinoscope/:path*", 
    "/query/:path*",
    "/rncp-simulator/:path*",
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
    "/api/changelog/:path*",
    "/api/cluster-hosts/:path*",
    "/api/peers/:path*",
  ] 
}
