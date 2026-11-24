import type { Lenda } from './data/lendas'
// O arquivo público é compartilhado com a RA, sem import.meta.env em scripts estáticos.
// @ts-expect-error módulo JavaScript público, tipado na interface abaixo
import { api as request } from '../public/api.js'

export type User = { id: string; username: string; email: string }
export type AlbumResult = {
  positions: { numero: number; unlocked: boolean; legend: Lenda | null; collected_at: string | null }[]
  progress: { total: number; obtained: number; remaining: number; complete: boolean }
}
export const api: <T>(path: string, options?: RequestInit) => Promise<T> = request

// O cliente compartilhado sinaliza login, logout e expiração, inclusive entre abas.

export type RewardStatus = {
  available: boolean; local_date: string; server_now: string; next_available_at: string;
  timezone: string; complete: boolean; progress: AlbumResult['progress'];
  today_reward: { id: string; legend_id: string; claimed_at: string; is_new: boolean | null } | null;
}
export type RewardHistory = {
  items: { id: string; legend_id: string | null; legend: Lenda | null; claimed_at: string;
    reward_date: string; is_new: boolean | null; legacy: boolean; successful: boolean }[];
  total: number; limit: number; offset: number; has_more: boolean;
}
