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
