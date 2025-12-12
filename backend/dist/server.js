import http from 'http';
import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
const PORT = Number(process.env.PORT ?? 4000);
const DEFAULT_HORSE_COUNT = Number(process.env.HORSE_COUNT ?? 10);
const httpServer = http.createServer();
const wss = new WebSocketServer({ server: httpServer });
const players = new Map();
const connections = new Map();
let bets = [];
let horses = buildHorses(DEFAULT_HORSE_COUNT);
let race = createRace();
let config = {
    horseCount: DEFAULT_HORSE_COUNT,
    trackLength: 100,
    tickMs: 600,
    baseStep: 6,
};
let showQrOverlay = true;
const STARTING_BALANCE = 100;
let tickInterval = null;
function createRace() {
    return {
        status: 'idle',
        positions: {},
        winner: undefined,
        tick: 0,
    };
}
function buildHorses(count) {
    const palette = [
        '#1C7C54',
        '#E36414',
        '#3A86FF',
        '#8338EC',
        '#EF476F',
        '#FFBA08',
        '#06D6A0',
        '#118AB2',
        '#9B2226',
        '#E29578',
        '#588157',
        '#7F5539',
    ];
    const stableNames = [
        'Comet Trail',
        'Midnight Copper',
        'Blue Nova',
        'Royal Dynamo',
        'Wildfire',
        'Golden Hour',
        'Mint Sprint',
        'Steel Arrow',
        'Crimson Dash',
        'Amber Storm',
        'Shadow Leap',
        'Velvet Rocket',
    ];
    return Array.from({ length: count }).map((_, index) => {
        const odds = Number((1.4 + Math.random() * 5.2).toFixed(2));
        return {
            id: index + 1,
            name: stableNames[index % stableNames.length],
            odds,
            color: palette[index % palette.length],
            icon: '🐎',
            stats: `${(50 + Math.random() * 45).toFixed(0)}% burst / ${(20 + Math.random() * 60).toFixed(0)} stamina`,
        };
    });
}
function getConnectedIds() {
    return new Set(connections.values());
}
function buildPublicState() {
    const onlineIds = getConnectedIds();
    const playersObject = {};
    players.forEach((player) => {
        playersObject[player.id] = { ...player, connected: onlineIds.has(player.id) };
    });
    const winningBets = race.winner
        ? bets
            .filter((bet) => bet.horseId === race.winner)
            .map((bet) => ({
            playerId: bet.playerId,
            playerName: players.get(bet.playerId)?.name ?? 'Unknown',
            amount: bet.amount,
        }))
        : [];
    return {
        horses,
        players: playersObject,
        bets,
        race,
        config,
        winningBets,
        showQrOverlay,
    };
}
function broadcastState() {
    const payload = JSON.stringify({ type: 'state', payload: buildPublicState() });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}
function sendNotice(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'notice', message }));
    }
}
function stopTicker() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}
function resetRaceState(nextStatus = 'idle') {
    stopTicker();
    race = createRace();
    bets = [];
    race.positions = {};
    horses.forEach((horse) => {
        race.positions[horse.id] = 0;
    });
    race.status = nextStatus;
    broadcastState();
}
function kickPlayer(playerId) {
    const player = players.get(playerId);
    if (!player)
        return;
    players.delete(playerId);
    bets = bets.filter((bet) => bet.playerId !== playerId);
    // Drop any open sockets for the player
    connections.forEach((pid, ws) => {
        if (pid === playerId) {
            connections.delete(ws);
            try {
                ws.close(1000, 'Kicked');
            }
            catch {
                // ignore close errors
            }
        }
    });
    broadcastState();
}
function setPlayerBalance(playerId, amount) {
    const player = players.get(playerId);
    if (!player)
        return;
    players.set(playerId, { ...player, balance: Number(amount.toFixed(2)) });
    broadcastState();
}
function clearPlayerBets(playerId) {
    bets = bets.filter((bet) => bet.playerId !== playerId);
    broadcastState();
}
function finishRace(winnerId) {
    race.winner = winnerId;
    race.status = 'finished';
    settleBalances(winnerId);
    stopTicker();
    horses.forEach((horse) => {
        race.positions[horse.id] = Math.max(race.positions[horse.id] ?? 0, config.trackLength);
    });
    broadcastState();
}
function settleBalances(winnerId) {
    bets.forEach((bet) => {
        const player = players.get(bet.playerId);
        if (!player)
            return;
        const horse = horses.find((h) => h.id === bet.horseId);
        const odds = horse?.odds ?? 1;
        if (bet.horseId === winnerId) {
            player.balance = Math.max(0, Number((player.balance + bet.amount * odds).toFixed(2)));
        }
        else {
            player.balance = Math.max(0, Number((player.balance - bet.amount).toFixed(2)));
        }
        players.set(player.id, player);
    });
}
function tickRace() {
    if (race.status !== 'running')
        return;
    race.tick += 1;
    horses.forEach((horse) => {
        const current = race.positions[horse.id] ?? 0;
        const volatility = (Math.random() - 0.5) * 4;
        const oddsWeight = Math.max(0.6, 2.4 - horse.odds * 0.2);
        const burst = Math.random() > 0.7 ? 4 + Math.random() * 5 : 0;
        const delta = Math.max(1, config.baseStep * oddsWeight + volatility + burst);
        race.positions[horse.id] = Math.min(config.trackLength, current + delta);
    });
    const leader = horses.find((horse) => (race.positions[horse.id] ?? 0) >= config.trackLength);
    if (leader) {
        finishRace(leader.id);
        return;
    }
    broadcastState();
}
function startRace() {
    if (race.status === 'running')
        return;
    race = createRace();
    horses.forEach((horse) => {
        race.positions[horse.id] = 0;
    });
    race.status = 'running';
    race.tick = 0;
    stopTicker();
    tickInterval = setInterval(tickRace, config.tickMs);
    broadcastState();
}
function stopRace() {
    stopTicker();
    race.status = 'idle';
    race.winner = undefined;
    race.positions = {};
    broadcastState();
}
function ensureHorseCount(count) {
    if (Number.isNaN(count) || count < 1)
        return;
    config.horseCount = count;
    horses = buildHorses(count);
    race.positions = {};
    horses.forEach((horse) => {
        race.positions[horse.id] = 0;
    });
    bets = [];
}
function handleJoin(socket, payload) {
    const name = payload.name?.trim();
    if (!name) {
        sendNotice(socket, 'Name is required');
        return;
    }
    const existing = Array.from(players.values()).find((player) => player.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        players.set(existing.id, { ...existing, connected: true });
        connections.set(socket, existing.id);
        socket.send(JSON.stringify({ type: 'joined', playerId: existing.id, name: existing.name }));
        broadcastState();
        return;
    }
    const player = { id: randomUUID(), name, connected: true, balance: STARTING_BALANCE };
    players.set(player.id, player);
    connections.set(socket, player.id);
    socket.send(JSON.stringify({ type: 'joined', playerId: player.id, name: player.name }));
    broadcastState();
}
function handleBet(socket, payload) {
    const playerId = connections.get(socket);
    if (!playerId) {
        sendNotice(socket, 'Join before betting');
        return;
    }
    const bettor = players.get(playerId);
    if (!bettor) {
        sendNotice(socket, 'Player not found');
        return;
    }
    if (race.status === 'running') {
        sendNotice(socket, 'Betting closed during a race');
        return;
    }
    const { horseId, amount } = payload;
    if (!horses.find((horse) => horse.id === horseId)) {
        sendNotice(socket, 'Horse not found');
        return;
    }
    if (bettor.balance <= 0) {
        sendNotice(socket, 'Insufficient balance');
        return;
    }
    const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.min(amount, bettor.balance) : 10;
    const existing = bets.find((bet) => bet.playerId === playerId);
    if (existing) {
        existing.horseId = horseId;
        existing.amount = safeAmount;
    }
    else {
        bets.push({ playerId, horseId, amount: safeAmount });
    }
    race.status = race.status === 'finished' ? 'idle' : race.status;
    broadcastState();
}
function handleAdminAction(socket, payload) {
    switch (payload.action) {
        case 'start':
            startRace();
            break;
        case 'stop':
            stopRace();
            break;
        case 'reset':
            resetRaceState();
            break;
        case 'next_race':
            resetRaceState('ready');
            break;
        case 'manual_win':
            if (payload.horseId && horses.find((horse) => horse.id === payload.horseId)) {
                finishRace(payload.horseId);
            }
            else {
                sendNotice(socket, 'Select a valid horse to mark as winner');
            }
            break;
        case 'toggle_qr':
            showQrOverlay = !showQrOverlay;
            broadcastState();
            break;
        case 'kick_player':
            if (payload.playerId) {
                kickPlayer(payload.playerId);
            }
            break;
        case 'set_balance':
            if (payload.playerId && typeof payload.amount === 'number' && payload.amount >= 0) {
                setPlayerBalance(payload.playerId, payload.amount);
            }
            break;
        case 'clear_player_bets':
            if (payload.playerId) {
                clearPlayerBets(payload.playerId);
            }
            break;
        default:
            sendNotice(socket, 'Unknown admin action');
    }
}
function handleConfigUpdate(payload) {
    if (payload.config.horseCount) {
        ensureHorseCount(payload.config.horseCount);
    }
    if (payload.config.trackLength && payload.config.trackLength > 10) {
        config.trackLength = payload.config.trackLength;
    }
    if (payload.config.tickMs && payload.config.tickMs >= 100) {
        config.tickMs = payload.config.tickMs;
        if (tickInterval) {
            stopTicker();
            tickInterval = setInterval(tickRace, config.tickMs);
        }
    }
    broadcastState();
}
wss.on('connection', (socket) => {
    socket.on('message', (raw) => {
        try {
            const data = JSON.parse(raw.toString());
            if (!data?.type)
                return;
            switch (data.type) {
                case 'join':
                    handleJoin(socket, data);
                    break;
                case 'place_bet':
                    handleBet(socket, data);
                    break;
                case 'admin_action':
                    handleAdminAction(socket, data);
                    break;
                case 'update_config':
                    handleConfigUpdate(data);
                    break;
                default:
                    sendNotice(socket, 'Unknown message type');
            }
        }
        catch (error) {
            console.error('Failed to handle message', error);
        }
    });
    socket.on('close', () => {
        const playerId = connections.get(socket);
        connections.delete(socket);
        if (playerId) {
            const player = players.get(playerId);
            if (player) {
                players.set(playerId, { ...player, connected: false });
            }
        }
        broadcastState();
    });
    socket.send(JSON.stringify({ type: 'state', payload: buildPublicState() }));
});
httpServer.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
