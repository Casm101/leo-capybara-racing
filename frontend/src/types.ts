export type RaceStatus = 'idle' | 'ready' | 'running' | 'finished';

export interface Horse {
  id: number;
  name: string;
  odds: number;
  color: string;
  icon: string;
  stats: string;
}

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  balance: number;
}

export interface Bet {
  playerId: string;
  horseId: number;
  amount: number;
}

export interface RaceState {
  status: RaceStatus;
  positions: Record<number, number>;
  winner?: number;
  tick: number;
}

export interface ConfigState {
  horseCount: number;
  trackLength: number;
  tickMs: number;
}

export interface WinningBet {
  playerId: string;
  playerName: string;
  amount: number;
}

export interface PublicState {
  horses: Horse[];
  players: Record<string, Player>;
  bets: Bet[];
  race: RaceState;
  config: ConfigState;
  winningBets: WinningBet[];
  showQrOverlay: boolean;
}

export type ServerMessage =
  | { type: 'state'; payload: PublicState }
  | { type: 'joined'; playerId: string; name: string }
  | { type: 'notice'; message: string };

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'place_bet'; horseId: number; amount: number }
  | { type: 'logout' }
  | {
      type: 'admin_action';
      action:
        | 'start'
        | 'stop'
        | 'reset'
        | 'manual_win'
        | 'toggle_qr'
        | 'next_race'
        | 'kick_player'
        | 'set_balance'
        | 'clear_player_bets';
      horseId?: number;
      playerId?: string;
      amount?: number;
    }
  | { type: 'update_config'; config: Partial<Pick<ConfigState, 'horseCount' | 'trackLength' | 'tickMs'>> };
