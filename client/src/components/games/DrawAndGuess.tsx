import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { DrawAndGuessState, DrawLinePayload, RoomState } from '../../types';
import { Palette, RotateCcw, Brush } from 'lucide-react';

interface Props {
  room: RoomState;
  socket: Socket | null;
}

export const DrawAndGuess: React.FC<Props> = ({ room, socket }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const gameState = room.gameState as DrawAndGuessState;
  const isDrawer = gameState?.currentDrawerId === socket?.id;

  useEffect(() => {
    if (!socket) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleStroke = (data: DrawLinePayload) => {
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.currX, data.currY);
      ctx.stroke();
    };

    const handleClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('on_draw_stroke', handleStroke);
    socket.on('clear_canvas', handleClear);

    return () => {
      socket.off('on_draw_stroke', handleStroke);
      socket.off('clear_canvas', handleClear);
    };
  }, [socket]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    lastPos.current = getCanvasCoords(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || !lastPos.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    socket?.emit('draw_stroke', {
      prevX: lastPos.current.x,
      prevY: lastPos.current.y,
      currX: x,
      currY: y,
      color,
      size: brushSize,
    });

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    if (!isDrawer || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket?.emit('clear_canvas');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      <div className="flex justify-between items-center w-full mb-3 px-2 text-white">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">Word Secret</span>
          <p className="text-2xl font-black tracking-widest text-emerald-400">
            {isDrawer ? gameState.secretWord : gameState.revealedWord}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wider text-slate-400">Time</span>
          <p
            className={`text-2xl font-black ${
              gameState.roundTimeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'
            }`}
          >
            {gameState.roundTimeLeft}s
          </p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={450}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className={`w-full bg-white rounded-xl shadow-inner cursor-${isDrawer ? 'crosshair' : 'not-allowed'}`}
      />

      {isDrawer && (
        <div className="flex items-center gap-4 mt-4 p-2 bg-slate-800 rounded-lg w-full justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-slate-400" />
            {['#000000', '#EF4444', '#10B981', '#3B82F6', '#F59E0B'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${
                  color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Brush className="w-5 h-5 text-slate-400" />
            <input
              type="range"
              min="2"
              max="24"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 accent-indigo-500"
            />
          </div>
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-sm font-semibold transition"
          >
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
        </div>
      )}
    </div>
  );
};
