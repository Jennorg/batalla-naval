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
  tableroOpponent1,
  setTableroOpponent1,
  tableroOpponent2,
  setTableroOpponent2,
  tableroOpponent3,
  setTableroOpponent3,
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
  setGamePhase,
  opponent1Id,
  opponent2Id,
  opponent3Id,
  playersInGame,
}) => {

  const getShipConfig = useCallback((shipTypeId) => {
    return SHIP_TYPES_CONFIG.find(s => s.id === shipTypeId);
  }, []);

  const handleSelectShipType = useCallback((shipId) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    if (playerShipCounts[shipId] > 0) {
      setSelectedShipTypeId(shipId);
      const shipName = getShipConfig(shipId)?.name || 'Barco';
      setMessage(`Seleccionado ${shipName}. Cambia la orientación o haz clic para colocar.`);
    } else {
      const shipName = getShipConfig(shipId)?.name || 'Este barco';
      setMessage(`No quedan más ${shipName} para colocar.`);
    }
  }, [gamePhase, playerShipCounts, setSelectedShipTypeId, setMessage, getShipConfig]);

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
    const shipConfig = getShipConfig(selectedShipTypeId);
    if (!shipConfig) return;

    const potentialCells = tableroPlayer.getShipCells(shipConfig.size, row, col, placementOrientation);
    if (tableroPlayer.canPlaceShip(shipConfig.size, row, col, placementOrientation)) {
        setPreviewCells(potentialCells);
        setPreviewInvalidCells([]);
    } else {
        setPreviewInvalidCells(potentialCells);
        setPreviewCells([]);
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, getShipConfig, setPreviewCells, setPreviewInvalidCells]);

  const handleBoardMouseLeave = useCallback(() => {
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, [setPreviewCells, setPreviewInvalidCells]);

  const handlePlayerBoardClick = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION || !selectedShipTypeId) {
      setMessage('Selecciona un barco para colocar.');
      return;
    }

    const shipConfig = getShipConfig(selectedShipTypeId);
    if (!shipConfig || playerShipCounts[shipConfig.id] <= 0) {
      setMessage('Selecciona un barco disponible para colocar.');
      return;
    }
    
    const newShipInstance = new shipConfig.ShipClass({
        id: shipConfig.id,
        name: shipConfig.name,
        size: shipConfig.size
    });
    
    const { success, newTablero } = tableroPlayer.placeShip(newShipInstance, row, col, placementOrientation);

    if (success) {
        setTableroPlayer(newTablero);
        setPlacedPlayerShips(prev => [...prev, newShipInstance]);
        setPlayerShipCounts(prevCounts => {
            const updatedCounts = { ...prevCounts, [shipConfig.id]: prevCounts[shipConfig.id] - 1 };
            const totalRemaining = Object.values(updatedCounts).reduce((sum, count) => sum + count, 0);
            if (totalRemaining === 0) {
                setMessage('¡Todos tus barcos están colocados! Haz clic en "Iniciar Batalla" o espera al oponente.');
            } else {
                setMessage(`${shipConfig.name} colocado. Quedan ${updatedCounts[shipConfig.id]}.`);
            }
            return updatedCounts;
        });
        setSelectedShipTypeId(null);
        setPreviewCells([]);
        setPreviewInvalidCells([]);
    } else {
        setMessage('No se puede colocar el barco aquí. Revisa superposiciones o límites.');
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, playerShipCounts, getShipConfig, setMessage, setTableroPlayer, setPlacedPlayerShips, setPlayerShipCounts, setSelectedShipTypeId, setPreviewCells, setPreviewInvalidCells]);

  const handleAttackAction = useCallback((targetPlayerId, row, col) => {
    if (gamePhase !== FASES_JUEGO.BATALLA) {
      setMessage('Solo puedes atacar en la fase de Batalla.');
      return;
    }

    if (!playerId.current || currentPlayerTurn !== playerId.current) {
      setMessage('¡No es tu turno para atacar!');
      return;
    }

    if (mode === 'ai') {
      if (tableroOpponent1.grid[row][col].isHit) {
        setMessage('Ya atacaste esta celda. Elige otra.');
        return;
      }
      const { message: attackMsg, newTablero } = tableroOpponent1.attackCell(row, col);
      setTableroOpponent1(newTablero);
      setMessage(`Atacaste [${row},${col}] (IA): ${attackMsg}`);

      if (newTablero.areAllShipsSunk()) {
        setMessage('¡Felicidades! ¡Has ganado la batalla contra la IA!');
        setGamePhase(FASES_JUEGO.FINALIZADO);
        setCurrentPlayerTurn(null);
      } else {
        setCurrentPlayerTurn('ai');
        setTimeout(handleRivalTurnIA, 1000);
      }
    } else { 
      if (!gameId) {
        setMessage('Error: ID de partida no disponible.');
        return;
      }

      const validOpponentIds = [];
      if (mode === 'multiplayer') {
          if (opponent1Id) {
              validOpponentIds.push(opponent1Id);
          }
      } else if (mode === '2vs2') {
          if (opponent1Id) validOpponentIds.push(opponent1Id);
          if (opponent2Id) validOpponentIds.push(opponent2Id);
          if (opponent3Id) validOpponentIds.push(opponent3Id);
      }
      
      if (!targetPlayerId || !validOpponentIds.includes(targetPlayerId)) {
          setMessage('Error: Debes seleccionar el tablero de un rival válido para atacar.');
          return;
      }

      sendPlayerAction({
        type: 'ATTACK',
        gameId: gameId,
        coordinates: { row, col },
        targetPlayerId: targetPlayerId,
      });
      setMessage("Ataque enviado, esperando resultado del servidor...");
    }
  }, [
    gamePhase, currentPlayerTurn, playerId, mode, gameId, sendPlayerAction,
    tableroOpponent1, setTableroOpponent1, 
    setMessage, setGamePhase,
    setCurrentPlayerTurn, handleRivalTurnIA,
    opponent1Id, opponent2Id, opponent3Id 
  ]);

  const handleOpponent1BoardClick = useCallback((row, col) => {
    if (!opponent1Id) {
        setMessage('Error: El oponente 1 no está disponible para atacar.');
        return;
    }
    handleAttackAction(opponent1Id, row, col);
  }, [handleAttackAction, opponent1Id, setMessage]);

  const handleOpponent2BoardClick = useCallback((row, col) => {
    if (mode === '2vs2') {
      if (!opponent2Id) {
          setMessage('Error: El oponente 2 no está disponible para atacar.');
          return;
      }
      handleAttackAction(opponent2Id, row, col);
    } else {
      setMessage('Este tablero no es accesible en el modo actual.');
    }
  }, [handleAttackAction, mode, opponent2Id, setMessage]);

  const handleOpponent3BoardClick = useCallback((row, col) => {
    if (mode === '2vs2') {
      if (!opponent3Id) {
          setMessage('Error: El oponente 3 no está disponible para atacar.');
          return;
      }
      handleAttackAction(opponent3Id, row, col);
    } else {
      setMessage('Este tablero no es accesible en el modo actual.');
    }
  }, [handleAttackAction, mode, opponent3Id, setMessage]);

  return {
    handleSelectShipType,
    handleShipOrientationChange,
    handleCellMouseEnter,
    handleBoardMouseLeave,
    handlePlayerBoardClick,
    handleOpponent1BoardClick,
    handleOpponent2BoardClick,
    handleOpponent3BoardClick,
  };
};