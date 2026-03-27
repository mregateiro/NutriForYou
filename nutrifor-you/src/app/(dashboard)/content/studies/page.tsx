'use client'

import { useState, useEffect, useCallback } from 'react'

interface Study {
  id: string
  title: string
  authors: string[]
  journal: string | null
  year: number | null
  doi: string | null
  url: string | null
  abstract: string | null
  tags: string[]
  createdAt: string
  addedBy: { name: string | null }
}

export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newStudy, setNewStudy] = useState({
    title: '', authors: '', journal: '', year: '', doi: '', url: '', abstract: '', tags: '',
  })

  const fetchStudies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/content/studies?${params}`)
      const result = await res.json()
      setStudies(result.data || [])
    } catch (error) {
      console.error('Failed to fetch studies:', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchStudies() }, [fetchStudies])

  const addStudy = async () => {
    try {
      await fetch('/api/content/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newStudy.title,
          authors: newStudy.authors.split(',').map((a) => a.trim()).filter(Boolean),
          journal: newStudy.journal || undefined,
          year: newStudy.year ? Number(newStudy.year) : undefined,
          doi: newStudy.doi || undefined,
          url: newStudy.url || undefined,
          abstract: newStudy.abstract || undefined,
          tags: newStudy.tags ? newStudy.tags.split(',').map((t) => t.trim()) : [],
        }),
      })
      setShowAdd(false)
      setNewStudy({ title: '', authors: '', journal: '', year: '', doi: '', url: '', abstract: '', tags: '' })
      fetchStudies()
    } catch (error) {
      console.error('Failed to add study:', error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Study References</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
          + Add Study
        </button>
      </div>

      <input type="text" placeholder="Search studies..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-4 focus:border-indigo-500 focus:outline-none" />

      {showAdd && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-3">
          <input placeholder="Title" value={newStudy.title}
            onChange={(e) => setNewStudy({ ...newStudy, title: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Authors (comma-separated)" value={newStudy.authors}
            onChange={(e) => setNewStudy({ ...newStudy, authors: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Journal" value={newStudy.journal}
              onChange={(e) => setNewStudy({ ...newStudy, journal: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Year" type="number" value={newStudy.year}
              onChange={(e) => setNewStudy({ ...newStudy, year: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="DOI" value={newStudy.doi}
              onChange={(e) => setNewStudy({ ...newStudy, doi: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Abstract" rows={3} value={newStudy.abstract}
            onChange={(e) => setNewStudy({ ...newStudy, abstract: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={addStudy} disabled={!newStudy.title || !newStudy.authors}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            Save Study
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : studies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No study references found.</div>
      ) : (
        <div className="space-y-4">
          {studies.map((study) => (
            <div key={study.id} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900">{study.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{study.authors.join(', ')}</p>
              {study.journal && (
                <p className="text-xs text-gray-400 mt-0.5 italic">
                  {study.journal}{study.year ? ` (${study.year})` : ''}
                </p>
              )}
              {study.doi && (
                <p className="text-xs text-indigo-600 mt-1">DOI: {study.doi}</p>
              )}
              {study.abstract && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">{study.abstract}</p>
              )}
              {study.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {study.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
