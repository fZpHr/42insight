import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import Fast42 from "@codam/fast42"

const api = await new Fast42([
    {
      client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET_NEXT1!,
    }
  ]).init()


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
        const login = params.login;
        if (!decoded) {
            throw new Error("Not authorized")
        }
        console.log("Fetching user data for login:", login)

        const data = await api.get(`/users/${login}`)
        const user = await data.json()
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}