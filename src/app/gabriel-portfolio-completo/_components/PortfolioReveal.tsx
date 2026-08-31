import { cn } from '@/lib/utils'

type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur'

type PortfolioRevealProps = {
  children: React.ReactNode
  variant?: RevealVariant
  delay?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  as?: 'div' | 'section' | 'article'
}

export default function PortfolioReveal({
  children,
  variant = 'up',
  delay,
  className,
  as: Tag = 'div',
}: PortfolioRevealProps) {
  return (
    <Tag
      className={cn(
        'gop-reveal',
        `gop-reveal-${variant}`,
        delay ? `gop-reveal-delay-${delay}` : undefined,
        className
      )}
    >
      {children}
    </Tag>
  )
}
