type TechBrandIconProps = {
  slug: string
  color: string
  local?: boolean
  name: string
  size?: number
  className?: string
}

export function TechBrandIcon({
  slug,
  color,
  local,
  name,
  size = 26,
  className = '',
}: TechBrandIconProps) {
  const dim = `h-[${size}px] w-[${size}px]`
  const sizeClass = className || `${dim} object-contain`

  if (local && slug === 'playwright') {
    return (
      <svg viewBox="0 0 24 24" className={sizeClass} style={{ width: size, height: size }} aria-hidden>
        <path fill="#2EAD33" d="M12 2L2.5 7.5v9L12 22l9.5-5.5v-9L12 2z" opacity=".35" />
        <path fill="#D65300" d="M7.2 8.2l4.8 2.8 4.8-2.8L12 5.4 7.2 8.2z" />
        <path fill="#2EAD33" d="M6.5 9.3v5.4L11.2 17V11.6L6.5 9.3z" />
        <path fill="#1785FE" d="M12.8 11.6V17l4.7-2.3V9.3l-4.7 2.3z" />
      </svg>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.simpleicons.org/${slug}/${color}`}
      alt=""
      width={size}
      height={size}
      className={sizeClass}
      style={{ width: size, height: size }}
      loading="lazy"
      title={name}
    />
  )
}
