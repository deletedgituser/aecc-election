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

  // Update vote count
  const handleUpdateVotes = async (id: number, newCount: number) => {
    if (newCount < 0) return

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteCount: newCount }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to update votes')
      }
    } catch (error) {
      console.error('Error updating votes:', error)
      alert('Failed to update votes')
    }
  }

  // Delete candidate
  const handleDeleteCandidate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return

    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to delete candidate')
      }
    } catch (error) {
      console.error('Error deleting candidate:', error)
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
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-lg">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">
              Admin Panel
            </h1>
            <p className="text-slate-600 text-center mb-6">
              Aneco Employees' Credit Cooperative
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
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
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">Aneco Employees' Credit Cooperative</p>
            </div>
            
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded transition-colors"
              >
                Logout
              </button>
              
              {/* Search bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-64 px-3 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            ></div>
            <p className="text-xs text-slate-600">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Add new candidate */}
        <div className="bg-white border border-slate-200 rounded p-3 mb-3 shadow-sm">
          <form onSubmit={handleAddCandidate} className="flex gap-2">
            <input
              type="text"
              value={newCandidateName}
              onChange={(e) => setNewCandidateName(e.target.value)}
              placeholder="Add candidate..."
              className="flex-1 px-3 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !newCandidateName.trim()}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold text-sm rounded transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        {/* Candidates list */}
        <div className="space-y-2">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-8 bg-white border border-slate-200 rounded shadow-sm">
              <p className="text-slate-600 text-sm">
                {candidates.length === 0
                  ? 'No candidates yet'
                  : 'No matching candidates'}
              </p>
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white border border-slate-200 rounded p-2.5 flex items-center justify-between shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {candidate.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Vote count display */}
                  <div className="text-center min-w-[50px]">
                    <p className="text-lg font-bold text-blue-600">
                      {candidate.voteCount}
                    </p>
                  </div>

                  {/* Vote controls */}
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        handleUpdateVotes(
                          candidate.id,
                          candidate.voteCount - 1
                        )
                      }
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded transition-colors"
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
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="px-2 py-1 bg-slate-400 hover:bg-slate-500 text-white font-semibold text-xs rounded transition-colors"
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
