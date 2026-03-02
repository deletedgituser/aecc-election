'use client'

import { useEffect, useRef, useState } from 'react'
import { Candidate } from '@/lib/types'
import { MEMBERS, NOMINATION_CATEGORIES, type NominationCategoryId } from '@/lib/constants'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [activeCategory, setActiveCategory] = useState<NominationCategoryId>('board_of_director')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [newCandidateName, setNewCandidateName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ADMIN_PASSWORD = '@n3c0'

  const suggestions = newCandidateName.trim()
    ? MEMBERS.filter((m) =>
        m.toLowerCase().includes(newCandidateName.toLowerCase())
      )
    : []

  const selectSuggestion = (name: string) => {
    setNewCandidateName(name)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      )
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

    // Fetch all candidates (stream sends all; we filter by category client-side)
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

  // Add new candidate (always uses active category)
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCandidateName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCandidateName.trim(), category: activeCategory }),
      })

      if (response.ok) {
        const newCandidate = await response.json()
        setCandidates((prev) => [...prev, newCandidate].sort((a, b) => b.voteCount - a.voteCount))
        setNewCandidateName('')
      } else {
        const data = await response.json()
        const msg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to add candidate')
        alert(msg)
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

  // Filter candidates by active category and search query
  const filteredCandidates = candidates
    .filter((c) => (c.category || 'board_of_director') === activeCategory)
    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

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
        {/* Category Navigation */}
        <div className="flex flex-nowrap items-center gap-2 mb-6 overflow-x-auto pb-1">
          {NOMINATION_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 select-none touch-manipulation cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates..."
            className="shrink-0 w-64 ml-auto px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />
        </div>

        {/* Add new candidate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Add Candidate — {NOMINATION_CATEGORIES.find((c) => c.id === activeCategory)?.label}
          </h3>
          <form onSubmit={handleAddCandidate} className="flex gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={newCandidateName}
                onChange={(e) => {
                  setNewCandidateName(e.target.value)
                  setShowSuggestions(true)
                  setHighlightedIndex(-1)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type to search members..."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-lg bg-white border border-slate-200 shadow-lg"
                >
                  {suggestions.map((name, i) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectSuggestion(name)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                        i === highlightedIndex
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
