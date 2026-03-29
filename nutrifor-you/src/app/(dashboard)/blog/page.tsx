'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: string
  tags: string[]
  category: string | null
  viewCount: number
  publishedAt: string | null
  createdAt: string
  author: { name: string | null }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-700',
}

const STATUS_ICONS: Record<string, string> = {
  DRAFT: '●',
  PUBLISHED: '✓',
  ARCHIVED: '▪',
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/blog/posts?${params}`)
      const result = await res.json()
      setPosts(result.data || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <div className="flex space-x-2">
          <Link href="/blog/pages" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm">
            Landing Pages
          </Link>
          <Link href="/blog/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
            + New Post
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No blog posts yet.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status]}`}>
                      {STATUS_ICONS[post.status] || '●'} {post.status}
                    </span>
                  </div>
                  {post.excerpt && <p className="text-sm text-gray-500 mt-1">{post.excerpt}</p>}
                  <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                    <span>{post.author.name || 'Unknown'}</span>
                    <span>·</span>
                    <span>{post.viewCount} views</span>
                    {post.publishedAt && (
                      <>
                        <span>·</span>
                        <span>Published {new Date(post.publishedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {post.tags.map((tag) => (
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
