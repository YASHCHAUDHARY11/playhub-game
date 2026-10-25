import React from 'react';
import { useGameRoom } from '../hooks/useGameRoom';
import { DrawAndGuess } from './games/DrawAndGuess';
import { BombParty } from './games/BombParty';
import { ConnectFour } from './games/ConnectFour';
import { TriviaBlitz } from './games/TriviaBlitz';
import { ChatDrawer } from './ChatDrawer';
import { GameType } from '../types';
import { Copy, Play, Crown, Loader2 } from 'lucide-react';

export const RoomView: React.FC<{ roomId?: string }> = ({ roomId }) => {
  const { room, socket, sendAction } = useGameRoom(roomId);

  if (!room) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">Connecting to game server...</p>
        <span className="text-xs text-slate-600">Free server might take 10-20s to wake up</span>
      </div>
    );
  }

  const isHost = socket?.id === room.hostId;

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.origin + '?room=' + room.roomId);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Navigation Bar */}
        <header className="h-16 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
              PLAYHUB
            </h1>
            <div className="flex items-center bg-slate-800 px-3 py-1 rounded-md text-xs font-mono font-bold text-slate-300">
              {room.roomId}
              <button onClick={copyInvite} className="ml-2 hover:text-white" title="Copy Invite Link">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Players List */}
          <div className="flex items-center gap-2">
            {Object.values(room.players || {}).map((p) => (
              <div
                key={p.id}
                title={`${p.name} (${p.score} pts)`}
                className="relative flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
              >
                <span>{p.avatar}</span>
                {p.isHost && <Crown className="w-3 h-3 text-amber-400 absolute -top-1.5 -right-1" />}
                {!p.isConnected && <span className="w-2 h-2 rounded-full bg-rose-500 absolute bottom-0 right-0" />}
              </div>
            ))}
          </div>
        </header>

        {/* Game Main Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col items-center justify-center">
          {room.status === 'LOBBY' ? (
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl text-center">
              <h2 className="text-2xl font-bold mb-4">Game Lobby</h2>
              {isHost ? (
                <div>
                  <label className="text-xs uppercase text-slate-400 font-semibold mb-2 block">
                    Choose Game Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {(['DRAW_AND_GUESS', 'BOMB_PARTY', 'CONNECT_FOUR', 'TRIVIA_BLITZ'] as GameType[]).map((gt) => (
                      <button
                        key={gt}
                        onClick={() => sendAction('select_game', { gameType: gt })}
                        className={`p-3 rounded-lg border text-sm font-bold ${
                          room.selectedGame === gt
                            ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                            : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {gt.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => sendAction('start_game')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Game
                  </button>
                </div>
              ) : (
                <div className="text-slate-400 text-sm py-8">
                  Waiting for the host to select a game mode and launch the room...
                </div>
              )}
            </div>
          ) : (
            <>
              {room.selectedGame === 'DRAW_AND_GUESS' && <DrawAndGuess room={room} socket={socket} />}
              {room.selectedGame === 'BOMB_PARTY' && <BombParty room={room} socket={socket} />}
              {room.selectedGame === 'CONNECT_FOUR' && <ConnectFour room={room} socket={socket} />}
              {room.selectedGame === 'TRIVIA_BLITZ' && <TriviaBlitz room={room} socket={socket} />}
            </>
          )}
        </main>
      </div>

      <ChatDrawer room={room} socket={socket} />
    </div>
  );
};
