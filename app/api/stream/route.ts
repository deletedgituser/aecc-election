import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Fetch initial candidates first (outside of stream)
    const initialCandidates = await prisma.candidate.findMany({
      orderBy: { voteCount: 'desc' },
    })

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial data
          controller.enqueue(
            `data: ${JSON.stringify({ type: 'init', data: initialCandidates })}\n\n`
          )

          // Check for updates every second
          const interval = setInterval(async () => {
            try {
              const updatedCandidates = await prisma.candidate.findMany({
                orderBy: { voteCount: 'desc' },
              })

              controller.enqueue(
                `data: ${JSON.stringify({ type: 'update', data: updatedCandidates })}\n\n`
              )
            } catch (error) {
              console.error('Error fetching candidates in stream:', error)
            }
          }, 1000)

          // Clean up on disconnect
          request.signal.addEventListener('abort', () => {
            clearInterval(interval)
            controller.close()
          })
        } catch (error) {
          console.error('Error in stream start:', error)
          controller.close()
        }
      },
    })

    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error in stream route:', error)
    return NextResponse.json(
      { error: 'Failed to establish stream' },
      { status: 500 }
    )
  }
}
