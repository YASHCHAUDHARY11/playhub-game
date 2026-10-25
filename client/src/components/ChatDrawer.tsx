import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { RoomState } from '../types';
import { Send } from 'lucide-react';

export const ChatDrawer: React.FC<{ room: RoomState; socket: Socket | null }> = ({ room, socket }) => {
  const [text, setText] = useState('');

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket?.emit('chat_message', text);
    setText('');
  };

  const sendReaction = (emoji: string) => {
    socket?.emit('chat_message', emoji);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 w-80">
      <div className="p-3 border-b border-slate-800 font-semibold text-slate-200">Room Chat</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {room.chat.map((c) => (
          <div key={c.id} className="text-sm">
            {c.isSystem ? (
              <p className="text-emerald-400 font-medium italic">{c.text}</p>
            ) : (
              <p>
                <span className="font-bold mr-1" style={{ color: c.senderColor }}>
                  {c.senderName}:
                </span>
                <span className="text-slate-300">{c.text}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-around py-2 border-t border-slate-800/80 bg-slate-950/40">
        {['🔥', '🎉', '😂', '💀', '👏'].map((em) => (
          <button key={em} onClick={() => sendReaction(em)} className="hover:scale-125 transition text-lg">
            {em}
          </button>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type guess or chat..."
          className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-indigo-500"
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
