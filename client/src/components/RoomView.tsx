import React, { useState } from 'react';
import { useGameRoom } from '../hooks/useGameRoom';
import { DrawAndGuess } from './games/DrawAndGuess';
import { BombParty } from './games/BombParty';
import { ConnectFour } from './games/ConnectFour';
import { TriviaBlitz } from './games/TriviaBlitz';
import { ChatDrawer } from './ChatDrawer';
import { GameType } from '../types';
import { Copy, Play, Crown, Loader2, MessageSquare, Gamepad2 } from 'lucide-react';

export const RoomView: React.FC<{ roomId?: string }> = ({ roomId }) => {
  const { room, socket, sendAction } = useGameRoom(roomId);
  const [activeTab, setActiveTab] = useState<'GAME' | 'CHAT'>('GAME');

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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
            PLAYHUB
          </h1>
          <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-300">
            {room.roomId}
            <button onClick={copyInvite} className="ml-1.5 hover:text-white" title="Copy Invite Link">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[40%] py-1">
          {Object.values(room.players || {}).map((p) => (
            <div
              key={p.id}
              title={`${p.name} (${p.score} pts)`}
              className="relative flex items-center justify-center w-7 h-7 rounded-full border border-slate-700 bg-slate-800 shrink-0 text-sm"
            >
              <span>{p.avatar}</span>
              {p.isHost && <Crown className="w-3 h-3 text-amber-400 absolute -top-1.5 -right-1" />}
              {!p.isConnected && <span className="w-2 h-2 rounded-full bg-rose-500 absolute bottom-0 right-0" />}
            </div>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Game Area */}
        <main
          className={`flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center ${
            activeTab === 'GAME' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {room.status === 'LOBBY' ? (
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl text-center my-auto">
              <h2 className="text-xl font-bold mb-3">Game Lobby</h2>
              {isHost ? (
                <div>
                  <label className="text-xs uppercase text-slate-400 font-semibold mb-2 block text-left">
                    Choose Game Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {(['DRAW_AND_GUESS', 'BOMB_PARTY', 'CONNECT_FOUR', 'TRIVIA_BLITZ'] as GameType[]).map((gt) => (
                      <button
                        key={gt}
                        onClick={() => sendAction('select_game', { gameType: gt })}
                        className={`p-2.5 rounded-lg border text-xs font-bold transition ${
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
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition text-sm"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Game
                  </button>
                </div>
              ) : (
                <div className="text-slate-400 text-xs py-6">
                  Waiting for the host to select a game mode and launch the room...
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex items-center justify-center">
              {room.selectedGame === 'DRAW_AND_GUESS' && <DrawAndGuess room={room} socket={socket} />}
              {room.selectedGame === 'BOMB_PARTY' && <BombParty room={room} socket={socket} />}
              {room.selectedGame === 'CONNECT_FOUR' && <ConnectFour room={room} socket={socket} />}
              {room.selectedGame === 'TRIVIA_BLITZ' && <TriviaBlitz room={room} socket={socket} />}
            </div>
          )}
        </main>

        {/* Chat Drawer */}
        <div
          className={`w-full md:w-80 h-full flex flex-col shrink-0 ${
            activeTab === 'CHAT' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ChatDrawer room={room} socket={socket} />
        </div>
      </div>

      {/* Mobile Bottom Navigation (Tabs) */}
      <div className="flex md:hidden border-t border-slate-800 bg-slate-900 shrink-0">
        <button
          onClick={() => setActiveTab('GAME')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold ${
            activeTab === 'GAME' ? 'text-indigo-400 bg-slate-800/60' : 'text-slate-400'
          }`}
        >
          <Gamepad2 className="w-4 h-4" /> Game
        </button>
        <button
          onClick={() => setActiveTab('CHAT')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold ${
            activeTab === 'CHAT' ? 'text-indigo-400 bg-slate-800/60' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Chat
        </button>
      </div>
    </div>
  );
};
