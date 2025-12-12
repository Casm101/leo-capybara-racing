import "./App.css";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import { RaceTrack, StatusChip, WinnerList } from "./components/RaceUI";
import { useRaceClient } from "./useRaceClient";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

function RaceDisplay() {
    const { state, connected } = useRaceClient(WS_URL);
    const joinUrl = useMemo(() => `${window.location.origin}/`, []);
    const [qrData, setQrData] = useState<string | null>(null);
    const winners = state.winningBets;
    const showWinners = state.race.status === "finished" && winners.length > 0;

    useEffect(() => {
        QRCode.toDataURL(joinUrl, {
            width: 240,
            margin: 1,
            color: { light: "#0f172a", dark: "#e2e8f0" },
        })
            .then((url: string) => setQrData(url))
            .catch(() => setQrData(null));
    }, [joinUrl]);

    useEffect(() => {
        if (!showWinners) return;
        runSchoolPrideConfetti();
    }, [showWinners]);

    return (
        <div className="app-shell race-display-shell">
            <header className="top-bar">
                <div>
                    <p className="eyebrow">Horse Racing Track Display</p>
                    <h1>Race Board</h1>
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
                    <StatusChip
                        label={`${state.config.horseCount} horses`}
                        tone="muted"
                    />
                </div>
            </header>

            <div className="race-display race-display-single">
                <section className="panel main race-panel">
                    <div className="panel-header">
                        <div>
                            <p className="eyebrow">Live race</p>
                            <h2>
                                {state.race.status === "finished"
                                    ? `Winner: Horse ${state.race.winner}`
                                    : state.race.status === "running"
                                    ? "Race in progress"
                                    : "Waiting to start"}
                            </h2>
                        </div>
                        <p className="hint">Big-screen view for spectators.</p>
                    </div>
                    <RaceTrack state={state} />
                    <div className="panel subtle">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Winning bettors</p>
                                <h3>
                                    {state.race.status === "finished"
                                        ? `Horse ${state.race.winner} payouts`
                                        : "No winner yet"}
                                </h3>
                            </div>
                            <p className="hint">
                                Auto-refreshes as soon as the race ends.
                            </p>
                        </div>
                        <WinnerList winners={state.winningBets} myId={null} />
                    </div>
                </section>
            </div>

            {state.showQrOverlay && (
                <div className="overlay">
                    <div className="modal">
                        <div className="modal-grid">
                            <div className="qr-large">
                                {qrData ? (
                                    <img
                                        src={qrData}
                                        alt="QR code to join"
                                        className="qr-image"
                                    />
                                ) : (
                                    <div className="hint">QR unavailable</div>
                                )}
                                <div className="join-url">{joinUrl}</div>
                            </div>
                            <div className="panel subtle modal-list">
                                <p className="eyebrow">Players online</p>
                                <ul className="modal-players">
                                    {Object.values(state.players)
                                        .filter((player) => player.connected)
                                        .map((player) => (
                                            <li key={player.id}>
                                                {player.name}
                                            </li>
                                        ))}
                                    {!Object.values(state.players).filter(
                                        (p) => p.connected
                                    ).length && (
                                        <li className="hint">
                                            No one online yet.
                                        </li>
                                    )}
                                </ul>
                                <p className="hint">
                                    Tickets placed: {state.bets.length}
                                </p>
                            </div>
                        </div>
                        <p className="hint center">
                            Press toggle in admin to hide
                        </p>
                    </div>
                </div>
            )}
            {showWinners && (
                <div className="celebrate-overlay">
                    <div className="celebrate-card">
                        <p className="eyebrow">Winners</p>
                        <div className="winner-names">
                            {winners.map((winner) => (
                                <div key={winner.playerId}>
                                    {winner.playerName}
                                </div>
                            ))}
                        </div>
                        <p className="hint">Horse #{state.race.winner}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RaceDisplay;

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
