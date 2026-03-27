'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '',
    status: 'DRAFT', tags: '', category: '',
    seoTitle: '', seoDescription: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          slug: form.slug || generateSlug(form.title),
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
        }),
      })
      if (res.ok) {
        router.push('/blog')
      } else {
        const result = await res.json()
        setError(result.error || 'Failed to create post')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Blog Post</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input type="text" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea rows={2} value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea required rows={10} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input type="text" value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title (max 60 chars)</label>
            <input type="text" maxLength={60} value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description (max 160 chars)</label>
            <textarea maxLength={160} rows={2} value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  )
}
