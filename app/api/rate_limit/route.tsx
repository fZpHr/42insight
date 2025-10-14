import { NextResponse } from 'next/server'
import { Redis } from "@upstash/redis"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_PASSWORD,
});

const RATE_KEY = "rate_limit"

export async function GET() {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const count = await redis.get(session.user.name + RATE_KEY)
        return NextResponse.json(count || 0)
    } catch (error) {
        console.error('Rate limit error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch the current rate_limit' },
            { status: 500 }
        )
    }
}
