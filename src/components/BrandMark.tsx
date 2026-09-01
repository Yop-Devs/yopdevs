'use client'

import { Wallpoet } from 'next/font/google'

const wallpoet = Wallpoet({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-yop-brand',
})

type BrandMarkProps = {
  className?: string
  textClassName?: string
}

export default function BrandMark({ className = '', textClassName = 'text-2xl sm:text-3xl' }: BrandMarkProps) {
  return (
    <span className={`yop-brand ${wallpoet.className} ${className}`} aria-label="YOP Devs">
      <span className={`yop-brand-text ${textClassName}`} aria-hidden>
        YOP Devs
      </span>
    </span>
  )
}
