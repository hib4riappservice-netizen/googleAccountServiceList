'use client'

import { useActionState } from 'react'
import writeXlsxFile from 'write-excel-file/browser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faArrowUpRightFromSquare,
  faFileCsv,
  faFileLines,
  faFileExcel,
} from '@fortawesome/free-solid-svg-icons'
import { scanServicesAction } from '@/app/actions/gmail'
import type { ScanResult } from '@/data/gmail'
import { toCsv, toMarkdown, toXlsxSheetData } from '@/lib/export-services'
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

function downloadXlsx(services: DetectedService[]) {
  void writeXlsxFile(toXlsxSheetData(services)).toFile('registered-services.xlsx')
}

export function ScanServicesPanel() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    () => scanServicesAction(),
    initialState,
  )

  return (
    <div className="scan-panel">
      <form action={formAction}>
        <button type="submit" className="button-primary" disabled={isPending}>
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
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
        <p className="empty-state">
          登録済みサービスは見つかりませんでした。件名に「ようこそ」「登録」等を含む案内メールが
          Gmail内に見当たらなかった可能性があります。
        </p>
      )}
      {state.status === 'success' && state.services.length > 0 && (
        <div className="results">
          <p className="result-summary">{state.services.length}件のサービスが見つかりました</p>
          <ul className="service-list">
            {state.services.map((service) => (
              <li key={service.senderDomain}>
                <span className="service-info">
                  <span className="service-name">{service.name}</span>
                  <span className="service-domain">{service.senderDomain}</span>
                </span>
                <a href={service.accessUrl} target="_blank" rel="noopener noreferrer">
                  サイトを開く
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <div className="download-group">
            <p className="download-label" id="download-group-label">
              ダウンロード
            </p>
            <div className="button-row" role="group" aria-labelledby="download-group-label">
              <button type="button" onClick={() => downloadCsv(state.services)}>
                <FontAwesomeIcon icon={faFileCsv} aria-hidden="true" />
                CSV
              </button>
              <button type="button" onClick={() => downloadMarkdown(state.services)}>
                <FontAwesomeIcon icon={faFileLines} aria-hidden="true" />
                Markdown
              </button>
              <button type="button" onClick={() => downloadXlsx(state.services)}>
                <FontAwesomeIcon icon={faFileExcel} aria-hidden="true" />
                Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
