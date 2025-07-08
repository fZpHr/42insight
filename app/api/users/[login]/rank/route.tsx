import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { Student } from '@/types'


export async function GET(
    _request: Request,
    { params }: { params: { login: string } }
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
        const decoded = jwt.verify(accessToken.value, process.env.JWT_SECRET!) as { name: string };
        if (!decoded) {
            throw new Error("Not authorized")
        }
        const login = params.login;
        
        let targetUser: any = await prisma.student.findFirst({
            where: { name: params.login }
        });
        
        let isPoolUser = false;
        
        if (!targetUser) {
            targetUser = await prisma.poolUser.findFirst({
            where: { name: params.login }
            });
            isPoolUser = true;
        }
        
        if (!targetUser) {
            return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
            )
        }
        
        let allUsers;
        if (isPoolUser) {
            allUsers = await prisma.poolUser.findMany();
        } else {
            allUsers = await prisma.student.findMany({
            where: { campus: targetUser.campus },
            });
        }
        
        const sortedUsers = allUsers.sort((a, b) => b.level - a.level);
        const currentUserIndex = sortedUsers.findIndex((user) => user.name === login);
        const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
        return NextResponse.json({ rank: currentUserRank })
    } catch (error) {
        console.error('Error fetching rank', error)
        return NextResponse.json(
            { error: 'Failed to fetch students' },
            { status: 500 }
        )
    }
}