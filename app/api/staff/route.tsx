import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const user = session.user
        if (user.role != "admin" && user.role != "staff") {
            return NextResponse.json({ error: 'Staff or Admin access required' }, { status: 403 })
        }

        // Get campus from URL parameter, fallback to user's campus
        const { searchParams } = new URL(request.url)
        const campus = searchParams.get('campus') || user.campus
        
        if (!campus) {
            return NextResponse.json({ error: 'Campus not found' }, { status: 404 })
        }
        const [
            totalStudents,
            activePoolUsers,
            averageLevel,
            studentsAtRisk,
            topPerformers
        ] = await Promise.all([
            prisma.student.count({ where: { campus: campus } }),
            prisma.poolUser.count(), // PoolUser n'a pas de champ campus dans le schéma
            prisma.student.aggregate({
                _avg: { level: true },
                where: { campus: campus }
            }),
            prisma.student.count({
                where: {
                    campus: campus,
                    blackholeTimer: {
                        lte: 30 // Students with 30 days or less
                    }
                }
            }),
            prisma.student.findMany({
                orderBy: { level: 'desc' },
                take: 10,
                select: { name: true, level: true, campus: true },
                where: { campus: campus }
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
