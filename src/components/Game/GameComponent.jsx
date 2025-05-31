import React, { useState, useEffect, useCallback } from 'react';

import TableroComponent from '@/components/Tablero/TableroComponent';
import PiezaComponent from '@/components/Pieza/PiezaComponent'; 
import TableroClass from '@/classes/Tablero';
import { placeRivalShipsRandomly } from '@/utils/gameSetup'; 

import { SHIP_TYPES_CONFIG } from '@/assets/SHIP_TYPES_CONFIG.JS';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';

import { usePlayerInteraction } from '@/hooks/usePlayerInteraction';
import { useGameSocketEvents } from '@/hooks/useGameSocketEvents';

function GameComponent({ mode }) {
  const [tableroPlayer, setTableroPlayer] = useState(() => new TableroClass());
  const [tableroRival, setTableroRival] = useState(() => new TableroClass());
  
  const initialShipCounts = React.useMemo(() => SHIP_TYPES_CONFIG.reduce((acc, type) => {
    acc[type.id] = type.initialCount;
    return acc;
  }, {}), []);

  const [playerShipCounts, setPlayerShipCounts] = useState(initialShipCounts);
  const [placedPlayerShips, setPlacedPlayerShips] = useState([]);

  const [selectedShipTypeId, setSelectedShipTypeId] = useState(null);
  const [placementOrientation, setPlacementOrientation] = useState('horizontal');
  const [previewCells, setPreviewCells] = useState([]);
  const [previewInvalidCells, setPreviewInvalidCells] = useState([]);

  const [currentPlayerTurn, setCurrentPlayerTurn] = useState(null);
  const [gamePhase, setGamePhase] = useState(FASES_JUEGO.COLOCACION);
  const [message, setMessage] = useState('Coloca tus barcos. Selecciona uno y haz clic en el tablero.');
  const [gameId, setGameId] = useState(null);

  const playerId = React.useRef(null);

  const { sendPlayerAction, currentSocketPlayerId } = mode === 'multiplayer' 
    ? useGameSocketEvents({
        mode,
        setMessage,
        setGameId,
        setCurrentPlayerTurn,
        setGamePhase,
        setTableroPlayer,
        setTableroRival, // <-- Asegúrate de que esto se pasa también
        playerId, 
      })
    : { sendPlayerAction: () => {}, currentSocketPlayerId: { current: null } };

  useEffect(() => {
    if (mode === 'multiplayer' && currentSocketPlayerId && currentSocketPlayerId.current) {
      playerId.current = currentSocketPlayerId.current;
    } else if (mode === 'ai') {
      playerId.current = 'player_ai'; 
    }
  }, [currentSocketPlayerId, mode]);


  const resetGame = useCallback(() => {
    const newPlayerBoard = new TableroClass();
    let newRivalBoard = new TableroClass();
    
    if (mode === 'ai') {
      newRivalBoard = placeRivalShipsRandomly(newRivalBoard, SHIP_TYPES_CONFIG); 
    }

    setTableroPlayer(newPlayerBoard);
    setTableroRival(newRivalBoard);
    
    setPlayerShipCounts(initialShipCounts);
    setPlacedPlayerShips([]);
    setSelectedShipTypeId(null);
    setPlacementOrientation('horizontal');
    setPreviewCells([]);
    setPreviewInvalidCells([]);
    
    setCurrentPlayerTurn(null); // No hay turno inicial hasta que la batalla comience
    setGamePhase(FASES_JUEGO.COLOCACION);
    setMessage('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');
    setGameId(null);
  }, [initialShipCounts, mode]);

  useEffect(() => {
    if (mode === 'ai') {
        resetGame();
        setMessage('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');
    }
  }, [mode, resetGame]);

const handleRivalTurnIA = useCallback(() => {
  if (mode !== 'ai' || gamePhase !== FASES_JUEGO.BATALLA) return;
  
  setMessage('Turno del Rival (IA)...');
  let attacked = false;
  let currentTableroPlayerState = tableroPlayer;

  for (let i = 0; i < 100 && !attacked; i++) {
      const r = Math.floor(Math.random() * currentTableroPlayerState.size);
      const c = Math.floor(Math.random() * currentTableroPlayerState.size);

      if (!currentTableroPlayerState.grid[r][c].isHit) {
          const attackResult = currentTableroPlayerState.attackCell(r, c); 
          
          currentTableroPlayerState = attackResult.newTablero; 
          
          setMessage(`Rival (IA) ataca [${r},${c}]: ${attackResult.message}`);
          attacked = true;
          if (currentTableroPlayerState.areAllShipsSunk()) {
              setMessage('¡La IA ha ganado la batalla!');
              setGamePhase(FASES_JUEGO.FINALIZADO);              
              setTableroPlayer(currentTableroPlayerState); 
              return; 
          }
          break; 
      }
  }

  setTableroPlayer(currentTableroPlayerState);

  if (!attacked) setMessage('IA no pudo encontrar celda para atacar.');
  
  setCurrentPlayerTurn('player');
  if (gamePhase === FASES_JUEGO.BATALLA) {
    setMessage(prev => prev + ' Es tu turno.');
  }
}, [mode, gamePhase, tableroPlayer, setTableroPlayer, setMessage, setCurrentPlayerTurn, setGamePhase]); 

  const handleStartBattle = useCallback(() => {
    const totalShipsToPlace = SHIP_TYPES_CONFIG.reduce((sum, type) => sum + type.initialCount, 0);
    if (placedPlayerShips.length < totalShipsToPlace) {
      setMessage('Debes colocar todos tus barcos antes de iniciar la batalla.');
      return;
    }
    
    if (gamePhase === FASES_JUEGO.COLOCACION) {
        if (mode === 'ai') {
            setGamePhase(FASES_JUEGO.BATALLA);
            setCurrentPlayerTurn('player');
            setMessage('¡Batalla contra IA iniciada! Es tu turno.');
        } else if (mode === 'multiplayer') {
            setMessage('Barcos colocados. Esperando al oponente y al servidor...');
            console.log('Enviando PLAYER_READY. gameId:', gameId, 'playerId:', playerId.current); 
            sendPlayerAction({
              type: 'PLAYER_READY',
              gameId: gameId, 
              playerId: playerId.current,
              placedPlayerShipsData: tableroPlayer.toSimpleObject()
          });
        }
    }
  }, [placedPlayerShips, gamePhase, mode, sendPlayerAction, gameId, playerId]);


  const {
    handleSelectShipType,
    handleShipOrientationChange,
    handleCellMouseEnter,
    handleBoardMouseLeave,
    handlePlayerBoardClick,
    handleRivalBoardClick,
  } = usePlayerInteraction({
    mode,
    gamePhase,
    currentPlayerTurn,
    tableroPlayer,
    setTableroPlayer,
    tableroRival,
    setTableroRival,
    playerShipCounts,
    setPlayerShipCounts,
    placedPlayerShips,
    setPlacedPlayerShips,
    selectedShipTypeId,
    setSelectedShipTypeId,
    placementOrientation,
    setPlacementOrientation,
    setPreviewCells,
    setPreviewInvalidCells,
    setMessage,
    gameId,
    sendPlayerAction, 
    playerId, 
    handleRivalTurnIA,
    setCurrentPlayerTurn,
    setGamePhase
  });


  return (
    <div className="gameContainer">
      <h1>Batalla Naval {mode === 'ai' ? '(vs IA)' : '(Online)'}</h1>
      <p className="game-message">{message}</p>
      {mode === 'multiplayer' && gameId && <p className="game-id-label">ID de Partida: {gameId.substring(0,10)}...</p>}

      {(gamePhase === FASES_JUEGO.BATALLA || gamePhase === FASES_JUEGO.FINALIZADO) && currentPlayerTurn && (
        <p className="turno-label">
            Turno: {(currentPlayerTurn === 'player') ? 'Tu Turno' : (mode === 'ai' ? 'Turno de la IA' : 'Turno del Oponente')}
        </p>
      )}

      <div className="game-grid-area">
        <div className="tablero-area-jugador">
          <h2>Tu Flota ({gamePhase === FASES_JUEGO.COLOCACION ? "Colocando" : "Defendiendo"})</h2>
          <TableroComponent
            tablero={tableroPlayer}
            onCellClick={handlePlayerBoardClick}
            onCellMouseEnter={handleCellMouseEnter}
            onBoardMouseLeave={handleBoardMouseLeave}
            previewCells={previewCells}
            previewInvalidCells={previewInvalidCells}
            isPlayerBoard={true}
            gamePhase={gamePhase}
            selectedShipTypeId={selectedShipTypeId}
            disabled={gamePhase !== FASES_JUEGO.COLOCACION}
          />
        </div>

        {gamePhase === FASES_JUEGO.COLOCACION && (
          <div className="controles-colocacion">
            <h3>Selecciona un Barco:</h3>
            <div className="lista-piezas-jugador">
              {SHIP_TYPES_CONFIG.map(shipConfig => (
                <PiezaComponent
                  key={shipConfig.id}
                  shipTypeConfig={shipConfig}
                  remainingCount={playerShipCounts[shipConfig.id]}
                  isSelected={selectedShipTypeId === shipConfig.id}
                  onSelectShipType={handleSelectShipType}
                  gamePhase={gamePhase}
                />
              ))}
            </div>
            <div className="btns-colocacion">
              <button onClick={handleShipOrientationChange} className="btn-orientacion">
                Orientación: {placementOrientation.toUpperCase()}
              </button>
              <button onClick={handleStartBattle} className="btn-batalla" disabled={placedPlayerShips.length < SHIP_TYPES_CONFIG.reduce((sum, type) => sum + type.initialCount, 0)}>
                {mode === 'multiplayer' ? "Estoy Listo (Barcos Colocados)" : "Iniciar Batalla (vs IA)"}
              </button>
            </div>
          </div>
        )}

        <div className="tablero-area-rival">
          <h2>Flota Rival ({mode === 'ai' ? 'IA' : (gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player' ? "Atacando" : "Esperando...")})</h2>
          <TableroComponent
            tablero={tableroRival}
            onCellClick={handleRivalBoardClick}
            isPlayerBoard={false}
            gamePhase={gamePhase}
            disabled={!(gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player')}
          />
        </div>
      </div>

      {(gamePhase === FASES_JUEGO.FINALIZADO || (mode === 'ai' && gamePhase === FASES_JUEGO.BATALLA) ) && (
        <button onClick={resetGame} className="btn-reset">
          {gamePhase === FASES_JUEGO.FINALIZADO ? 'Jugar de Nuevo' : 'Reiniciar Juego (vs IA)'}
        </button>
      )}
    </div>
  );
}

export default GameComponent;