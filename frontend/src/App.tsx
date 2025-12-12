import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import confetti from "canvas-confetti";
import "./App.css";
import {
    BetTable,
    PlayerList,
    RaceTrack,
    StatusChip,
    Toast,
    WinnerList,
} from "./components/RaceUI";
import { useRaceClient } from "./useRaceClient";
import type { Horse } from "./types";

type Step = "name" | "horse" | "race";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";
const MIN_NAME_LENGTH = 3;

function App() {
    const {
        state,
        playerId,
        notice,
        connected,
        send,
        forceReconnect,
        logout,
    } = useRaceClient(WS_URL);
    const [step, setStep] = useState<Step>("name");
    const [screenName, setScreenName] = useState("");
    const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState(25);
    const [localNotice, setLocalNotice] = useState<string | null>(null);

    useEffect(() => {
        if (notice) {
            setLocalNotice(notice);
        }
    }, [notice]);

    useEffect(() => {
        if (playerId && step === "name") {
            setStep("horse");
        }
    }, [playerId, step]);

    useEffect(() => {
        if (
            (state.race.status === "running" ||
                state.race.status === "finished") &&
            step !== "race"
        ) {
            setStep("race");
        }
    }, [state.race.status, step]);

    useEffect(() => {
        if (
            playerId &&
            (state.race.status === "idle" || state.race.status === "ready")
        ) {
            setStep("horse");
            setSelectedHorse(state.horses[0]?.id ?? null);
        }
    }, [playerId, state.race.status, state.horses]);

    useEffect(() => {
        if (!selectedHorse && state.horses.length) {
            setSelectedHorse(state.horses[0].id);
        }
    }, [selectedHorse, state.horses]);

    useEffect(() => {
        if (playerId) {
            const playerName = state.players[playerId]?.name;
            if (playerName) setScreenName(playerName);
        }
    }, [playerId, state.players]);

    const nameTaken = useMemo(() => {
        const target = screenName.trim().toLowerCase();
        return Object.values(state.players).some(
            (player) =>
                player.name.toLowerCase() === target &&
                (!playerId || player.id !== playerId)
        );
    }, [screenName, state.players, playerId]);

    const myBet = useMemo(
        () => state.bets.find((bet) => bet.playerId === playerId),
        [state.bets, playerId]
    );

    const winningBettors = state.winningBets;
    const selectedHorseData = state.horses.find(
        (horse) => horse.id === selectedHorse
    );
    const myDisplayName = playerId
        ? state.players[playerId]?.name ?? screenName
        : "";
    const didWin =
        state.race.status === "finished" &&
        myBet &&
        state.race.winner &&
        myBet.horseId === state.race.winner;

    useEffect(() => {
        if (playerId && !state.players[playerId]) {
            setStep("name");
            setScreenName("");
        }
    }, [playerId, state.players]);

    useEffect(() => {
        if (!didWin) return;
        runSchoolPrideConfetti();
    }, [didWin]);

    const handleJoin = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = screenName.trim();
        if (trimmed.length < MIN_NAME_LENGTH) {
            setLocalNotice("Pick a name at least 3 characters long.");
            return;
        }
        if (nameTaken) {
            setLocalNotice("That name is already in play. Try another.");
            return;
        }

        send({ type: "join", name: trimmed });
    };

    const handlePlaceBet = () => {
        if (!playerId) {
            setLocalNotice("Join the lobby first.");
            setStep("name");
            return;
        }
        if (!selectedHorse) {
            setLocalNotice("Select a horse to back.");
            return;
        }

        const safeAmount =
            Number.isFinite(betAmount) && betAmount > 0 ? betAmount : 10;
        send({ type: "place_bet", horseId: selectedHorse, amount: safeAmount });
        setLocalNotice("Bet submitted. Good luck!");
        setStep("race");
    };

    return (
        <div className="app-shell">
            <header className="top-bar">
                <div>
                    <p className="eyebrow">Horse Racing Lounge</p>
                    <h1>Live Horse Race Betting</h1>
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
                    {playerId ? (
                        <StatusChip
                            label={`You: ${myDisplayName || "Ready"}`}
                            tone="muted"
                        />
                    ) : (
                        <StatusChip label="Guest" tone="muted" />
                    )}
                    <button className="ghost-button" onClick={forceReconnect}>
                        Reconnect
                    </button>
                    {playerId && (
                        <button
                            className="ghost-button"
                            onClick={() => {
                                logout();
                                setStep("name");
                                setScreenName("");
                            }}
                        >
                            Logout
                        </button>
                    )}
                </div>
            </header>

            <div className="grid">
                <section className="panel main">
                    {step === "name" && (
                        <div className="stack">
                            <div className="panel subtle">
                                <div className="panel-header">
                                    <div>
                                        <p className="eyebrow">Join</p>
                                        <h2>Enter your screen name</h2>
                                    </div>
                                    <p className="hint">
                                        Choose a unique screen name to enter the
                                        lounge.
                                    </p>
                                </div>
                                <form
                                    className="form-grid"
                                    onSubmit={handleJoin}
                                >
                                    <label htmlFor="screenName">
                                        Screen name
                                    </label>
                                    <input
                                        id="screenName"
                                        type="text"
                                        placeholder="DesertDasher"
                                        value={screenName}
                                        onChange={(event) =>
                                            setScreenName(event.target.value)
                                        }
                                    />
                                    <div className="form-meta">
                                        <p>
                                            {MIN_NAME_LENGTH}+ letters, visible
                                            to admins and bettors.
                                        </p>
                                        {nameTaken && (
                                            <p className="warning">
                                                Name already taken.
                                            </p>
                                        )}
                                    </div>
                                    <button className="primary" type="submit">
                                        Continue to horses
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {step === "horse" && (
                        <div className="stack">
                            <div className="panel-header">
                                <div>
                                    <p className="eyebrow">Pick your horse</p>
                                    <h2>
                                        {state.config.horseCount} lanes, one
                                        winner
                                    </h2>
                                </div>
                                <p className="hint">
                                    Tap a horse to see its odds and back it with
                                    your wager.
                                </p>
                            </div>
                            <div className="horse-grid">
                                {state.horses.map((horse) => (
                                    <HorseCard
                                        key={horse.id}
                                        horse={horse}
                                        selected={selectedHorse === horse.id}
                                        onSelect={() =>
                                            setSelectedHorse(horse.id)
                                        }
                                    />
                                ))}
                            </div>
                            <div className="panel subtle bet-panel">
                                <div>
                                    <p className="eyebrow">Your wager</p>
                                    <h3>
                                        {selectedHorseData
                                            ? selectedHorseData.name
                                            : "Select a horse"}{" "}
                                        {selectedHorseData
                                            ? `(odds ${selectedHorseData.odds}x)`
                                            : ""}
                                    </h3>
                                    <p className="hint">
                                        Adjust the stake and lock it in.
                                    </p>
                                </div>
                                <div className="bet-inputs">
                                    <div>
                                        <label htmlFor="betAmount">
                                            Bet amount
                                        </label>
                                        <input
                                            id="betAmount"
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={betAmount}
                                            onChange={(event) =>
                                                setBetAmount(
                                                    Number(event.target.value)
                                                )
                                            }
                                        />
                                    </div>
                                    <button
                                        className="primary"
                                        onClick={handlePlaceBet}
                                    >
                                        Place bet
                                    </button>
                                </div>
                                {myBet && (
                                    <p className="hint">
                                        Current bet: {myBet.amount} on horse #
                                        {myBet.horseId}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === "race" && (
                        <div className="stack">
                            <div className="panel-header">
                                <div>
                                    <p className="eyebrow">Live race</p>
                                    <h2>
                                        {state.race.status === "finished"
                                            ? `Winner: Horse ${state.race.winner}`
                                            : "Track view"}
                                    </h2>
                                </div>
                                <p className="hint">
                                    Horses sprint down a straight track.
                                    Positions update in real time.
                                </p>
                            </div>
                            <RaceTrack
                                state={state}
                                focusHorseId={myBet?.horseId}
                            />
                            <div className="panel subtle">
                                <div className="panel-header">
                                    <div>
                                        <p className="eyebrow">
                                            Winning bettors
                                        </p>
                                        <h3>
                                            {state.race.status === "finished"
                                                ? `Horse ${state.race.winner} payouts`
                                                : "Waiting for a winner"}
                                        </h3>
                                    </div>
                                    <p className="hint">
                                        Every player who backed the winning
                                        horse appears in real time.
                                    </p>
                                </div>
                                <WinnerList
                                    winners={winningBettors}
                                    myId={playerId}
                                />
                            </div>
                        </div>
                    )}
                </section>

                <aside className="panel sidebar">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Lobby</p>
                            <h3>Players & Bets</h3>
                        </div>
                        <p className="hint">
                            {Object.keys(state.players).length} players
                        </p>
                    </div>
                    <PlayerList players={state.players} />
                    <BetTable
                        bets={state.bets}
                        horses={state.horses}
                        players={state.players}
                    />
                </aside>
            </div>

            {localNotice && (
                <Toast
                    message={localNotice}
                    onDismiss={() => setLocalNotice(null)}
                />
            )}
            {didWin && (
                <div className="celebrate-overlay">
                    <div className="celebrate-card">
                        <p className="eyebrow">Winner</p>
                        <h1>You Won!</h1>
                        <p className="hint">Horse #{myBet?.horseId}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function HorseCard({
    horse,
    selected,
    onSelect,
}: {
    horse: Horse;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            className={`horse-card ${selected ? "selected" : ""}`}
            onClick={onSelect}
            type="button"
        >
            <div className="horse-badge" style={{ background: horse.color }}>
                <span>{horse.icon}</span>
                <span className="horse-number">#{horse.id}</span>
            </div>
            <div className="horse-copy">
                <p className="eyebrow">{horse.name}</p>
                <h4>{horse.stats}</h4>
                <p className="hint">Odds {horse.odds}x</p>
            </div>
            <div className="odds-chip">Back</div>
        </button>
    );
}

function runSchoolPrideConfetti() {
    const duration = 1800;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 55, ticks: 60, zIndex: 100 };
    const colors = ["#bb0000", "#ffffff", "#FFD700"];

    function shoot() {
        confetti({
            ...defaults,
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
        });
        confetti({
            ...defaults,
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
        });
    }

    const interval = window.setInterval(() => {
        if (Date.now() > animationEnd) {
            window.clearInterval(interval);
            return;
        }
        shoot();
    }, 120);
}

export default App;
