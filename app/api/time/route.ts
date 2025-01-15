import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import axios from 'axios'

const prisma = new PrismaClient()

export async function GET(req: Request) {
    try {
        const time = await prisma.UpdateTimestamp.findMany({
            orderBy: {
                updatedAt: 'desc'
            },
            take: 2
        })
        return NextResponse.json(time)
    } catch (error) {
        console.error('Database Error:', error)
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}