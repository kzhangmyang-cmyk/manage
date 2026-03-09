'use client'

import { useEffect, useState } from 'react'
import type { DashboardApiPayload } from '../../lib/types'

export function useDashboardSnapshot() {
  const [data, setData] = useState<DashboardApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchSnapshot() {
      try {
        const response = await fetch('/api/dashboard', {
          cache: 'no-store',
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? '读取管理者看板数据失败。')
        }

        const payload = (await response.json()) as DashboardApiPayload

        if (!cancelled) {
          setData(payload)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '读取管理者看板数据失败。')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchSnapshot()
    const timer = setInterval(() => {
      void fetchSnapshot()
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return { data, loading, error }
}
