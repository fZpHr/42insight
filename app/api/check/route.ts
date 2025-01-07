import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: Request) {
    try {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (!token) {
            throw new Error('No access token')
        }

        const me = await axios.get('https://api.intra.42.fr/v2/me', {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (me.status !== 200) {
            throw new Error('Invalid token')
        }

        return NextResponse.json(me.data)
    } catch (error) {
        console.error('Authentication Error:', error)
        return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 })
    }
}
