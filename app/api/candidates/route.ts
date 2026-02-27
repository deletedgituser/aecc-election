import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const candidates = await prisma.candidate.findMany({
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
    const { name } = await request.json()
    
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

    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
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
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Candidate already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create candidate' },
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
