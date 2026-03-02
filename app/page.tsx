'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Candidate } from '@/lib/types'
import { NOMINATION_CATEGORIES, getTopCount, type NominationCategoryId } from '@/lib/constants'

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<NominationCategoryId>('board_of_director')
  const [showSummary, setShowSummary] = useState(true)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [morphClass, setMorphClass] = useState('')
  const morphTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerViewSwitch = (nextShowSummary: boolean, nextCategory?: NominationCategoryId) => {
    if (nextCategory) {
      setActiveCategory(nextCategory)
    }

    if (showSummary === nextShowSummary) {
      return
    }

    if (morphTimeoutRef.current) {
      clearTimeout(morphTimeoutRef.current)
    }

    setMorphClass(nextShowSummary ? 'animate-live-to-summary' : 'animate-summary-to-live')
    setShowSummary(nextShowSummary)

    morphTimeoutRef.current = setTimeout(() => {
      setMorphClass('')
    }, 420)
  }

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

  useEffect(() => {
    return () => {
      if (morphTimeoutRef.current) {
        clearTimeout(morphTimeoutRef.current)
      }
    }
  }, [])

  const categoryCandidates = candidates.filter(
    (c) => (c.category || 'board_of_director') === activeCategory
  )
  const totalVotes = categoryCandidates.reduce((sum, c) => sum + c.voteCount, 0)

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.12]"
        style={{ backgroundImage: "url('/aecc.png')", backgroundSize: 'min(70vw, 700px)' }}
      />
      <div className="relative z-10">
      {/* Header Section */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
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
      <div className={`mx-auto px-6 py-6 ${showSummary ? 'max-w-[1600px]' : 'max-w-5xl'}`}>
        {/* View Toggle: Live Results | Election Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {NOMINATION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => triggerViewSwitch(false, cat.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 select-none touch-manipulation cursor-pointer ${
                  !showSummary && activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : showSummary
                    ? 'bg-white border border-slate-200 text-slate-500'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => triggerViewSwitch(!showSummary)}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 select-none touch-manipulation cursor-pointer flex items-center gap-2 ${
              showSummary
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                : 'bg-white border-2 border-blue-400 text-blue-700 hover:bg-blue-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showSummary ? 'Back to Live Results' : 'Election Summary'}
          </button>
        </div>

        {/* Election Summary Grid - displays on dashboard when button is clicked */}
        <div className={morphClass}>
        {showSummary ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Election Summary — All Representatives</h2>
            <p className="text-sm text-slate-500 -mt-4">Final results by position</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              {NOMINATION_CATEGORIES.map((cat) => {
                const catCandidates = candidates
                  .filter((c) => (c.category || 'board_of_director') === cat.id)
                  .sort((a, b) => b.voteCount - a.voteCount)
                const total = catCandidates.reduce((s, c) => s + c.voteCount, 0)
                const topCount = getTopCount(cat.id)
                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col max-h-[70vh]"
                  >
                    <h3 className="font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200 flex-shrink-0">
                      {cat.label}
                    </h3>
                    {catCandidates.length === 0 ? (
                      <p className="text-slate-400 text-sm flex-shrink-0">No candidates</p>
                    ) : (
                      <div className="summary-scroll space-y-2 overflow-y-auto min-h-0 flex-1 pr-2">
                        {catCandidates.map((c, i) => {
                          const pct = total > 0 ? (c.voteCount / total) * 100 : 0
                          const isTop = i < topCount
                          return (
                            <div
                              key={c.id}
                              className={`flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg ${
                                isTop ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                  isTop ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {i + 1}
                                </span>
                                <span className={`font-medium truncate ${isTop ? 'text-blue-900' : 'text-slate-700'}`}>
                                  {c.name}
                                </span>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <span className="font-bold text-blue-600 tabular-nums">{c.voteCount}</span>
                                <span className="text-xs text-slate-500 ml-1">({pct.toFixed(1)}%)</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Candidates</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{categoryCandidates.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Votes</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{totalVotes}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leading</p>
                  <p className="text-lg font-bold text-slate-900 mt-1 truncate">
                    {categoryCandidates[0]?.name || '—'}
                  </p>
                </div>
              </div>

              {/* Title Section */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {NOMINATION_CATEGORIES.find((c) => c.id === activeCategory)?.label} — Election Results
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Live vote count by candidate</p>
              </div>

              {/* Candidates List */}
              {categoryCandidates.length === 0 ? (
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
            {categoryCandidates.map((candidate, index) => {
              const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
              const topCount = getTopCount(activeCategory)
              const isTop = index < topCount
              
              return (
                <div
                  key={candidate.id}
                  className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ${
                    isTop ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Position Badge */}
                    <div className="flex-shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                        isTop 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
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
            </>
        )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes summary-to-live {
          0% {
            opacity: 0.7;
            transform: scale(0.985) translateY(8px);
            filter: blur(4px);
            border-radius: 20px;
          }
          65% {
            opacity: 1;
            transform: scale(1.01) translateY(-2px);
            filter: blur(0);
            border-radius: 14px;
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
            border-radius: 0;
          }
        }

        @keyframes live-to-summary {
          0% {
            opacity: 0.75;
            transform: scale(0.99) translateY(6px);
            filter: blur(3px);
            border-radius: 16px;
          }
          70% {
            opacity: 1;
            transform: scale(1.015) translateY(-2px);
            filter: blur(0);
            border-radius: 20px;
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
            border-radius: 0;
          }
        }

        .animate-summary-to-live {
          animation: summary-to-live 420ms cubic-bezier(0.2, 0.7, 0.2, 1);
          transform-origin: center top;
          will-change: transform, opacity, filter, border-radius;
        }

        .animate-live-to-summary {
          animation: live-to-summary 420ms cubic-bezier(0.2, 0.7, 0.2, 1);
          transform-origin: center top;
          will-change: transform, opacity, filter, border-radius;
        }
      `}</style>
      </div>
    </main>
  )
}
