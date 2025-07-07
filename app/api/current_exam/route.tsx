import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_PASSWORD,
});

const CACHE_KEY = "exam_results"

export async function GET() {
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
    } catch (error) {
        return NextResponse.json(
            { error: 'Not authorized' },
            { status: 500 }
        );
    }
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
        try {
            const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
            return NextResponse.json(parsedData, { status: 200 });
        } catch (error) {
            return NextResponse.json({ error: "Invalid cached data format" }, { status: 500 });
        }
    }
    return NextResponse.json({ error: "No cached data found" }, { status: 404 });
}