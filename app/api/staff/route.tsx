import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('token')

    if (!accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const decoded = jwt.verify(accessToken.value, process.env.JWT_SECRET!) as any
        
        if (!decoded.isStaff) {
            return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
        }

        const [
            totalStudents,
            activePoolUsers,
            averageLevel,
            studentsAtRisk,
            topPerformers
        ] = await Promise.all([
            prisma.student.count(),
            prisma.poolUser.count(),
            prisma.student.aggregate({ _avg: { level: true } }),
            prisma.student.count({ 
                where: { 
                    blackholeTimer: { 
                        lte: 30 // Students with 30 days or less
                    } 
                } 
            }),
            prisma.student.findMany({
                orderBy: { level: 'desc' },
                take: 10,
                select: { name: true, level: true, campus: true }
            })
        ])

        return NextResponse.json({
            totalStudents,
            activePoolUsers,
            averageLevel: averageLevel._avg.level || 0,
            studentsAtRisk,
            topPerformers,
            blackHoleSoon: studentsAtRisk,
            inactiveStudents: totalStudents - activePoolUsers
        })

    } catch (error) {
        console.error('Error fetching campus stats:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
