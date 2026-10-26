// Shared domain types for the RootRealm MVP.

export type Difficulty = 'easy' | 'medium' | 'hard';

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
}

export interface QuestCompletion {
  id: string;
  user_id: string;
  quest_id: string;
  xp_awarded: number;
  coins_awarded: number;
  completed_at: string;
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

/** Result returned by the complete_quest database function. */
export interface CompleteQuestResult {
  quest_completion_id: string;
  xp_awarded: number;
  coins_awarded: number;
  new_total_xp: number;
  new_coins: number;
}

/** Result returned by the purchase_cosmetic database function. */
export interface PurchaseCosmeticResult {
  cosmetic_id: string;
  price_paid: number;
  new_coins: number;
}