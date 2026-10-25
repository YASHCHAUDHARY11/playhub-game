import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { BombPartyState, RoomState } from '../../types';
import { Bomb, Flame, AlertCircle } from 'lucide-react';

export const BombParty: React.FC<{ room: RoomState; socket: Socket | null }> = ({ room, socket }) => {
  const [word, setWord] = useState('');
  const gameState = room.gameState as BombPartyState;
  const isMyTurn = gameState.activePlayerId === socket?.id;
  const activePlayer = room.players[gameState.activePlayerId];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !word) return;
    socket?.emit('game_action', { word });
    setWord('');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl mx-auto shadow-2xl relative overflow-hidden">
      <div className="relative mb-6">
        <Bomb className={`w-32 h-32 ${isMyTurn ? 'text-amber-500 animate-bounce' : 'text-slate-600'}`} />
        <Flame className="w-10 h-10 text-rose-500 absolute -top-2 right-4 animate-ping" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-black text-white">{gameState.bombTimeLeft}</span>
        </div>
      </div>

      <div className="text-center mb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Must Contain Substring</p>
        <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">
          {gameState.currentPrompt}
        </span>
      </div>

      <div className="mb-4">
        <span className="text-sm text-slate-400">Active Player: </span>
        <span className="font-bold text-white">{activePlayer ? activePlayer.name : 'Unknown'}</span>
      </div>

      {isMyTurn ? (
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <input
            type="text"
            value={word}
            autoFocus
            onChange={(e) => setWord(e.target.value)}
            placeholder={`Type word with '${gameState.currentPrompt}'...`}
            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-amber-400 text-lg uppercase"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow-lg uppercase transition"
          >
            Pass
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 text-slate-500 py-3">
          <AlertCircle className="w-5 h-5" />
          <span>Waiting for {activePlayer?.name} to diffuse the bomb...</span>
        </div>
      )}
    </div>
  );
};
