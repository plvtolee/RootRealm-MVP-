import { cn } from '@/lib/cn'

const borderClass: Record<string, string> = {
  basic: 'avatar-border-basic',
  silver: 'avatar-border-silver',
  gold: 'avatar-border-gold',
  neon: 'avatar-border-neon',
}

interface AvatarWithBorderProps {
  avatarUrl: string | null
  username: string
  borderPreview: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-16 w-16 text-lg',
  lg: 'h-24 w-24 text-2xl',
}

export function AvatarWithBorder({
  avatarUrl,
  username,
  borderPreview,
  size = 'md',
  className,
}: AvatarWithBorderProps) {
  const ring = borderPreview ? borderClass[borderPreview] ?? '' : ''

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        sizeClass[size],
        ring,
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={`${username}'s avatar`} className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold uppercase text-muted-foreground">
          {username.slice(0, 2)}
        </span>
      )}
    </div>
  )
}