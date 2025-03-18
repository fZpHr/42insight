import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
    url: "https://optimal-mako-30221.upstash.io",
    token: "",
});

export async function POST(request: NextRequest) {
    try {
        const { students } = await request.json();
        if (!students) {
            return NextResponse.json({ error: "No students data provided" }, { status: 400 });
        }

        await redis.set("exam_results", JSON.stringify(students), { ex: 600 });
        return NextResponse.json({ message: "Cached successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}

export async function GET() {
    const cachedData = await redis.get("exam_results");

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
