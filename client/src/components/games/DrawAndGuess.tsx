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

  // Coordinate Calculation (Mouse + Touch)
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: any) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    lastPos.current = getCoords(e);
  };

  const draw = (e: any) => {
    if (!isDrawing || !isDrawer || !lastPos.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoords(e);
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
    <div className="flex flex-col items-center w-full max-w-xl mx-auto p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center w-full mb-2 px-1 text-white">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Word</span>
          <p className="text-xl font-black tracking-widest text-emerald-400">
            {isDrawer ? gameState?.secretWord : gameState?.revealedWord}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Time</span>
          <p className="text-xl font-black text-amber-400">{gameState?.roundTimeLeft || 0}s</p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full bg-white rounded-lg touch-none shadow-inner"
      />

      {isDrawer && (
        <div className="flex items-center gap-2 mt-3 p-2 bg-slate-800 rounded-lg w-full justify-between overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Palette className="w-4 h-4 text-slate-400" />
            {['#000000', '#EF4444', '#10B981', '#3B82F6', '#F59E0B'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Brush className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16 accent-indigo-500"
            />
          </div>
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-semibold shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  );
};
