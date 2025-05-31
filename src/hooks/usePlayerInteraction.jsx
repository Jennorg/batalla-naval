import { useCallback } from 'react';
import TableroClass from '@/classes/tablero/Tablero';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';
import { SHIP_TYPES_CONFIG } from '@/assets/SHIP_TYPES_CONFIG.JS';

export const usePlayerInteraction = ({
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
}) => {

  const handleSelectShipType = useCallback((shipId) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    if (playerShipCounts[shipId] > 0) {
      setSelectedShipTypeId(shipId);
      const shipName = SHIP_TYPES_CONFIG.find(s => s.id === shipId)?.name || 'Barco';
      setMessage(`Seleccionado ${shipName}. Cambia la orientación o haz clic para colocar.`);
    } else {
      const shipName = SHIP_TYPES_CONFIG.find(s => s.id === shipId)?.name || 'Este barco';
      setMessage(`No quedan más ${shipName} para colocar.`);
    }
  }, [gamePhase, playerShipCounts, setSelectedShipTypeId, setMessage]);

  const handleShipOrientationChange = useCallback(() => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    setPlacementOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, [gamePhase, setPlacementOrientation, setPreviewCells, setPreviewInvalidCells]);

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
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, setPreviewCells, setPreviewInvalidCells]);

  const handleBoardMouseLeave = useCallback(() => {
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, [setPreviewCells, setPreviewInvalidCells]);

  const handlePlayerBoardClick = useCallback((row, col) => {
    if (gamePhase === FASES_JUEGO.COLOCACION && selectedShipTypeId) {
      const shipConfig = SHIP_TYPES_CONFIG.find(s => s.id === selectedShipTypeId);
      if (!shipConfig || playerShipCounts[shipConfig.id] <= 0) {
        setMessage('Selecciona un barco disponible para colocar.');
        return;
      }
      const newShipInstance = new shipConfig.ShipClass();
      
      const placeResult = tableroPlayer.placeShip(newShipInstance, row, col, placementOrientation);

      if (placeResult.success) { 
        setTableroPlayer(placeResult.newTablero);

        setPlacedPlayerShips(prev => [...prev, newShipInstance]);

        setPlayerShipCounts(prevCounts => {
          const updatedCounts = { ...prevCounts, [shipConfig.id]: prevCounts[shipConfig.id] - 1 };
          const totalRemaining = Object.values(updatedCounts).reduce((sum, count) => sum + count, 0);
          if (totalRemaining === 0) {
            setMessage('¡Todos tus barcos están colocados! Haz clic en "Iniciar Batalla" o espera al oponente.');
            if (mode === 'multiplayer') {
              sendPlayerAction({ type: 'SHIPS_PLACED_READY' });
            }
          } else {
            setMessage(`${shipConfig.name} colocado. Quedan ${updatedCounts[shipConfig.id]}.`);
          }
          return updatedCounts;
        });
        setSelectedShipTypeId(null);
        setPreviewCells([]);
        setPreviewInvalidCells([]);
      } else {
        setMessage('No se puede colocar el barco aquí.');
      }
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, playerShipCounts, mode, sendPlayerAction, setMessage, setTableroPlayer, setPlacedPlayerShips, setPlayerShipCounts, setSelectedShipTypeId, setPreviewCells, setPreviewInvalidCells]);



  const handleRivalBoardClick = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.BATALLA || currentPlayerTurn !== 'player') {
        setMessage('No es tu turno o no puedes atacar en esta fase.');
        return;
    }

    if (mode === 'multiplayer') {
        if (!gameId) {
            setMessage('Esperando el ID de la partida multijugador.');
            return;
        }
        sendPlayerAction({
            type: 'ATTACK',
            gameId: gameId,
            coordinates: { row, col },
            playerId: playerId.current
        });
        setMessage("Ataque enviado, esperando resultado...");
    } else if (mode === 'ai') {              
        const attackResult = tableroRival.attackCell(row, col);

        setTableroRival(attackResult.newTablero);
        setMessage(`Atacaste [${row},${col}] (IA): ${attackResult.message}`);

        if (attackResult.newTablero.areAllShipsSunk()) {
            setMessage('¡Felicidades! ¡Has ganado la batalla contra la IA!');
            setGamePhase(FASES_JUEGO.FINALIZADO);
            return;
        }

        if (attackResult.status === 'hit' || attackResult.status === 'sunk' || attackResult.status === 'miss') { 
            setCurrentPlayerTurn('rival');
            setTimeout(() => handleRivalTurnIA(), 1000);
        }
    } else {
        setMessage('Modo de juego desconocido o no puedes atacar.');
    }
  }, [gamePhase, currentPlayerTurn, mode, gameId, sendPlayerAction, tableroRival, playerId, setTableroRival, setMessage, handleRivalTurnIA, setCurrentPlayerTurn, setGamePhase]);

  return {
    handleSelectShipType,
    handleShipOrientationChange,
    handleCellMouseEnter,
    handleBoardMouseLeave,
    handlePlayerBoardClick,
    handleRivalBoardClick,
  };
};