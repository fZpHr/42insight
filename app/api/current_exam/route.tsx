import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_PASSWORD,
});

const CACHE_KEY = "exam_results"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }
    try {
        const examsResponse = await apiRateLimiter.fetch(`/campus/31/exams`);

        if (!examsResponse || !Array.isArray(examsResponse) || examsResponse.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasExamToday = examsResponse.some((exam: any) => {
            const examDate = new Date(exam.begin_at);
            examDate.setHours(0, 0, 0, 0);
            return examDate.getTime() === today.getTime();
        });

        if (!hasExamToday) {
            console.log(hasExamToday)
            return NextResponse.json([], { status: 200 });
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
    } catch (error) {
        console.error('Error fetching cached exam results:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cached exam results' },
            { status: 500 }
        )
    }
}
