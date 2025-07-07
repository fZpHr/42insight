import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

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
        const dbUser = await prisma.student.findUnique({
            where: {
                id: decoded.userId
            }
        })
        if (!dbUser) {
            const dbUser = await prisma.poolUser.findUnique({
                where: {
                    id: decoded.userId
                }
            })
            if (!dbUser) {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                )
            }
        }

        await prisma.$disconnect()
        return NextResponse.json(dbUser)
    } catch (error) {
        console.error('Error fetching user data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch user data' },
            { status: 500 }
        )
    }
}



