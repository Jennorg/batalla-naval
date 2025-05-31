import React from 'react';
import { Routes, Route } from 'react-router-dom';

import HomePage from '@/components/HomePage';
import GameComponent from '@/components/Game/GameComponent'; // Tu GameComponent central

import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/ai" element={<GameComponent mode="ai" />} />
        <Route path="/game/multiplayer" element={<GameComponent mode="multiplayer" />} />
        
        <Route path="*" element={<h2>404 - Página no encontrada</h2>} />
      </Routes>
    </div>
  );
}

export default App;