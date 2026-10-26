import { cn } from '@/lib/cn'
import type { Difficulty } from '@/lib/types'

const styles: Record<Difficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-rose-100 text-rose-800 border-rose-200',
}

const label: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[difficulty]
      )}
    >
      {label[difficulty]}
    </span>
  )
}