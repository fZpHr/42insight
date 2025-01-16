import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// Cache the token and its expiration
let cachedToken: string | null = null
let tokenExpiration: number | null = null

async function getToken(CLIENT_ID: string, CLIENT_SECRET: string) {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        return cachedToken
    }

    try {
        const response = await axios.post('https://api.intra.42.fr/oauth/token', {
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        })

        cachedToken = response.data.access_token
        tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000
        return cachedToken
    } catch (error: any) {
        throw new Error('Failed to obtain access token')
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { endpoint, method, data, CLIENT_ID, CLIENT_SECRET } = body
        const token = await getToken(CLIENT_ID, CLIENT_SECRET)
        const response = await axios({
            method: method || 'GET',
            url: `https://api.intra.42.fr/v2${endpoint}`,
            data: data,
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })

        return NextResponse.json({
            data: response.data,
            headers: {
                'x-hourly-ratelimit-remaining': response.headers['x-hourly-ratelimit-remaining']
            }
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: error.response?.status || 500 }
        )
    }
}
