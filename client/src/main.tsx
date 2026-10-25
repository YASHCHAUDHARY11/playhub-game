import React from 'react';
import ReactDOM from 'react-dom/client';
import { RoomView } from './components/RoomView';
import './index.css';

const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RoomView roomId={roomId} />
  </React.StrictMode>
);
