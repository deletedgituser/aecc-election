import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '../route'

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 }
      )
    }

    const { voteCount } = await request.json()

    if (typeof voteCount !== 'number') {
      return NextResponse.json(
        { error: 'Vote count must be a number' },
        { status: 400 }
      )
    }

    if (voteCount < 0) {
      return NextResponse.json(
        { error: 'Vote count cannot be negative' },
        { status: 400 }
      )
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: { voteCount },
    })

    // Broadcast update to all connected clients
    broadcastUpdate({
      type: 'update',
      data: candidate,
    })

    return NextResponse.json(candidate)
  } catch (error: any) {
    console.error('Error updating candidate:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update candidate' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 }
      )
    }

    await prisma.candidate.delete({
      where: { id },
    })

    // Broadcast deletion to all connected clients
    broadcastUpdate({
      type: 'delete',
      data: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting candidate:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 }
    )
  }
}
