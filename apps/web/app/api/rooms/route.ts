import { NextRequest, NextResponse } from 'next/server'
import { prismaClient } from '@repo/db/client'
import { getServerSession } from 'next-auth'
import { authentication } from '../../../lib/auth'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const owner = url.searchParams.get('owner')

    let userId: string | undefined = undefined

    if (owner) {
      const user = await prismaClient.user.findUnique({ where: { email: owner } })
      if (user) userId = user.id
      else return NextResponse.json([], { status: 200 })
    } else {
        const session = await getServerSession(authentication)
        const email = (session as unknown as { user?: { email?: string } } | null)?.user?.email
        if (!email) {
          return NextResponse.json([], { status: 200 })
        }

        const user = await prismaClient.user.findUnique({ where: { email } })
        if (!user) return NextResponse.json([], { status: 200 })
        userId = user.id
    }

    if (!userId) return NextResponse.json([], { status: 200 })

    const rooms = await prismaClient.room.findMany({
      where: { adminId: userId },
      orderBy: { createdAt: 'desc' },
      select: { slug: true },
    })

    const out = rooms.map((r) => ({ id: r.slug, name: r.slug }))
    return NextResponse.json(out, { status: 200 })
  } catch (err) {
    console.error('Error fetching rooms', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
