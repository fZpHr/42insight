import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }
    try {
        const students = await prisma.project.findMany()
        return NextResponse.json(students)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }
}