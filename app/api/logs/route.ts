import { NextResponse } from 'next/server'
import { listRecentExecutionLogs } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const logs = listRecentExecutionLogs(50)

    return NextResponse.json({ logs })
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取执行日志失败。'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
