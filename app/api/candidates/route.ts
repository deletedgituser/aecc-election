import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidCategory } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category && isValidCategory(category)
      ? { category }
      : {}

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: {
        voteCount: 'desc',
      },
    })
    
    return NextResponse.json(candidates)
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, category: rawCategory } = await request.json()
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Candidate name is required' },
        { status: 400 }
      )
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Candidate name cannot be empty' },
        { status: 400 }
      )
    }

    const category = rawCategory && isValidCategory(rawCategory)
      ? rawCategory
      : 'board_of_director'

    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
        category,
        voteCount: 1,
      },
    })

    // Broadcast to all connected clients
    broadcastUpdate({
      type: 'add',
      data: candidate,
    })

    return NextResponse.json(candidate, { status: 201 })
  } catch (error: any) {
    console.error('Error creating candidate:', error)
    
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Candidate already exists for this position' },
        { status: 400 }
      )
    }

    const message = error?.message || 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create candidate', details: message },
      { status: 500 }
    )
  }
}

// In-memory store for WebSocket clients
let wsClients: Set<any> = new Set()

export function addWSClient(client: any) {
  wsClients.add(client)
}

export function removeWSClient(client: any) {
  wsClients.delete(client)
}

export function broadcastUpdate(message: any) {
  wsClients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message))
    }
  })
}
