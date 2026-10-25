import React from 'react';
import { Socket } from 'socket.io-client';
import { TriviaBlitzState, RoomState } from '../../types';

export const TriviaBlitz: React.FC<{ room: RoomState; socket: Socket | null }> = ({ room, socket }) => {
  const gameState = room.gameState as TriviaBlitzState;
  const q = gameState.currentQuestion;
  const myAnswer = socket ? gameState.answersSubmitted[socket.id] : undefined;

  const handleSelectOption = (idx: number) => {
    if (myAnswer !== undefined) return;
    socket?.emit('game_action', { optionIndex: idx });
  };

  return (
    <div className="flex flex-col p-6 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl mx-auto shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs uppercase text-slate-400 tracking-wider">
          Question {gameState.questionIndex + 1} / {gameState.totalQuestions}
        </span>
        <span className="text-xl font-bold text-amber-400">{gameState.questionTimeLeft}s</span>
      </div>

      <h2 className="text-xl font-bold text-white mb-6 min-h-[60px] leading-relaxed">
        {q?.question}
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {q?.options.map((opt, idx) => {
          let btnStyle = 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700';
          if (myAnswer !== undefined) {
            if (myAnswer === idx) btnStyle = 'bg-indigo-600 text-white border-indigo-500';
            else btnStyle = 'bg-slate-800/40 text-slate-500 border-transparent';
          }

          return (
            <button
              key={idx}
              disabled={myAnswer !== undefined}
              onClick={() => handleSelectOption(idx)}
              className={`p-4 rounded-xl border text-left font-medium transition duration-150 ${btnStyle}`}
            >
              <span className="font-bold mr-3">{['A', 'B', 'C', 'D'][idx]}.</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
