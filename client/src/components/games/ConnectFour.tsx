import React from 'react';
import { Socket } from 'socket.io-client';
import { ConnectFourState, RoomState } from '../../types';

export const ConnectFour: React.FC<{ room: RoomState; socket: Socket | null }> = ({ room, socket }) => {
  const gameState = room.gameState as ConnectFourState;
  const isMyTurn = gameState.turnPlayerId === socket?.id;
  const isPlayer = socket?.id === gameState.player1Id || socket?.id === gameState.player2Id;

  const dropDisc = (col: number) => {
    if (!isMyTurn) return;
    socket?.emit('game_action', { col });
  };

  const getDiscColor = (playerId: string | null) => {
    if (!playerId) return 'bg-slate-950';
    return playerId === gameState.player1Id ? 'bg-rose-500' : 'bg-amber-400';
  };

  return (
    <div className="flex flex-col items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl mx-auto shadow-2xl">
      <div className="flex justify-between w-full mb-4 px-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-rose-500" />
          <span>{room.players[gameState.player1Id]?.name || 'P1'}</span>
        </div>
        {!isPlayer && (
          <span className="bg-indigo-900/50 text-indigo-400 px-3 py-1 rounded-full text-xs">
            Spectating
          </span>
        )}
        <div className="flex items-center gap-2">
          <span>{room.players[gameState.player2Id]?.name || 'P2'}</span>
          <div className="w-4 h-4 rounded-full bg-amber-400" />
        </div>
      </div>

      <div className="bg-blue-600 p-4 rounded-2xl shadow-xl border-4 border-blue-700 inline-block">
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, col) => (
            <button
              key={col}
              disabled={!isMyTurn}
              onClick={() => dropDisc(col)}
              className="flex flex-col gap-3 group focus:outline-none"
            >
              {Array.from({ length: 6 }).map((_, row) => {
                const cell = gameState.board[row][col];
                return (
                  <div
                    key={row}
                    className={`w-12 h-12 rounded-full border-2 border-blue-800 transition-all duration-300 shadow-inner ${getDiscColor(
                      cell
                    )} ${!cell && isMyTurn ? 'group-hover:border-white/50' : ''}`}
                  />
                );
              })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
