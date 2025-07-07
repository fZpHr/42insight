import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  
  if (!code) {
    return NextResponse.json(
      { error: 'Code query parameter is required' }, 
      { status: 400 }
    )
  }

  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID
  const clientSecret = process.env.CLIENT_SECRET_NEXT1

  if (!redirectUri || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing required environment variables' },
      { status: 500 }
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${redirectUri}/api/auth`,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      throw new Error('No access token received')
    }

    const userResponse = await fetch('https://api.intra.42.fr/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error(`User fetch failed: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    const poolUserRecord = await prisma.poolUser.findUnique({
      where: { id: userData.id }
    })
    
    let isPoolUser = false
    if (poolUserRecord && poolUserRecord.id && poolUserRecord.isPoolUser) {
      isPoolUser = true
    }
    const jwtPayload = {
      userId: userData.id,
      login: userData.login,
      isPoolUser: isPoolUser, 
      apiToken: accessToken,
      iat: Math.floor(Date.now() / 1000),
    }

    const jwtToken = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    const response = NextResponse.redirect(redirectUri + "/dashboard")
    
    response.cookies.set('token', jwtToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return response
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}