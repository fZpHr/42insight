import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }
    try {
        const { path } = await params
        const apiPath = path.join('/')
        const searchParams = request.nextUrl.searchParams.toString()
        const apiUrl = `https://api.intra.42.fr/v2/${apiPath}${searchParams ? `?${searchParams}` : ''}`

        const proxyResponse = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${session?.accessToken}`,
            },
        })
        if (!proxyResponse.ok) {
            return NextResponse.json(
                { error: `42 API error: ${proxyResponse.status}` },
                { status: proxyResponse.status }
            )
        }

        const data = await proxyResponse.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Proxy error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch data from 42 API' },
            { status: 500 }
        )
    }
}
