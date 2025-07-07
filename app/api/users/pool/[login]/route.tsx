import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function GET(
    request: Request,
    { params }: { params: { login: string } }
) {
    const cookieStore = cookies()
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
        const user = await prisma.poolUser.findFirst({
            where: { name: params.login }
        })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}