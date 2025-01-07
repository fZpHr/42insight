import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    if (!code) {
        return NextResponse.json({ error: 'Code query parameter is required' }, { status: 400 })
    }

    try {
        const url = process.env.NEXT_PUBLIC_REDIRECT_URI;
        if (!url) {
            throw new Error('NEXT_PUBLIC_REDIRECT_URI is not defined')
        }
        const response = await axios.post('https://api.intra.42.fr/oauth/token', {
            grant_type: 'authorization_code',
            client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET1,
            redirect_uri: url + '/api/auth',
            code: code,
        })

        const accessToken = response.data.access_token
        if (!accessToken) {
            throw new Error('No access token')
        }

        const me = await axios.get('https://api.intra.42.fr/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (me.status !== 200) {
            throw new Error('Invalid token')
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', accessToken)
            localStorage.setItem('photo', me.data.image_url)
        }
        return NextResponse.redirect(url, { headers: { 'Set-Cookie': `token=${accessToken}; Path=/` } })
    } catch (error) {
        console.error('Authentication Error:', error)
        return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 })
    }
}
