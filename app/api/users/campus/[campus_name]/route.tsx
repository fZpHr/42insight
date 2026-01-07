import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import Fast42 from "@codam/fast42"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

let api: Fast42 | null = null;

const getApi = async () => {
    if (!api) {
        api = await new Fast42([
            {
              client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
              client_secret: process.env.CLIENT_SECRET_NEXT1!,
            }
        ]).init();
    }
    return api;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ campus_name: string }> }
) {
    const { campus_name } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }
    try {
        const students = await prisma.student.findMany({
            where: { campus: campus_name }
        })
        
        if (!students || students.length == 0) {
            try {
                const campusMapping: { [key: string]: number } = {
                    "angouleme": 31, "nice": 41,
                    "amsterdam": 14, "paris": 1, "lyon": 9, "brussels": 12, "helsinki": 13,
                    "khouribga": 16, "sao-paulo": 20, "benguerir": 21, "madrid": 22, "kazan": 23,
                    "quebec": 25, "tokyo": 26, "rio-de-janeiro": 28, "seoul": 29, "rome": 30,
                    "yerevan": 32, "bangkok": 33, "kuala-lumpur": 34, "adelaide": 36, "malaga": 37,
                    "lisboa": 38, "heilbronn": 39, "urduliz": 40, "42network": 42, "abu-dhabi": 43,
                    "wolfsburg": 44, "alicante": 45, "barcelona": 46, "lausanne": 47, "mulhouse": 48,
                    "istanbul": 49, "kocaeli": 50, "berlin": 51, "florence": 52, "vienna": 53,
                    "tetouan": 55, "prague": 56, "london": 57, "porto": 58, "le-havre": 62,
                    "singapore": 64, "antananarivo": 65, "warsaw": 67, "luanda": 68, "gyeongsan": 69
                };

                const campusId = campusMapping[campus_name];
                if (!campusId) {
                    return NextResponse.json(
                        { error: 'Campus not found' },
                        { status: 404 }
                    );
                }

                const apiClient = await getApi();
                const allPages = await apiClient.getAllPages(`/campus/${campusId}/users`);
                const responses = await Promise.all(allPages);
                
                let allUsersData: any[] = [];
                for (const response of responses) {
                    if (!response.ok) {
                        return NextResponse.json(
                            { error: 'Failed to fetch from external API' },
                            { status: 500 }
                        );
                    }
                    const pageData = await response.json();
                    allUsersData = allUsersData.concat(pageData);
                }
                
                if (!allUsersData || allUsersData.length == 0) {
                    return NextResponse.json(
                        { error: 'No students found for this campus' },
                        { status: 404 }
                    )
                }
                const transformedData = allUsersData
                    .filter((user: any) => !user.staff)
                    .map((user: any) => ({
                        id: user.id,
                        name: user.login,
                        level: -1,
                        photoUrl: user.image?.versions?.medium || user.image?.link || '',
                        year: parseInt(user.pool_year) || new Date().getFullYear(),
                        campus: campus_name,
                    }));
                return NextResponse.json(transformedData);
            } catch (apiError) {
                console.error('API call failed:', apiError);
                return NextResponse.json(
                    { error: 'Failed to fetch from external API' },
                    { status: 500 }
                )
            }
        }
        
        // Parse activityData and relation from JSON strings
        const studentsWithParsedData = students.map(student => {
            try {
                const parsedActivityData = typeof student.activityData === 'string' 
                    ? JSON.parse(student.activityData) 
                    : student.activityData;
                
                const parsedRelation = typeof student.relation === 'string'
                    ? JSON.parse(student.relation)
                    : student.relation;
                
                // Restructure activityData to have logtime as a nested object
                // If the data is at root level (has totalSeconds, totalMinutes, etc.)
                // move it into a logtime sub-object
                let restructuredActivityData = parsedActivityData;
                if (parsedActivityData && parsedActivityData.totalSeconds && !parsedActivityData.logtime) {
                    // Extract logtime-specific fields
                    const {
                        totalSeconds, totalMinutes, totalHours, totalDays,
                        averageDailyMinutes, averageDailyHours,
                        firstDay, lastDay, daysSinceFirst, activeDays,
                        totalSessions, presenceRate, daysWithoutConnection,
                        currentStreak, maxStreak, bestDay, worstDay,
                        topDays, topHosts, weeklyMinutes, last7Days, last30Days,
                        sessions, timePreferences, peakHour, quietHour, profile,
                        weekdayVsWeekend, productivity, lastUpdated,
                        // Keep the rest in the main object
                        ...restActivityData
                    } = parsedActivityData;
                    
                    restructuredActivityData = {
                        ...restActivityData,
                        logtime: {
                            totalSeconds, totalMinutes, totalHours, totalDays,
                            averageDailyMinutes, averageDailyHours,
                            firstDay, lastDay, daysSinceFirst, activeDays,
                            totalSessions, presenceRate, daysWithoutConnection,
                            currentStreak, maxStreak, bestDay, worstDay,
                            topDays, topHosts, weeklyMinutes, last7Days, last30Days,
                            sessions, timePreferences, peakHour, quietHour, profile,
                            weekdayVsWeekend, productivity, lastUpdated
                        }
                    };
                }
                
                return {
                    ...student,
                    activityData: restructuredActivityData,
                    relation: parsedRelation
                };
            } catch (error) {
                console.error(`[API] Failed to parse JSON for student ${student.name}:`, error);
                return {
                    ...student,
                    activityData: {},
                    relation: {}
                };
            }
        });
        
        return NextResponse.json(studentsWithParsedData)
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ error: 'Failed to fetch campus students' }, { status: 500 })
    }
}
