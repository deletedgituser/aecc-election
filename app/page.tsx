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
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/aecc.png"
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

      {/* Main Content - Dashboard */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Candidates</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{candidates.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Votes</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{candidates.reduce((sum, c) => sum + c.voteCount, 0)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leading</p>
            <p className="text-lg font-bold text-slate-900 mt-1 truncate">
              {candidates[0]?.name || '—'}
            </p>
          </div>
        </div>

        {/* Title Section */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Election Results</h2>
          <p className="text-sm text-slate-500 mt-0.5">Live vote count by candidate</p>
        </div>

        {/* Candidates List */}
        {candidates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No candidates yet</p>
            <p className="text-slate-400 text-sm mt-1">Results will appear here once voting begins</p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate, index) => {
              const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0)
              const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
              const isLeading = index === 0
              
              return (
                <div
                  key={candidate.id}
                  className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ${
                    isLeading ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Position Badge */}
                    <div className="flex-shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                        isLeading 
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Candidate Name */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 truncate">
                        {candidate.name}
                      </h3>
                      {isLeading && (
                        <span className="inline-block mt-0.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          Leading
                        </span>
                      )}
                    </div>

                    {/* Vote Count Display */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-2xl font-bold text-blue-600 leading-none tabular-nums">
                        {candidate.voteCount}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${percentage}%` }}
                    />
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
