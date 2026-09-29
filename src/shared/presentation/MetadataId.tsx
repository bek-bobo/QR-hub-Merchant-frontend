import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface MetadataIdProps extends Omit<ComponentProps<'span'>, 'children' | 'title'> {
  readonly value: string
  readonly variant?: 'primary' | 'secondary'
}

export function MetadataId({
  value,
  variant = 'primary',
  className,
  ...props
}: MetadataIdProps) {
  const constrained = value.length > 18

  return (
    <span
      title={value}
      className={cn(
        'block',
        constrained && 'max-w-56 truncate font-mono text-xs leading-5',
        variant === 'primary'
          ? 'font-medium text-foreground'
          : 'font-mono text-xs leading-5 text-muted-foreground',
        className,
      )}
      {...props}
    >
      {value}
    </span>
  )
}
