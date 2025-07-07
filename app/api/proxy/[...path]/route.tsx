import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Redis } from "@upstash/redis";
import jwt from 'jsonwebtoken'

const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_PASSWORD,
});

const RATE_LIMIT = 10
const RATE_KEY = "rate_limit"


export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('token')
    if (!accessToken) {
        return NextResponse.json(
            { error: 'Access token is required' },
            { status: 401 }
        )
    }
    try {
        const decoded = jwt.verify(accessToken.value, process.env.JWT_SECRET) as any
        if (!decoded) {
            throw new Error("Not authorized")
        }

        if (decoded.login !== "bapasqui" && decoded.login !== "hbelle") {
            const count = await redis.get(decoded.login + RATE_KEY)
            if (count && parseInt(String(count)) >= RATE_LIMIT) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            )
            }
        }
        await redis.incr(decoded.login + RATE_KEY)
        await redis.expire(decoded.login + RATE_KEY, 3600)

        const apiPath = params.path.join('/')
        const searchParams = request.nextUrl.searchParams.toString()
        const apiUrl = `https://api.intra.42.fr/v2/${apiPath}${searchParams ? `?${searchParams}` : ''}`

        const proxyResponse = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${decoded.apiToken}`,
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