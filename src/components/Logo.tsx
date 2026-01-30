'use client'

import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-logo',
})

type LogoProps = {
  className?: string
  /** 'dark' = roxo escuro (fundo claro); 'light' = branco (fundo escuro) */
  variant?: 'dark' | 'light'
  /** Tamanho: sm, base, lg */
  size?: 'sm' | 'base' | 'lg'
}

const sizeClasses = {
  sm: 'text-base md:text-lg',
  base: 'text-xl md:text-2xl',
  lg: 'text-3xl md:text-4xl',
}

export default function Logo({ className = '', variant = 'dark', size = 'base' }: LogoProps) {
  return (
    <span
      className={`${fredoka.className} font-bold uppercase tracking-tight ${sizeClasses[size]} ${
        variant === 'light' ? 'text-white' : 'text-[#4c1d95]'
      } ${className}`}
    >
      YOP Devs
    </span>
  )
}

export { fredoka }
