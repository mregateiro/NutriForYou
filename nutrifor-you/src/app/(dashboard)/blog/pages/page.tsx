'use client'

import { useState, useEffect, useCallback } from 'react'

interface LandingPageItem {
  id: string
  title: string
  slug: string
  isPublished: boolean
  updatedAt: string
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newPage, setNewPage] = useState({ title: '', slug: '' })

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch('/api/blog/pages')
      const result = await res.json()
      setPages(result.data || [])
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPages() }, [fetchPages])

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const createPage = async () => {
    try {
      await fetch('/api/blog/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPage.title,
          slug: newPage.slug || generateSlug(newPage.title),
          sections: [],
        }),
      })
      setShowCreate(false)
      setNewPage({ title: '', slug: '' })
      fetchPages()
    } catch (error) {
      console.error('Failed to create page:', error)
    }
  }

  const deletePage = async (slug: string) => {
    if (!confirm('Delete this landing page?')) return
    try {
      await fetch(`/api/blog/pages/${slug}`, { method: 'DELETE' })
      fetchPages()
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }

  const togglePublish = async (slug: string, isPublished: boolean) => {
    try {
      await fetch(`/api/blog/pages/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !isPublished }),
      })
      fetchPages()
    } catch (error) {
      console.error('Failed to toggle publish:', error)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
          + New Page
        </button>
      </div>

      {showCreate && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-3">
          <input placeholder="Page title" value={newPage.title}
            onChange={(e) => setNewPage({ title: e.target.value, slug: generateSlug(e.target.value) })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Slug" value={newPage.slug}
            onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={createPage} disabled={!newPage.title}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            Create Page
          </button>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No landing pages created yet.</div>
      ) : (
        <div className="space-y-4">
          {pages.map((page) => (
            <div key={page.id} className="bg-white shadow rounded-lg px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{page.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">/{page.slug} · Updated {new Date(page.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  page.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {page.isPublished ? 'Published' : 'Draft'}
                </span>
                <button onClick={() => togglePublish(page.slug, page.isPublished)}
                  className="text-xs text-indigo-600 hover:text-indigo-800">
                  {page.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => deletePage(page.slug)}
                  className="text-xs text-red-600 hover:text-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
