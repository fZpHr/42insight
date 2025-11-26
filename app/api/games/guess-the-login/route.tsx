import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(request.url)
    const campus = searchParams.get('campus')
    const excludeParam = searchParams.get('exclude')
    
    if (!campus) {
        return NextResponse.json(
            { error: 'Campus parameter is required' },
            { status: 400 }
        )
    }

    const excludedLogins = excludeParam ? excludeParam.split(',').filter(Boolean) : []

    try {
        const students = await prisma.student.findMany({
            where: { 
                campus: campus,
                ...(excludedLogins.length > 0 && {
                    name: { notIn: excludedLogins }
                })
            }
        })

        if (students.length === 0) {
            return NextResponse.json(
                { error: 'No available students to guess' },
                { status: 404 }
            )
        }

        const randomIndex = Math.floor(Math.random() * students.length)
        const randomStudent = students[randomIndex]

        return NextResponse.json(randomStudent)
    } catch (error) {
        console.error('Database query failed:', error)
        return NextResponse.json(
            { error: 'Failed to fetch student' },
            { status: 500 }
        )
    }
}