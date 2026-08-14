import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home', () => {
  it('見出しを表示する', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('準備中')
  })
})
