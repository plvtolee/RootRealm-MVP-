// Shared domain types for the RootRealm MVP.

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ActivityType = 'commit' | 'merged_pr';

export type QuestProgressStatus = 'in_progress' | 'completed' | 'indeterminate';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  coins: number;
  equipped_cosmetic_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xp_reward: number;
  coin_reward: number;
  is_active: boolean;
  created_at: string;
  activity_type: ActivityType | null;
  requirement_count: number | null;
  window_days: number | null;
  exclude_merge_commits: boolean;
  repo_filter: string | null;
}

export interface QuestCompletion {
  id: string;
  user_id: string;
  quest_id: string;
  xp_awarded: number;
  coins_awarded: number;
  completed_at: string;
  source: string;
  evidence_count: number | null;
  progress_at_completion: number | null;
}

export interface Cosmetic {
  id: string;
  name: string;
  description: string;
  cosmetic_type: string;
  preview_value: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface UserCosmetic {
  id: string;
  user_id: string;
  cosmetic_id: string;
  purchased_at: string;
}

export interface GitHubConnection {
  user_id: string;
  github_login: string;
  github_user_id: number;
  scopes: string[];
  needs_reauth: boolean;
  last_synced_at: string | null;
  initial_sync_completed_at: string | null;
  commits_history_complete: boolean;
  prs_history_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  progress: number;
  target: number;
  status: QuestProgressStatus;
  last_evaluated_at: string;
}

/** Result returned by the evaluate_activity_quests database function. */
export interface EvaluateQuestRow {
  out_quest_id: string;
  out_progress: number;
  out_target: number;
  out_status: QuestProgressStatus;
  out_newly_completed: boolean;
  out_xp_awarded: number;
  out_coins_awarded: number;
  out_new_total_xp: number | null;
  out_new_coins: number | null;
}

/** Result returned by the purchase_cosmetic database function. */
export interface PurchaseCosmeticResult {
  cosmetic_id: string;
  price_paid: number;
  new_coins: number;
}
