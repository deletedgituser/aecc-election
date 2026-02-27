'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Candidate } from '@/lib/types'

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Fetch initial candidates
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/candidates')
        const data = await response.json()
        setCandidates(data)
      } catch (error) {
        console.error('Error fetching candidates:', error)
      }
    }

    fetchCandidates()

    // Connect to SSE stream for real-time updates
    const connectStream = () => {
      const eventSource = new EventSource('/api/stream')

      eventSource.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'update' || message.type === 'init') {
            setCandidates(message.data)
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      })

      eventSource.addEventListener('open', () => {
        setIsConnected(true)
      })

      eventSource.addEventListener('error', () => {
        setIsConnected(false)
        eventSource.close()
        // Attempt to reconnect after 3 seconds
        setTimeout(connectStream, 3000)
      })

      return () => {
        eventSource.close()
      }
    }

    const cleanup = connectStream()

    return () => {
      cleanup()
    }
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/aneco2.png"
                alt="AECC Logo"
                width={40}
                height={40}
                priority
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">AECC Election</h1>
                <p className="text-xs text-slate-500">Aneco Employees' Credit Cooperative</p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              ></div>
              <p className="text-xs font-medium text-slate-600">
                {isConnected ? 'Live' : 'Connecting...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Title Section */}
        <div className="mb-3">
          <h2 className="text-2xl font-bold text-slate-900">Election Results</h2>
          {candidates.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Total: <span className="font-semibold text-slate-900">{candidates.reduce((sum, c) => sum + c.voteCount, 0)}</span> votes
            </p>
          )}
        </div>

        {/* Candidates List */}
        {candidates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-600">No candidates yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((candidate, index) => {
              const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0)
              const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
              
              return (
                <div
                  key={candidate.id}
                  className="bg-white border border-slate-200 rounded p-2.5 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Position Badge */}
                    <div className="flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-xs">{index + 1}</span>
                      </div>
                    </div>
                    
                    {/* Candidate Name */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {candidate.name}
                      </h3>
                    </div>

                    {/* Vote Count Display */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-2xl font-black text-blue-600 leading-none">
                        {candidate.voteCount}
                      </p>
                      <p className="text-xs text-slate-400 font-semibold">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-1.5 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
