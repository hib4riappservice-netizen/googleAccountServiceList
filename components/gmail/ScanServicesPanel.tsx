'use client'

import { useActionState } from 'react'
import { scanServicesAction } from '@/app/actions/gmail'
import type { ScanResult } from '@/data/gmail'

type State = ScanResult | { status: 'idle' }

const initialState: State = { status: 'idle' }

export function ScanServicesPanel() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    () => scanServicesAction(),
    initialState,
  )

  return (
    <div>
      <form action={formAction}>
        <button type="submit" disabled={isPending}>
          {isPending ? 'スキャン中…' : 'スキャン開始'}
        </button>
      </form>

      {state.status === 'unauthorized' && <p role="alert">サインインし直してください。</p>}
      {state.status === 'error' && (
        <p role="alert">時間をおいて再試行してください。解決しない場合はお問い合わせください。</p>
      )}
      {state.status === 'success' && state.services.length === 0 && (
        <p>登録済みサービスは見つかりませんでした。</p>
      )}
      {state.status === 'success' && state.services.length > 0 && (
        <ul>
          {state.services.map((service) => (
            <li key={service.senderDomain}>
              {service.name}（{service.senderDomain}）
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
