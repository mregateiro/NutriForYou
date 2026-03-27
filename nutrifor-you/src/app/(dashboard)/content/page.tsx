'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface ContentArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  contentType: string
  category: string
  tags: string[]
  isPublished: boolean
  viewCount: number
  createdAt: string
  author: { name: string | null }
}

const TYPE_ICONS: Record<string, string> = {
  ARTICLE: '📄',
  VIDEO: '🎬',
  INFOGRAPHIC: '📊',
  STUDY: '🔬',
  GUIDE: '📖',
}

export default function ContentPage() {
  const [articles, setArticles] = useState<ContentArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ published: 'true' })
      if (typeFilter) params.set('contentType', typeFilter)
      const res = await fetch(`/api/content/articles?${params}`)
      const result = await res.json()
      setArticles(result.data || [])
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
        <div className="flex space-x-2">
          <Link href="/content/studies" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm">
            Studies
          </Link>
          <Link href="/content/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
            + New Article
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'ARTICLE', 'VIDEO', 'STUDY', 'GUIDE', 'INFOGRAPHIC'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No content articles yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <div key={article.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-2">
                <span>{TYPE_ICONS[article.contentType] || '📄'}</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{article.category}</span>
                {!article.isPublished && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Draft</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
              {article.summary && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
              )}
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>{article.author.name || 'Unknown'}</span>
                <span>{article.viewCount} views</span>
              </div>
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {article.tags.slice(0, 3).map((tag) => (
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
