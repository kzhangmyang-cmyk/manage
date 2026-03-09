import { NextResponse } from 'next/server'
import { analyzeIssue } from '../../../lib/ai'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: unknown
    }

    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: '请先输入一条问题描述。' }, { status: 400 })
    }

    const result = await analyzeIssue(text)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 解析失败，请稍后重试。'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
