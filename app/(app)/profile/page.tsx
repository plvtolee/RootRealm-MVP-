import { requireSession } from '@/lib/auth/session'
import { getProfileOverview } from '@/lib/profile/queries'
import { AvatarWithBorder } from '@/components/avatar-with-border'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfilePage() {
  const { profile } = await requireSession()
  const { equipped, questsCompleted, progression } = await getProfileOverview(profile)

  const { level, totalXp, xpIntoLevel, xpForNextLevel, progressRatio } = progression
  const percent = Math.round(progressRatio * 100)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-5 sm:flex-row sm:items-center">
          <AvatarWithBorder
            avatarUrl={profile.avatar_url}
            username={profile.username}
            borderPreview={equipped?.preview_value ?? null}
            size="lg"
          />
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold">{profile.username}</p>
            <p className="text-sm text-muted-foreground">
              {equipped ? `Equipped: ${equipped.name}` : 'Default avatar border'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Level</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{level}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Coins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{profile.coins.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total XP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalXp.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quests completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{questsCompleted}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress to Level {level + 1}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {xpIntoLevel} / {xpForNextLevel} XP
            </span>
            <span>{percent}%</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP progress to level ${level + 1}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}