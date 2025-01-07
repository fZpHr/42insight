import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const students = await prisma.student.findMany()
    return NextResponse.json(students)
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
