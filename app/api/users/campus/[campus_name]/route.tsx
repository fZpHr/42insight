import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import Fast42 from "@codam/fast42"
import jwt from 'jsonwebtoken'

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
    { params }: { params: { campus_name: string } }
) {
    const campus_name = params.campus_name;
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('token')
    if (!accessToken) {
        return NextResponse.json(
            { error: 'Access token is required' },
            { status: 401 }
        )
    }
    try {
        const decoded = jwt.verify(accessToken.value, process.env.JWT_SECRET!) as any
        if (!decoded) {
            throw new Error("Not authorized")
        }
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
        return NextResponse.json(students)
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ error: 'Failed to fetch campus students' }, { status: 500 })
    }
}