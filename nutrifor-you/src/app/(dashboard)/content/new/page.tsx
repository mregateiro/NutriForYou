'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewContentArticlePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', slug: '', summary: '', content: '',
    contentType: 'ARTICLE', category: '', tags: '',
    coverImageUrl: '', isPublished: false,
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
      const res = await fetch('/api/content/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          slug: form.slug || generateSlug(form.title),
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
          coverImageUrl: form.coverImageUrl || null,
        }),
      })
      if (res.ok) {
        router.push('/content')
      } else {
        const result = await res.json()
        setError(result.error || 'Failed to create article')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Content Article</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="ARTICLE">Article</option>
              <option value="VIDEO">Video</option>
              <option value="INFOGRAPHIC">Infographic</option>
              <option value="STUDY">Study</option>
              <option value="GUIDE">Guide</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" required value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <input type="text" value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea required rows={8} value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input type="text" value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="published" checked={form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
          <label htmlFor="published" className="text-sm text-gray-700">Publish immediately</label>
        </div>
        <button type="submit" disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Article'}
        </button>
      </form>
    </div>
  )
}
