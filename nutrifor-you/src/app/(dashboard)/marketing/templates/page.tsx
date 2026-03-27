'use client'

import { useState, useEffect, useCallback } from 'react'

interface Template {
  id: string
  name: string
  subject: string
  variables: string[]
  createdAt: string
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', htmlBody: '', variables: '' })

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/templates')
      const result = await res.json()
      setTemplates(result.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const createTemplate = async () => {
    await fetch('/api/marketing/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTemplate,
        variables: newTemplate.variables ? newTemplate.variables.split(',').map((v) => v.trim()) : [],
      }),
    })
    setShowCreate(false)
    setNewTemplate({ name: '', subject: '', htmlBody: '', variables: '' })
    fetchTemplates()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/marketing/templates/${id}`, { method: 'DELETE' })
    fetchTemplates()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
          + New Template
        </button>
      </div>

      {showCreate && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Template name" value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Subject line" value={newTemplate.subject}
              onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="HTML body" rows={5} value={newTemplate.htmlBody}
            onChange={(e) => setNewTemplate({ ...newTemplate, htmlBody: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Variables (comma-separated, e.g. name, email)" value={newTemplate.variables}
            onChange={(e) => setNewTemplate({ ...newTemplate, variables: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={createTemplate} disabled={!newTemplate.name || !newTemplate.subject || !newTemplate.htmlBody}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
            Create
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No email templates created yet.</div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white shadow rounded-lg px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500">Subject: {template.subject}</p>
                {template.variables.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {template.variables.map((v) => (
                      <span key={v} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => deleteTemplate(template.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
