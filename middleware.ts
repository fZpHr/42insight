import { withAuth } from "next-auth/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { rateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit"

/** The page where a visitor connects their own 42 application. */
const API_KEY_PAGE = "/api-key"

/**
 * Pages that need data, and therefore a key. Everything else -- the key page
 * itself, useful links, contribute -- stays reachable without one.
 */
const keyRequiredRoutes = [
  "/dashboard",
  "/rankings",
  "/trombinoscope",
  "/cluster-map",
  "/peers",
  "/events",
  "/exam-tracker",
  "/rncp-simulator",
  "/query",
  "/piscine",
]

const poolRestrictedRoutes = [
  "/query",
  "/rankings",
  "/trombinoscope",
  "/piscine/rankings",
]

const adminStaffOnlyRoutes = [
  "/cluster-map",
]

/**
 * Demo mode, set by the button on the sign-in page. It carries a real session
 * too, so the authorisation check below passes on the token like anyone's --
 * this is only about the key, which a demo visitor does not have and does not
 * need, since getApi() serves them an invented network instead.
 */
const isDemo = (req: NextRequest) => req.cookies.get("demo")?.value === "1"


export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname


    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
    }


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

    // No key, no data: send the visitor to the one page that can fix that,
    // rather than letting every page discover it separately and ask again.
    // The cookie is the sealed credentials set by /api/byok/token.
    const hasKey = Boolean(req.cookies.get("byok_credentials")?.value)
    const needsKey = keyRequiredRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    )

    if (needsKey && !hasKey && !isDemo(req)) {
      return NextResponse.redirect(new URL(API_KEY_PAGE, req.url))
    }

    if (token?.role === "pisciner") {
      const isRestrictedRoute = poolRestrictedRoutes.some(route =>
        pathname.startsWith(route)
      )

      if (isRestrictedRoute) {
        return NextResponse.redirect(new URL("/error/forbidden", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    // withAuth looks for NEXTAUTH_SECRET, which this project has never used --
    // it signs with JWT_SECRET. Without this the middleware finds no secret,
    // logs NO_SECRET and redirects every signed-in visitor to
    // /api/auth/error?error=Configuration, right after a successful login.
    secret: process.env.JWT_SECRET,
    callbacks: {
      authorized: ({ token, req }) => !!token || isDemo(req)
    },
  }
)

export const config = {
  matcher: [
    "/api-key/:path*",
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
    "/api/campus/:path*",
    "/api/locations/:path*",
    "/api/byok/:path*",
    "/api/campuses/:path*",
    "/api/staff/:path*",
    "/api/quota/:path*",
    "/api/activity/:path*",
    "/api/events/:path*",
    "/api/changelog/:path*",
    "/api/cluster-hosts/:path*",
    "/api/peers/:path*",
  ]
}
