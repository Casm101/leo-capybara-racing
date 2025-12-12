import { useEffect, useState } from "react";
import "./App.css";
import {
    BetTable,
    PlayerList,
    StatusChip,
    Toast,
    WinnerList,
} from "./components/RaceUI";
import { useRaceClient } from "./useRaceClient";
import type { PublicState } from "./types";
import { resolveWsUrl } from "./wsConfig";

const WS_URL = resolveWsUrl();

function AdminApp() {
    const { state, notice, connected, send } = useRaceClient(WS_URL);
    const [localNotice, setLocalNotice] = useState<string | null>(null);
    const [manualWinnerId, setManualWinnerId] = useState<number | "">("");
    const [trackLengthDraft, setTrackLengthDraft] = useState(
        state.config.trackLength
    );
    const [tickDraft, setTickDraft] = useState(state.config.tickMs);
    const [horseCountDraft, setHorseCountDraft] = useState(
        state.config.horseCount
    );
    const [qrOverlayOn, setQrOverlayOn] = useState(state.showQrOverlay);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
        null
    );
    const [balanceDraft, setBalanceDraft] = useState<number>(100);

    useEffect(() => {
        if (notice) setLocalNotice(notice);
    }, [notice]);

    useEffect(() => {
        setTrackLengthDraft(state.config.trackLength);
        setTickDraft(state.config.tickMs);
        setHorseCountDraft(state.config.horseCount);
    }, [state.config]);

    useEffect(() => {
        setQrOverlayOn(state.showQrOverlay);
    }, [state.showQrOverlay]);

    useEffect(() => {
        const connectedPlayers = Object.values(state.players).filter(
            (player) => player.connected
        );
        if (!selectedPlayerId && connectedPlayers.length) {
            setSelectedPlayerId(connectedPlayers[0].id);
            setBalanceDraft(connectedPlayers[0].balance);
        } else if (selectedPlayerId) {
            const current = state.players[selectedPlayerId];
            if (current?.connected) {
                setBalanceDraft(current.balance);
            } else if (!current) {
                setSelectedPlayerId(null);
            }
        }
    }, [state.players, selectedPlayerId]);

    const updateConfig = () => {
        send({
            type: "update_config",
            config: {
                horseCount: horseCountDraft,
                trackLength: trackLengthDraft,
                tickMs: tickDraft,
            },
        });
    };

    const handleManualWin = () => {
        if (!manualWinnerId) return;
        send({
            type: "admin_action",
            action: "manual_win",
            horseId: Number(manualWinnerId),
        });
    };

    return (
        <div className="app-shell">
            <header className="top-bar">
                <div>
                    <p className="eyebrow">Horse Racing Dashboard</p>
                    <h1>Admin Console</h1>
                </div>
                <div className="status-chips">
                    <StatusChip
                        label={connected ? "Connected" : "Disconnected"}
                        tone={connected ? "good" : "warn"}
                    />
                    <StatusChip
                        label={`Race: ${state.race.status}`}
                        tone="info"
                    />
                    <a className="ghost-button" href="/">
                        Back to bettors
                    </a>
                </div>
            </header>

            <div className="grid">
                <section className="panel main">
                    <AdminControls
                        state={state}
                        manualWinnerId={manualWinnerId}
                        setManualWinnerId={setManualWinnerId}
                        horseCountDraft={horseCountDraft}
                        tickDraft={tickDraft}
                        trackLengthDraft={trackLengthDraft}
                        setHorseCountDraft={setHorseCountDraft}
                        setTickDraft={setTickDraft}
                        setTrackLengthDraft={setTrackLengthDraft}
                        onUpdateConfig={updateConfig}
                        onManualWin={handleManualWin}
                        onStart={() =>
                            send({ type: "admin_action", action: "start" })
                        }
                        onStop={() =>
                            send({ type: "admin_action", action: "stop" })
                        }
                        onReset={() =>
                            send({ type: "admin_action", action: "reset" })
                        }
                        onToggleQr={() =>
                            send({ type: "admin_action", action: "toggle_qr" })
                        }
                        onNextRace={() =>
                            send({ type: "admin_action", action: "next_race" })
                        }
                        qrOverlayOn={qrOverlayOn}
                        selectedPlayerId={selectedPlayerId}
                        onSelectPlayer={setSelectedPlayerId}
                        balanceDraft={balanceDraft}
                        setBalanceDraft={setBalanceDraft}
                        onKick={() =>
                            selectedPlayerId &&
                            send({
                                type: "admin_action",
                                action: "kick_player",
                                playerId: selectedPlayerId,
                            })
                        }
                        onClearBets={() =>
                            selectedPlayerId &&
                            send({
                                type: "admin_action",
                                action: "clear_player_bets",
                                playerId: selectedPlayerId,
                            })
                        }
                        onSetBalance={() =>
                            selectedPlayerId &&
                            send({
                                type: "admin_action",
                                action: "set_balance",
                                playerId: selectedPlayerId,
                                amount: balanceDraft,
                            })
                        }
                    />

                    <div className="panel subtle" style={{ marginTop: 12 }}>
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Winning bettors</p>
                                <h3>
                                    {state.race.status === "finished"
                                        ? `Horse ${state.race.winner} payouts`
                                        : "Waiting for finish"}
                                </h3>
                            </div>
                            <p className="hint">
                                Updated instantly when the race closes.
                            </p>
                        </div>
                        <WinnerList winners={state.winningBets} myId={null} />
                    </div>
                </section>

                <aside className="panel sidebar">
                    <div className="panel subtle">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Lobby</p>
                                <h3>
                                    {Object.keys(state.players).length} players
                                </h3>
                            </div>
                            <p className="hint">
                                {
                                    Object.values(state.players).filter(
                                        (p) => p.connected
                                    ).length
                                }{" "}
                                online now
                            </p>
                        </div>
                        <PlayerList players={state.players} />
                    </div>

                    <div className="panel subtle">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Bets overview</p>
                                <h3>{state.bets.length} tickets</h3>
                            </div>
                            <p className="hint">
                                Adjust horses or reset to clear all bets.
                            </p>
                        </div>
                        <BetTable
                            bets={state.bets}
                            horses={state.horses}
                            players={state.players}
                        />
                    </div>
                </aside>
            </div>

            {localNotice && (
                <Toast
                    message={localNotice}
                    onDismiss={() => setLocalNotice(null)}
                />
            )}
        </div>
    );
}

function AdminControls({
    state,
    manualWinnerId,
    setManualWinnerId,
    horseCountDraft,
    tickDraft,
    trackLengthDraft,
    setHorseCountDraft,
    setTickDraft,
    setTrackLengthDraft,
    onUpdateConfig,
    onManualWin,
    onStart,
    onStop,
    onReset,
    onToggleQr,
    onNextRace,
    qrOverlayOn,
    selectedPlayerId,
    onSelectPlayer,
    balanceDraft,
    setBalanceDraft,
    onKick,
    onClearBets,
    onSetBalance,
}: {
    state: PublicState;
    manualWinnerId: number | "";
    setManualWinnerId: (value: number | "") => void;
    horseCountDraft: number;
    tickDraft: number;
    trackLengthDraft: number;
    setHorseCountDraft: (value: number) => void;
    setTickDraft: (value: number) => void;
    setTrackLengthDraft: (value: number) => void;
    onUpdateConfig: () => void;
    onManualWin: () => void;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    onToggleQr: () => void;
    onNextRace: () => void;
    qrOverlayOn: boolean;
    selectedPlayerId: string | null;
    onSelectPlayer: (id: string | null) => void;
    balanceDraft: number;
    setBalanceDraft: (value: number) => void;
    onKick: () => void;
    onClearBets: () => void;
    onSetBalance: () => void;
}) {
    return (
        <div className="panel subtle admin-panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Race controls</p>
                    <h3>Status: {state.race.status}</h3>
                </div>
                <p className="hint">
                    Start, pause, or finish the current race.
                </p>
            </div>
            <div className="control-row">
                <button onClick={onStart}>Start race</button>
                <button onClick={onStop}>Stop</button>
                <button onClick={onReset}>Reset</button>
                <button onClick={onNextRace}>Next race</button>
            </div>

            <div className="control-row">
                <button onClick={onToggleQr}>
                    {qrOverlayOn ? "Hide QR overlay" : "Show QR overlay"}
                </button>
            </div>

            <div className="form-grid compact" style={{ marginTop: 12 }}>
                <label htmlFor="horseCount">Horse count</label>
                <input
                    id="horseCount"
                    type="number"
                    min={1}
                    max={16}
                    value={horseCountDraft}
                    onChange={(event) =>
                        setHorseCountDraft(Number(event.target.value))
                    }
                    onBlur={onUpdateConfig}
                />
                <label htmlFor="trackLength">Track length</label>
                <input
                    id="trackLength"
                    type="number"
                    min={20}
                    max={300}
                    value={trackLengthDraft}
                    onChange={(event) =>
                        setTrackLengthDraft(Number(event.target.value))
                    }
                    onBlur={onUpdateConfig}
                />
                <label htmlFor="tickMs">Tick (ms)</label>
                <input
                    id="tickMs"
                    type="number"
                    min={200}
                    value={tickDraft}
                    onChange={(event) =>
                        setTickDraft(Number(event.target.value))
                    }
                    onBlur={onUpdateConfig}
                />
                <label htmlFor="manualWin">Manual win</label>
                <div className="control-row">
                    <select
                        id="manualWin"
                        value={manualWinnerId}
                        onChange={(event) =>
                            setManualWinnerId(
                                event.target.value
                                    ? Number(event.target.value)
                                    : ""
                            )
                        }
                    >
                        <option value="">Select horse</option>
                        {state.horses.map((horse) => (
                            <option value={horse.id} key={horse.id}>
                                #{horse.id} {horse.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={onManualWin}>Mark winner</button>
                </div>
            </div>

            <div className="panel-header" style={{ marginTop: 12 }}>
                <div>
                    <p className="eyebrow">Player management</p>
                    <h3>Kick, adjust balance, clear bets</h3>
                </div>
                <p className="hint">Only connected players are shown.</p>
            </div>
            <div className="form-grid compact">
                <label htmlFor="playerSelect">Select player</label>
                <select
                    id="playerSelect"
                    value={selectedPlayerId ?? ""}
                    onChange={(event) =>
                        onSelectPlayer(event.target.value || null)
                    }
                >
                    <option value="">Choose player</option>
                    {Object.values(state.players)
                        .filter((player) => player.connected)
                        .map((player) => (
                            <option key={player.id} value={player.id}>
                                {player.name} (${player.balance.toFixed(2)})
                            </option>
                        ))}
                </select>

                <label htmlFor="balanceInput">Balance</label>
                <div className="control-row">
                    <input
                        id="balanceInput"
                        type="number"
                        min={0}
                        step={1}
                        value={balanceDraft}
                        onChange={(event) =>
                            setBalanceDraft(Number(event.target.value))
                        }
                        disabled={!selectedPlayerId}
                    />
                    <button onClick={onSetBalance} disabled={!selectedPlayerId}>
                        Update balance
                    </button>
                </div>

                <div className="control-row">
                    <button onClick={onClearBets} disabled={!selectedPlayerId}>
                        Clear bets
                    </button>
                    <button onClick={onKick} disabled={!selectedPlayerId}>
                        Kick player
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminApp;
