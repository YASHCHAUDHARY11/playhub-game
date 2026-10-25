import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

// ---------------- TYPES ----------------
export type GameType = 'DRAW_AND_GUESS' | 'BOMB_PARTY' | 'CONNECT_FOUR' | 'TRIVIA_BLITZ';
export type RoomStatus = 'LOBBY' | 'IN_GAME' | 'ROUND_OVER' | 'GAME_OVER';

export interface Player {
  id: string;
  sessionToken: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  score: number;
  isConnected: boolean;
  disconnectTimeout?: NodeJS.Timeout | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface DrawAndGuessState {
  currentDrawerId: string | null;
  secretWord: string;
  revealedWord: string;
  roundTimeLeft: number;
  guessedPlayerIds: string[];
  currentTurn: number;
  totalTurns: number;
}

export interface BombPartyState {
  activePlayerId: string;
  currentPrompt: string;
  bombTimeLeft: number;
  maxBombTime: number;
  usedWords: string[];
  eliminatedPlayerIds: string[];
}

export interface ConnectFourState {
  board: (string | null)[][];
  player1Id: string;
  player2Id: string;
  turnPlayerId: string;
  winnerPlayerId: string | 'DRAW' | null;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TriviaBlitzState {
  currentQuestion: TriviaQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  questionTimeLeft: number;
  answersSubmitted: Record<string, number>;
}

export type AnyGameState =
  | DrawAndGuessState
  | BombPartyState
  | ConnectFourState
  | TriviaBlitzState;

export interface RoomState {
  roomId: string;
  hostId: string;
  status: RoomStatus;
  selectedGame: GameType;
  players: Record<string, Player>;
  chat: ChatMessage[];
  gameState: AnyGameState | null;
}

export interface DrawLinePayload {
  prevX: number;
  prevY: number;
  currX: number;
  currY: number;
  color: string;
  size: number;
}

// ---------------- APP SETUP ----------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms: Record<string, RoomState> = {};
const intervals: Record<string, NodeJS.Timeout> = {};

const WORDS_DICTIONARY = ['PLANET', 'GUITAR', 'ROCKET', 'FOREST', 'CASTLE', 'DRAGON', 'PIRATE', 'WIZARD', 'VOLCANO'];
const PROMPTS = ['TH', 'ST', 'IN', 'ER', 'RE', 'CH', 'BL', 'TR', 'AN', 'QU', 'EX'];
const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { id: '1', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correctIndex: 1 },
  { id: '2', question: 'What is the speed of light in vacuum?', options: ['300,000 km/s', '150,000 km/s', '1,000 km/s', 'Sound speed'], correctIndex: 0 },
  { id: '3', question: 'What is the primary gas in Earth’s atmosphere?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'], correctIndex: 2 }
];

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function broadcastRoom(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).emit('sync_state', room);
}

function cleanupInterval(roomId: string) {
  if (intervals[roomId]) {
    clearInterval(intervals[roomId]);
    delete intervals[roomId];
  }
}

// ---------------- GAME LOGIC ----------------
function initGame(room: RoomState) {
  const playerIds = Object.keys(room.players).filter(id => room.players[id].isConnected);
  cleanupInterval(room.roomId);

  switch (room.selectedGame) {
    case 'DRAW_AND_GUESS': {
      const drawer = playerIds[0];
      const word = WORDS_DICTIONARY[Math.floor(Math.random() * WORDS_DICTIONARY.length)];
      const drawState: DrawAndGuessState = {
        currentDrawerId: drawer,
        secretWord: word,
        revealedWord: word.replace(/[A-Z]/g, '_ '),
        roundTimeLeft: 60,
        guessedPlayerIds: [],
        currentTurn: 1,
        totalTurns: playerIds.length * 2
      };
      room.gameState = drawState;
      room.status = 'IN_GAME';

      intervals[room.roomId] = setInterval(() => {
        if (!rooms[room.roomId] || room.status !== 'IN_GAME') return;
        const state = room.gameState as DrawAndGuessState;
        state.roundTimeLeft -= 1;
        if (state.roundTimeLeft <= 0 || state.guessedPlayerIds.length >= playerIds.length - 1) {
          endDrawRound(room);
        } else {
          broadcastRoom(room.roomId);
        }
      }, 1000);
      break;
    }

    case 'BOMB_PARTY': {
      const bombState: BombPartyState = {
        activePlayerId: playerIds[0],
        currentPrompt: PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
        bombTimeLeft: 12,
        maxBombTime: 12,
        usedWords: [],
        eliminatedPlayerIds: []
      };
      room.gameState = bombState;
      room.status = 'IN_GAME';

      intervals[room.roomId] = setInterval(() => {
        if (!rooms[room.roomId] || room.status !== 'IN_GAME') return;
        const state = room.gameState as BombPartyState;
        state.bombTimeLeft -= 1;
        if (state.bombTimeLeft <= 0) {
          state.eliminatedPlayerIds.push(state.activePlayerId);
          const alive = playerIds.filter(id => !state.eliminatedPlayerIds.includes(id));
          if (alive.length <= 1) {
            room.status = 'GAME_OVER';
            if (alive[0] && room.players[alive[0]]) room.players[alive[0]].score += 50;
            cleanupInterval(room.roomId);
          } else {
            state.activePlayerId = alive[0];
            state.bombTimeLeft = Math.max(5, state.maxBombTime - 1);
            state.maxBombTime = state.bombTimeLeft;
            state.currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
          }
        }
        broadcastRoom(room.roomId);
      }, 1000);
      break;
    }

    case 'CONNECT_FOUR': {
      const c4State: ConnectFourState = {
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        player1Id: playerIds[0],
        player2Id: playerIds[1] || playerIds[0],
        turnPlayerId: playerIds[0],
        winnerPlayerId: null
      };
      room.gameState = c4State;
      room.status = 'IN_GAME';
      break;
    }

    case 'TRIVIA_BLITZ': {
      const q = TRIVIA_QUESTIONS[0];
      const quizState: TriviaBlitzState = {
        currentQuestion: q,
        questionIndex: 0,
        totalQuestions: TRIVIA_QUESTIONS.length,
        questionTimeLeft: 10,
        answersSubmitted: {}
      };
      room.gameState = quizState;
      room.status = 'IN_GAME';

      intervals[room.roomId] = setInterval(() => {
        if (!rooms[room.roomId] || room.status !== 'IN_GAME') return;
        const state = room.gameState as TriviaBlitzState;
        state.questionTimeLeft -= 1;
        if (state.questionTimeLeft <= 0) {
          advanceTriviaQuestion(room);
        } else {
          broadcastRoom(room.roomId);
        }
      }, 1000);
      break;
    }
  }

  broadcastRoom(room.roomId);
}

function endDrawRound(room: RoomState) {
  const state = room.gameState as DrawAndGuessState;
  const playerIds = Object.keys(room.players).filter(id => room.players[id].isConnected);
  const currentIdx = playerIds.indexOf(state.currentDrawerId || '');
  const nextIdx = (currentIdx + 1) % playerIds.length;

  if (state.currentTurn >= state.totalTurns) {
    room.status = 'GAME_OVER';
    cleanupInterval(room.roomId);
  } else {
    state.currentTurn += 1;
    state.currentDrawerId = playerIds[nextIdx];
    state.secretWord = WORDS_DICTIONARY[Math.floor(Math.random() * WORDS_DICTIONARY.length)];
    state.revealedWord = state.secretWord.replace(/[A-Z]/g, '_ ');
    state.roundTimeLeft = 60;
    state.guessedPlayerIds = [];
    io.to(room.roomId).emit('clear_canvas');
  }
  broadcastRoom(room.roomId);
}

function advanceTriviaQuestion(room: RoomState) {
  const state = room.gameState as TriviaBlitzState;
  if (!state.currentQuestion) return;

  Object.entries(state.answersSubmitted).forEach(([pId, ansIdx]) => {
    if (ansIdx === state.currentQuestion!.correctIndex && room.players[pId]) {
      room.players[pId].score += 10;
    }
  });

  state.questionIndex += 1;
  if (state.questionIndex >= state.totalQuestions) {
    room.status = 'GAME_OVER';
    cleanupInterval(room.roomId);
  } else {
    state.currentQuestion = TRIVIA_QUESTIONS[state.questionIndex];
    state.questionTimeLeft = 10;
    state.answersSubmitted = {};
  }
  broadcastRoom(room.roomId);
}

// ---------------- SOCKET EVENTS ----------------
io.on('connection', (socket: Socket) => {
  let boundRoomId = '';

  socket.on('join_room', ({ roomId, playerProfile, sessionToken }: { roomId?: string, playerProfile: { name: string; avatar: string; color: string }, sessionToken: string }) => {
    const targetRoomId = roomId ? roomId.toUpperCase() : generateRoomId();
    let room = rooms[targetRoomId];

    if (!room) {
      room = {
        roomId: targetRoomId,
        hostId: socket.id,
        status: 'LOBBY',
        selectedGame: 'DRAW_AND_GUESS',
        players: {},
        chat: [],
        gameState: null
      };
      rooms[targetRoomId] = room;
    }

    boundRoomId = targetRoomId;
    socket.join(targetRoomId);

    const existingPlayerKey = Object.keys(room.players).find(k => room.players[k].sessionToken === sessionToken);
    if (existingPlayerKey) {
      const existing = room.players[existingPlayerKey];
      if (existing.disconnectTimeout) {
        clearTimeout(existing.disconnectTimeout);
        existing.disconnectTimeout = null;
      }
      delete room.players[existingPlayerKey];
      existing.id = socket.id;
      existing.isConnected = true;
      room.players[socket.id] = existing;
    } else {
      const isHost = Object.keys(room.players).length === 0;
      room.players[socket.id] = {
        id: socket.id,
        sessionToken,
        name: playerProfile.name,
        avatar: playerProfile.avatar,
        color: playerProfile.color,
        isHost,
        score: 0,
        isConnected: true
      };
      if (isHost) room.hostId = socket.id;
    }

    broadcastRoom(targetRoomId);
  });

  socket.on('select_game', ({ gameType }: { gameType: GameType }) => {
    const room = rooms[boundRoomId];
    if (room && room.hostId === socket.id && room.status === 'LOBBY') {
      room.selectedGame = gameType;
      broadcastRoom(boundRoomId);
    }
  });

  socket.on('start_game', () => {
    const room = rooms[boundRoomId];
    if (room && room.hostId === socket.id) {
      initGame(room);
    }
  });

  socket.on('chat_message', (text: string) => {
    const room = rooms[boundRoomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    if (room.status === 'IN_GAME' && room.selectedGame === 'DRAW_AND_GUESS') {
      const gs = room.gameState as DrawAndGuessState;
      if (gs.currentDrawerId !== socket.id && !gs.guessedPlayerIds.includes(socket.id)) {
        if (text.trim().toUpperCase() === gs.secretWord.toUpperCase()) {
          gs.guessedPlayerIds.push(socket.id);
          player.score += Math.max(10, Math.floor(gs.roundTimeLeft * 1.5));
          room.chat.push({
            id: Math.random().toString(),
            senderId: 'SYSTEM',
            senderName: 'SYSTEM',
            senderColor: '#10B981',
            text: `${player.name} correctly guessed the word!`,
            timestamp: Date.now(),
            isSystem: true
          });
          broadcastRoom(boundRoomId);
          return;
        }
      }
    }

    room.chat.push({
      id: Math.random().toString(),
      senderId: player.id,
      senderName: player.name,
      senderColor: player.color,
      text,
      timestamp: Date.now()
    });
    broadcastRoom(boundRoomId);
  });

  socket.on('draw_stroke', (payload: DrawLinePayload) => {
    socket.to(boundRoomId).emit('on_draw_stroke', payload);
  });

  socket.on('clear_canvas', () => {
    socket.to(boundRoomId).emit('clear_canvas');
  });

  socket.on('game_action', (data: any) => {
    const room = rooms[boundRoomId];
    if (!room || room.status !== 'IN_GAME') return;

    if (room.selectedGame === 'BOMB_PARTY') {
      const gs = room.gameState as BombPartyState;
      if (gs.activePlayerId === socket.id) {
        const word = (data.word || '').toUpperCase().trim();
        if (word.includes(gs.currentPrompt) && !gs.usedWords.includes(word) && word.length > 2) {
          gs.usedWords.push(word);
          const alive = Object.keys(room.players).filter(id => !gs.eliminatedPlayerIds.includes(id));
          const nextIdx = (alive.indexOf(socket.id) + 1) % alive.length;
          gs.activePlayerId = alive[nextIdx];
          gs.bombTimeLeft = gs.maxBombTime;
          gs.currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
          broadcastRoom(boundRoomId);
        }
      }
    }

    if (room.selectedGame === 'CONNECT_FOUR') {
      const gs = room.gameState as ConnectFourState;
      if (gs.turnPlayerId === socket.id && !gs.winnerPlayerId) {
        const col = data.col;
        for (let row = 5; row >= 0; row--) {
          if (!gs.board[row][col]) {
            gs.board[row][col] = socket.id;
            gs.turnPlayerId = gs.turnPlayerId === gs.player1Id ? gs.player2Id : gs.player1Id;
            broadcastRoom(boundRoomId);
            break;
          }
        }
      }
    }

    if (room.selectedGame === 'TRIVIA_BLITZ') {
      const gs = room.gameState as TriviaBlitzState;
      if (gs.answersSubmitted[socket.id] === undefined) {
        gs.answersSubmitted[socket.id] = data.optionIndex;
        broadcastRoom(boundRoomId);
      }
    }
  });

  socket.on('disconnect', () => {
    const room = rooms[boundRoomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    player.isConnected = false;
    player.disconnectTimeout = setTimeout(() => {
      delete room.players[socket.id];
      if (room.hostId === socket.id) {
        const remaining = Object.keys(room.players);
        if (remaining.length > 0) {
          room.hostId = remaining[0];
          room.players[remaining[0]].isHost = true;
        }
      }
      if (Object.keys(room.players).length === 0) {
        cleanupInterval(room.roomId);
        delete rooms[room.roomId];
      } else {
        broadcastRoom(room.roomId);
      }
    }, 20000);

    broadcastRoom(boundRoomId);
  });
});

// Render dynamic port
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`PlayHub WebSocket Server running on port ${PORT}`);
});
