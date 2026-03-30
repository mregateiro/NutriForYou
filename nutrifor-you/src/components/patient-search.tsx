'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface PatientOption {
  id: string
  firstName: string
  lastName: string
}

interface PatientSearchProps {
  value: string
  onChange: (patientId: string) => void
  required?: boolean
  id?: string
  /** Pre-selected patient to display on mount */
  initialPatient?: PatientOption | null
}

export default function PatientSearch({
  value,
  onChange,
  required,
  id,
  initialPatient,
}: PatientSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    initialPatient ?? null
  )
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync initialPatient prop
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient)
    }
  }, [initialPatient])

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/patients?query=${encodeURIComponent(q)}&perPage=10&sortBy=firstName&sortOrder=asc`
      )
      if (res.ok) {
        const data = await res.json()
        setResults(data.data || [])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (text: string) => {
    setQuery(text)
    setIsOpen(true)

    // Clear previous selection if user edits
    if (selectedPatient) {
      setSelectedPatient(null)
      onChange('')
    }

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      searchPatients(text)
    }, 300)
  }

  const handleSelect = (patient: PatientOption) => {
    setSelectedPatient(patient)
    setQuery(`${patient.firstName} ${patient.lastName}`)
    onChange(patient.id)
    setIsOpen(false)
    setResults([])
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Keep the hidden input in sync for form validation
  const displayValue = selectedPatient
    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
    : query

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        value={displayValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (query.length >= 1 && !selectedPatient) {
            setIsOpen(true)
          }
        }}
        placeholder="Type to search patients..."
        autoComplete="off"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : 'patient-listbox'}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {/* Hidden required input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      )}

      {isOpen && (
        <ul
          id={id ? `${id}-listbox` : 'patient-listbox'}
          role="listbox"
          className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-500">Searching...</li>
          )}
          {!loading && results.length === 0 && query.length >= 1 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              No patients found
            </li>
          )}
          {!loading &&
            results.map((patient) => (
              <li
                key={patient.id}
                role="option"
                aria-selected={patient.id === value}
                onClick={() => handleSelect(patient)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700"
              >
                {patient.firstName} {patient.lastName}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
