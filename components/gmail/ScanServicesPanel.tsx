'use client'

import { useActionState } from 'react'
import { scanServicesAction } from '@/app/actions/gmail'
import type { ScanResult } from '@/data/gmail'
import { toCsv, toMarkdown } from '@/lib/export-services'
import type { DetectedService } from '@/lib/detect-services'

type State = ScanResult | { status: 'idle' }

const initialState: State = { status: 'idle' }

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadCsv(services: DetectedService[]) {
  // ExcelでBOM無しCSVを開くと日本語が文字化けするため付与する
  downloadFile('registered-services.csv', '﻿' + toCsv(services), 'text/csv;charset=utf-8')
}

function downloadMarkdown(services: DetectedService[]) {
  downloadFile('registered-services.md', toMarkdown(services), 'text/markdown;charset=utf-8')
}

export function ScanServicesPanel() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    () => scanServicesAction(),
    initialState,
  )

  return (
    <div>
      <form action={formAction}>
        <button type="submit" className="button-primary" disabled={isPending}>
          {isPending ? 'スキャン中…' : 'スキャン開始'}
        </button>
      </form>

      {state.status === 'unauthorized' && <p role="alert">サインインし直してください。</p>}
      {state.status === 'rate_limited' && (
        <p role="alert">
          短時間に何度もスキャンされたため、少し時間をおいてから再試行してください。
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert">
          Gmailの読み込みに失敗しました。時間をおいて再試行してください。解決しない場合はエラーID
          <code>{state.errorId}</code>とともにお問い合わせください。
        </p>
      )}
      {state.status === 'success' && state.services.length === 0 && (
        <p>登録済みサービスは見つかりませんでした。</p>
      )}
      {state.status === 'success' && state.services.length > 0 && (
        <>
          <ul className="service-list">
            {state.services.map((service) => (
              <li key={service.senderDomain}>
                {service.name} <span className="service-domain">（{service.senderDomain}）</span>
                {' — '}
                <a href={service.accessUrl} target="_blank" rel="noopener noreferrer">
                  サイトを開く
                </a>
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" onClick={() => downloadCsv(state.services)}>
              CSVでダウンロード
            </button>
            <button type="button" onClick={() => downloadMarkdown(state.services)}>
              Markdownでダウンロード
            </button>
          </div>
        </>
      )}
    </div>
  )
}
