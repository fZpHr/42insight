import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Redis } from "@upstash/redis";
import jwt from 'jsonwebtoken'

const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_PASSWORD,
});

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
        const count = await redis.get(decoded.login + RATE_KEY)
        return NextResponse.json(count)
    } catch (error) {
        console.error('Proxy error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch the current rate_limit' },
            { status: 500 }
        )
    }
}