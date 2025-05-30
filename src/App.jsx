import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

import TableroComponent from '@/components/Tablero/TableroComponent'
import PiezaComponent from '@/components/Pieza/PiezaComponent'
import LanchaClass from '@/classes/Lancha'
import AcorazadoClass from '@/classes/Acorazado'
import BuqueClass from '@/classes/Buque'
import PortaavionesClass from '@/classes/Portaaviones'
import SubmarinoClass from '@/classes/Submarino'
import PiezaClass from '@/classes/Pieza'
import TableroClass from '@/classes/Tablero'
import CeldaClass from '@/classes/Celda'

import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS'  

import './App.css'

const SHIP_TYPES_CONFIG = [
  { id: 'lancha', name: 'Lancha', size: 1, ShipClass: LanchaClass, initialCount: 1 },  
  { id: 'buque', name: 'Buque', size: 2, ShipClass: BuqueClass, initialCount: 1 },
  { id: 'submarino', name: 'Submarino', size: 3, ShipClass: SubmarinoClass, initialCount: 1 },
  { id: 'acorazado', name: 'Acorazado', size: 4, ShipClass: AcorazadoClass, initialCount: 1 },
  { id: 'portaaviones', name: 'Portaaviones', size: 5, ShipClass: PortaavionesClass, initialCount: 1 },
];

function App() {
  const [tableroPlayer, setTableroPlayer] = useState(() => new TableroClass());
  const [tableroRival, setTableroRival] = useState(() => new TableroClass());
  
  const initialShipCounts = SHIP_TYPES_CONFIG.reduce((acc, type) => {
    acc[type.id] = type.initialCount;
    return acc;
  }, {});
  const [playerShipCounts, setPlayerShipCounts] = useState(initialShipCounts);
  const [placedPlayerShips, setPlacedPlayerShips] = useState([]);
  // const [placedRivalShips, setPlacedRivalShips] = useState([]); // Para barcos del rival

  const [selectedShipTypeId, setSelectedShipTypeId] = useState(null);
  const [placementOrientation, setPlacementOrientation] = useState('horizontal');
  const [previewCells, setPreviewCells] = useState([]);
  const [previewInvalidCells, setPreviewInvalidCells] = useState([]);

  const [currentPlayerTurn, setCurrentPlayerTurn] = useState('player'); // 'player' o 'rival'
  const [gamePhase, setGamePhase] = useState(FASES_JUEGO.COLOCACION);
  const [message, setMessage] = useState('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');

  // --- SOCKET.IO CLIENT ---
  const socketRef = useRef(null);
  const myPlayerId = useRef(null);

  useEffect(() => {
    // Solo conectar una vez
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('connectionSuccess', (data) => {
      console.log(data.message, "Mi ID:", data.playerId);
      myPlayerId.current = data.playerId;
    });

    socketRef.current.on('statusUpdate', (data) => {
      console.log("Actualización de estado:", data.message);
    });

    socketRef.current.on('waitingPlayersCountUpdate', (data) => {
      console.log(`Jugadores esperando en total: ${data.count}`);
    });

    socketRef.current.on('gameStarted', (data) => {
      console.log('¡Juego iniciado!', data);
      if (data.turn === data.yourPlayerId) {
        setCurrentPlayerTurn('player');
        setMessage("Es tu turno.");
      } else {
        setCurrentPlayerTurn('rival');
        setMessage(`Esperando turno de oponente.`);
      }
    });

    socketRef.current.on('opponentLeft', (data) => {
      console.warn(data.message);
      setMessage('El oponente abandonó la partida.');
    });

    socketRef.current.on('actionError', (error) => {
      console.error("Error de acción:", error.message);
      setMessage(error.message);
    });

    socketRef.current.on('actionReceived', (data) => {
      console.log("Acción recibida del oponente:", data.action, "De:", data.sender);
      // Aplica la acción del oponente a tu estado del juego local
    });

    socketRef.current.on('turnUpdate', (data) => {
      console.log(`Actualización de turno. Siguiente turno: ${data.nextTurn}`);
      if (data.nextTurn === myPlayerId.current) {
        setCurrentPlayerTurn('player');
        setMessage("¡Ahora es tu turno!");
      } else {
        setCurrentPlayerTurn('rival');
        setMessage("Turno del oponente.");
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Función para enviar una acción (ejemplo)
  function sendPlayerAction(actionData) {
    if (socketRef.current) {
      socketRef.current.emit('player-action', actionData);
    }
  }

  // Función para reiniciar el juego
  const resetGame = useCallback(() => {
    const newPlayerBoard = new TableroClass();
    const newRivalBoard = new TableroClass();
    setTableroPlayer(newPlayerBoard);
    setTableroRival(newRivalBoard);
    
    setPlayerShipCounts(initialShipCounts);
    setPlacedPlayerShips([]);
    // setPlacedRivalShips([]); // Resetear barcos del rival

    setSelectedShipTypeId(null);
    setPlacementOrientation('horizontal');
    setPreviewCells([]);
    setPreviewInvalidCells([]);
    
    setCurrentPlayerTurn('player');
    setGamePhase(FASES_JUEGO.COLOCACION);
    setMessage('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');
    // Aquí también deberías colocar los barcos del rival aleatoriamente si es contra IA
    placeRivalShipsRandomly(newRivalBoard);
  }, [initialShipCounts]);

  // Colocar barcos del rival aleatoriamente (ejemplo básico)
  const placeRivalShipsRandomly = (board) => {
    SHIP_TYPES_CONFIG.forEach(shipConfig => {
      for (let i = 0; i < shipConfig.initialCount; i++) {
        let placed = false;
        const shipInstance = new shipConfig.ShipClass();
        // Intentar colocar hasta 100 veces para evitar bucles infinitos
        for (let attempt = 0; attempt < 100 && !placed; attempt++) {
          const row = Math.floor(Math.random() * board.size);
          const col = Math.floor(Math.random() * board.size);
          const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
          if (board.placeShip(shipInstance, row, col, orientation)) {
            placed = true;
          }
        }
        if (!placed) {
          console.warn(`No se pudo colocar el ${shipConfig.name} del rival`);
        }
      }
    });
    // Forzar actualización del tablero rival si es necesario (depende de cómo manejes el estado)
    setTableroRival(prev => ({ ...prev, grid: board.grid, ships: board.ships }));
  };
  
  useEffect(() => {
    // Colocar barcos del rival al inicio
    placeRivalShipsRandomly(tableroRival);
  }, []); // Solo al montar el componente

  const handleSelectShipType = useCallback((shipId) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    if (playerShipCounts[shipId] > 0) {
      setSelectedShipTypeId(shipId);
      setMessage(`Seleccionado ${SHIP_TYPES_CONFIG.find(s => s.id === shipId).name}. Cambia la orientación o haz clic para colocar.`);
    } else {
      setMessage(`No quedan más ${SHIP_TYPES_CONFIG.find(s => s.id === shipId).name} para colocar.`);
    }
  }, [gamePhase, playerShipCounts]);

  const handleShipOrientationChange = () => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    setPlacementOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    // Limpiar previsualización al cambiar orientación para recalcular
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  };

  const handleCellMouseEnter = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION || !selectedShipTypeId) {
      setPreviewCells([]);
      setPreviewInvalidCells([]);
      return;
    }

    const shipConfig = SHIP_TYPES_CONFIG.find(s => s.id === selectedShipTypeId);
    if (!shipConfig) return;

    const cells = tableroPlayer.getShipCells(shipConfig.size, row, col, placementOrientation);
    
    if (tableroPlayer.canPlaceShip(shipConfig.size, row, col, placementOrientation)) {
      setPreviewCells(cells);
      setPreviewInvalidCells([]);
    } else {
      setPreviewInvalidCells(cells);
      setPreviewCells([]);
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation]);

  const handleBoardMouseLeave = useCallback(() => {
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, []);

  const handlePlayerBoardClick = useCallback((row, col) => {
  if (gamePhase !== FASES_JUEGO.COLOCACION || !selectedShipTypeId) return;

  const shipConfig = SHIP_TYPES_CONFIG.find(s => s.id === selectedShipTypeId);
  if (!shipConfig || playerShipCounts[shipConfig.id] <= 0) {
    setMessage('Selecciona un barco disponible para colocar.');
    return;
  }

  const newShipInstance = new shipConfig.ShipClass();

  // Crear una nueva instancia del tablero para la actualización del estado
  const newTableroPlayer = Object.assign(Object.create(Object.getPrototypeOf(tableroPlayer)), tableroPlayer);
  newTableroPlayer.grid = tableroPlayer.grid.map(r => r.map(c => ({...c})));
  newTableroPlayer.ships = [...tableroPlayer.ships];


  if (newTableroPlayer.placeShip(newShipInstance, row, col, placementOrientation)) {
    setTableroPlayer(newTableroPlayer);
    setPlacedPlayerShips(prevPlacedShips => { 
      const updatedPlacedShips = [...prevPlacedShips, newShipInstance];

      // Ahora actualizamos los contadores de barcos
      setPlayerShipCounts(prevCounts => {
        const newCounts = {
          ...prevCounts,
          [shipConfig.id]: prevCounts[shipConfig.id] - 1,
        };

        // Calcular el total de barcos restantes para el mensaje
        const totalRemaining = Object.values(newCounts).reduce((sum, count) => sum + count, 0);

        if (totalRemaining === 0) {
          setMessage('¡Todos tus barcos están colocados! Haz clic en "Iniciar Batalla".');
        } else {
          setMessage(`${shipConfig.name} colocado. Quedan ${newCounts[shipConfig.id]} de este tipo. Selecciona el siguiente o inicia la batalla si terminaste.`);
        }
        return newCounts;
      });

      setSelectedShipTypeId(null); // Deseleccionar después de colocar
      setPreviewCells([]);
      setPreviewInvalidCells([]);

      return updatedPlacedShips; // Retorna el nuevo estado para setPlacedPlayerShips
    });

  } else {
    setMessage('No se puede colocar el barco aquí. Intenta otra posición u orientación.');
  }
}, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, playerShipCounts, SHIP_TYPES_CONFIG]); 


  const handleRivalBoardClick = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.BATALLA || currentPlayerTurn !== 'player') {
      setMessage('No es tu turno o el juego no está en fase de batalla.');
      return;
    }

    const newTableroRival = new TableroClass(tableroRival.size);
    newTableroRival.grid = tableroRival.grid.map(r => r.map(c => ({...c})));
    newTableroRival.ships = [...tableroRival.ships]; // Mantener referencias originales

    const attackResult = newTableroRival.attackCell(row, col);
    setTableroRival(newTableroRival); // Actualizar estado
    setMessage(`Jugador ataca [${row},${col}]: ${attackResult.message}`);

    if (newTableroRival.areAllShipsSunk()) {
      setMessage('¡Felicidades! ¡Has ganado la batalla!');
      setGamePhase(FASES_JUEGO.FINALIZADO);
      return;
    }

    if (attackResult.status !== 'invalid' && attackResult.message !== 'Celda ya atacada.') {
        setCurrentPlayerTurn('rival');
        // Aquí iría el turno del rival (IA)
        // Simulación simple de turno de IA después de un breve retraso
        setTimeout(handleRivalTurn, 1000);
    }

  }, [gamePhase, currentPlayerTurn, tableroRival]);

  const handleRivalTurn = useCallback(() => {
    if (gamePhase !== FASES_JUEGO.BATALLA) return;
    
    setMessage('Turno del Rival...');
    // Lógica simple de IA: atacar una celda aleatoria no atacada
    let attacked = false;
    let newTableroPlayer = new TableroClass(tableroPlayer.size);
    newTableroPlayer.grid = tableroPlayer.grid.map(r => r.map(c => ({...c})));
    newTableroPlayer.ships = [...tableroPlayer.ships]; // Mantener referencias originales

    // Intentar hasta 100 veces encontrar una celda no atacada
    for (let i = 0; i < 100 && !attacked; i++) {
        const r = Math.floor(Math.random() * newTableroPlayer.size);
        const c = Math.floor(Math.random() * newTableroPlayer.size);
        if (!newTableroPlayer.grid[r][c].isHit) {
            const attackResult = newTableroPlayer.attackCell(r, c);
            setTableroPlayer(newTableroPlayer);
            setMessage(`Rival ataca [${r},${c}]: ${attackResult.message}`);
            attacked = true;

            if (newTableroPlayer.areAllShipsSunk()) {
                setMessage('¡El Rival ha ganado la batalla!');
                setGamePhase(FASES_JUEGO.FINALIZADO);
                return;
            }
        }
    }
    if (!attacked) { // Si no pudo atacar (ej. todas las celdas atacadas)
        setMessage('Rival no pudo encontrar celda para atacar.');
    }
    setCurrentPlayerTurn('player');
    if (gamePhase === FASES_JUEGO.BATALLA) { // Solo si el juego no ha terminado
        setMessage(prev => prev + ' Es tu turno.');
    }

  }, [gamePhase, tableroPlayer]);


  const handleStartBattle = () => {
    const totalShipsToPlace = SHIP_TYPES_CONFIG.reduce((sum, type) => sum + type.initialCount, 0);
    if (placedPlayerShips.length < totalShipsToPlace) {
      setMessage('Debes colocar todos tus barcos antes de iniciar la batalla.');
      return;
    }
    if (gamePhase === FASES_JUEGO.COLOCACION) {
      setGamePhase(FASES_JUEGO.BATALLA);
      setCurrentPlayerTurn('player'); // El jugador siempre empieza
      setMessage('¡Batalla iniciada! Es tu turno. Ataca el tablero del rival.');
    }
  };

  return (
    <div className="gameContainer">
      <h1>Batalla Naval</h1>
      <p className="game-message">{message}</p>

      {(gamePhase === FASES_JUEGO.BATALLA || gamePhase === FASES_JUEGO.FINALIZADO) && (
        <p className="turno-label">
            Turno: {currentPlayerTurn === 'player' ? 'Jugador' : 'Rival'}
        </p>
      )}

      {/* Nuevo contenedor para el layout de 5 columnas */}
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
              <button onClick={handleStartBattle} className="btn-batalla">
                Iniciar Batalla
              </button>
            </div>
          </div>
        )}

        {/* El tablero rival siempre existe, pero su contenido puede cambiar */}
        <div className="tablero-area-rival">
          <h2>Flota Rival ({gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player' ? "Atacando" : "Esperando"})</h2>
          <TableroComponent
            tablero={tableroRival}
            onCellClick={handleRivalBoardClick}
            isPlayerBoard={false}
            gamePhase={gamePhase}
            disabled={gamePhase !== FASES_JUEGO.BATALLA || currentPlayerTurn !== 'player'}
          />
        </div>
      </div>

      {(gamePhase === FASES_JUEGO.FINALIZADO || gamePhase === FASES_JUEGO.BATALLA) && (
        <button onClick={resetGame} className="btn-reset">
          {gamePhase === FASES_JUEGO.FINALIZADO ? 'Jugar de Nuevo' : 'Reiniciar Juego'}
        </button>
      )}
    </div>
  );
}

export default App;
