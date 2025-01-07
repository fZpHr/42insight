import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import axios from 'axios'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  if (!prisma) {
    return NextResponse.json({ error: 'No database connection' }, { status: 500 })
  }
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
        throw new Error('No access token')
    }
    const me = await axios.get('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (me.status !== 200) {
        throw new Error('Invalid token')
    }

  } catch (error) {
    console.error('Authentication Error:', error)
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 })
  }

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
