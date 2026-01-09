import { NextRequest, NextResponse } from 'next/server'
import { getToken } from "next-auth/jwt";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const token = await getToken({ req: request });
    if (!token || !token.id || !token.accessToken) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }


    const limitResult = await rateLimit(token.id as string);
    if (!limitResult.success) {
        return new NextResponse("Too Many Requests", {
            status: 429,
            headers: getRateLimitHeaders(limitResult),
        });
    }

    try {
        const { path } = await params
        const apiPath = path.join('/')
        const searchParams = request.nextUrl.searchParams.toString()
        const apiUrl = `https://api.intra.42.fr/v2/${apiPath}${searchParams ? `?${searchParams}` : ''}`

        const proxyResponse = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${token.accessToken}`,
            },
        })

        if (!proxyResponse.ok) {
            return NextResponse.json(
                { error: `42 API error: ${proxyResponse.status}` },
                { status: proxyResponse.status }
            )
        }

        const data = await proxyResponse.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Proxy error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch data from 42 API' },
            { status: 500 }
        )
    }
}
