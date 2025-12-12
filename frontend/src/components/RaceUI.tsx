import { useEffect } from 'react';
import type { Bet, Horse, PublicState, WinningBet } from '../types';

export function RaceTrack({ state, focusHorseId }: { state: PublicState; focusHorseId?: number }) {
  const trackLength = state.config.trackLength || 100;
  return (
    <div className="track">
      {state.horses.map((horse) => {
        const progress = Math.min(
          100,
          ((state.race.positions[horse.id] ?? 0) / trackLength) * 100,
        );
        return (
          <div className="lane" key={horse.id}>
            <div className="lane-label">
              <span className="lane-number">#{horse.id}</span>
              <span>{horse.name}</span>
            </div>
            <div className="lane-track">
              <div className="finish-line" />
              <div
                className={`horse-avatar ${focusHorseId === horse.id ? 'focus' : ''}`}
                style={{ left: `${progress}%`, background: horse.color }}
              >
                {horse.icon}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PlayerList({
  players,
}: {
  players: Record<string, { name: string; connected: boolean; balance: number }>;
}) {
  const entries = Object.entries(players).sort(([, a], [, b]) => b.balance - a.balance);
  return (
    <div className="list">
      {entries.map(([playerId, player], index) => (
        <div className={`list-row leaderboard ${index < 3 ? `medal-${index + 1}` : ''}`} key={playerId}>
          <div>
            <p className="eyebrow">{player.name}</p>
            <p className="hint">{player.connected ? 'Online' : 'Offline'}</p>
          </div>
          <div className="leaderboard-right">
            <span className="balance">${player.balance.toFixed(2)}</span>
            <div className={`presence ${player.connected ? 'on' : 'off'}`} />
          </div>
        </div>
      ))}
      {!entries.length && <p className="hint">Waiting for players.</p>}
    </div>
  );
}

export function BetTable({
  bets,
  horses,
  players,
}: {
  bets: Bet[];
  horses: Horse[];
  players: Record<string, { name: string; balance: number }>;
}) {
  if (!bets.length) return <p className="hint">No bets yet.</p>;
  return (
    <div className="list">
      {bets.map((bet) => {
        const horse = horses.find((item) => item.id === bet.horseId);
        const player = players[bet.playerId];
        return (
          <div className="list-row" key={`${bet.playerId}-${bet.horseId}`}>
            <div>
              <p className="eyebrow">{player?.name ?? 'Player'}</p>
              <p className="hint">
                Horse {horse?.id ?? bet.horseId} · {horse?.name ?? 'Unknown'}
              </p>
            </div>
            <p className="bet-amount">{bet.amount}</p>
          </div>
        );
      })}
    </div>
  );
}

export function WinnerList({ winners, myId }: { winners: WinningBet[]; myId: string | null }) {
  if (!winners.length) return <p className="hint">No winning tickets yet.</p>;
  return (
    <div className="list">
      {winners.map((winner) => (
        <div className={`list-row ${winner.playerId === myId ? 'highlight' : ''}`} key={winner.playerId}>
          <div>
            <p className="eyebrow">{winner.playerName}</p>
            <p className="hint">Bet {winner.amount}</p>
          </div>
          <p className="bet-amount">+{winner.amount * 2}</p>
        </div>
      ))}
    </div>
  );
}

export function StatusChip({ label, tone }: { label: string; tone: 'good' | 'warn' | 'info' | 'muted' }) {
  return <span className={`status-chip ${tone}`}>{label}</span>;
}

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div className="toast" onClick={onDismiss}>
      {message}
    </div>
  );
}
