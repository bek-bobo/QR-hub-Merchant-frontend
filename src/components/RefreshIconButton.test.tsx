import type { ComponentProps, ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'
import { RefreshIconButton } from './RefreshIconButton'

describe('RefreshIconButton', () => {
  it('renders an accessible icon-only action with the update time in its tooltip', () => {
    const onClick = vi.fn()
    const html = renderToString(
      <RefreshIconButton updatedTime="14:49:07" onClick={onClick} />,
    )

    expect(html).toContain('aria-label="Yangilash"')
    expect(html).not.toContain('>Yangilash</button>')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('Yangilangan:')
    expect(html).toContain('14:49:07')

    const tree = RefreshIconButton({ updatedTime: '14:49:07', onClick }) as ReactElement<{
      children: readonly ReactElement<ComponentProps<typeof Button>>[]
    }>
    tree.props.children[0]?.props.onClick?.({} as never)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
