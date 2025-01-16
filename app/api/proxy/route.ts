// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, method, data, token } = body

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