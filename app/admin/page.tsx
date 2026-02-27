'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Candidate } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [newCandidateName, setNewCandidateName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const ADMIN_PASSWORD = '@n3c0'

  // Check localStorage on mount to restore authentication
  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuth')
    if (savedAuth === 'true') {
      setIsAuthenticated(true)
    }
    setIsLoaded(true)
  }, [])

  // Handle password authentication
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('adminAuth', 'true')
      setPassword('')
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password')
      setPassword('')
    }
  }

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('adminAuth')
    setCandidates([])
  }

  useEffect(() => {
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

  // Add new candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCandidateName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCandidateName }),
      })

      if (response.ok) {
        setNewCandidateName('')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add candidate')
      }
    } catch (error) {
      console.error('Error adding candidate:', error)
      alert('Failed to add candidate')
    } finally {
      setIsLoading(false)
    }
  }

  // Update vote count (optimistic update for instant feedback)
  const handleUpdateVotes = async (id: number, newCount: number) => {
    if (newCount < 0) return

    const prevCandidates = [...candidates]
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, voteCount: newCount } : c
      )
    )

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteCount: newCount }),
      })

      if (!response.ok) {
        setCandidates(prevCandidates)
        const data = await response.json()
        alert(data.error || 'Failed to update votes')
      }
    } catch (error) {
      console.error('Error updating votes:', error)
      setCandidates(prevCandidates)
      alert('Failed to update votes')
    }
  }

  // Delete candidate (optimistic update for instant feedback)
  const handleDeleteCandidate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return

    const prevCandidates = [...candidates]
    setCandidates((prev) => prev.filter((c) => c.id !== id))

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setCandidates(prevCandidates)
        const data = await response.json()
        alert(data.error || 'Failed to delete candidate')
      }
    } catch (error) {
      console.error('Error deleting candidate:', error)
      setCandidates(prevCandidates)
      alert('Failed to delete candidate')
    }
  }

  // Filter candidates based on search query
  const filteredCandidates = candidates.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Password prompt screen
  if (!isLoaded) {
    return null // Loading state
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg shadow-slate-200/50">
            <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">
              Admin Panel
            </h1>
            <p className="text-slate-500 text-sm text-center mb-6">
              Aneco Employees' Credit Cooperative
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-3 rounded-xl transition-all duration-200 select-none touch-manipulation cursor-pointer"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  // Admin dashboard
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500 mt-0.5">Aneco Employees' Credit Cooperative</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates..."
                className="w-full sm:w-56 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-semibold text-sm rounded-lg transition-all duration-200 select-none touch-manipulation cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <p className="text-xs font-medium text-slate-600">
              {isConnected ? 'Live' : 'Reconnecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Add new candidate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Candidate</h3>
          <form onSubmit={handleAddCandidate} className="flex gap-3">
            <input
              type="text"
              value={newCandidateName}
              onChange={(e) => setNewCandidateName(e.target.value)}
              placeholder="Enter candidate name..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={isLoading || !newCandidateName.trim()}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none text-white font-semibold text-sm rounded-lg transition-all duration-200 select-none touch-manipulation cursor-pointer"
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        {/* Candidates list */}
        <div className="space-y-3">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">
                {candidates.length === 0 ? 'No candidates yet' : 'No matching candidates'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {candidates.length === 0 ? 'Add your first candidate above' : 'Try a different search term'}
              </p>
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 truncate">
                    {candidate.name}
                  </h3>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center min-w-[56px] px-3 py-1.5 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600 tabular-nums">
                      {candidate.voteCount}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">votes</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleUpdateVotes(
                          candidate.id,
                          candidate.voteCount - 1
                        )
                      }
                      className="w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-90 text-white font-bold text-lg rounded-lg transition-all duration-200 select-none touch-manipulation cursor-pointer"
                    >
                      −
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateVotes(
                          candidate.id,
                          candidate.voteCount + 1
                        )
                      }
                      className="w-9 h-9 flex items-center justify-center bg-green-500 hover:bg-green-600 active:scale-90 text-white font-bold text-lg rounded-lg transition-all duration-200 select-none touch-manipulation cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 font-semibold text-xs rounded-lg border border-slate-200 transition-all duration-200 select-none touch-manipulation cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
