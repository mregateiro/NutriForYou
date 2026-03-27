'use client'

import { useState, useEffect, useCallback } from 'react'

interface KBArticle {
  id: string
  title: string
  slug: string
  category: string
  tags: string[]
  viewCount: number
  createdAt: string
  author: { name: string | null }
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ published: 'true' })
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/support/kb?${params}`)
      const result = await res.json()
      setArticles(result.data || [])
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const categories = Array.from(new Set(articles.map((a) => a.category)))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Knowledge Base</h1>

      {categories.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              !categoryFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No articles available yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <div key={article.id} className="bg-white shadow rounded-lg p-6">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{article.category}</span>
              <h3 className="text-lg font-semibold text-gray-900 mt-2">{article.title}</h3>
              <div className="flex items-center space-x-3 mt-3 text-xs text-gray-500">
                <span>{article.viewCount} views</span>
                <span>·</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {article.tags.map((tag) => (
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
