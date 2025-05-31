import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';

const SOCKET_SERVER_URL = 'https://backend-batallanaval.onrender.com'; 

export const useGameSocketEvents = ({
  mode,
  setMessage,
  setGameId,
  setCurrentPlayerTurn,
  setGamePhase,
  setTableroPlayer,
  playerId, 
}) => {
  const socketRef = useRef(null);
  const currentSocketPlayerId = useRef(null);

  const sendPlayerAction = useCallback((actionData) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('playerAction', { 
        ...actionData,
        gameId: actionData.gameId || null, 
        senderId: playerId.current || null 
      });
    } else {
      console.warn('Socket no conectado, no se pudo enviar la acción:', actionData);
      setMessage('Error de conexión: No se pudo enviar la acción.');
    }
  }, [setMessage]);

  const handleActionReceived = useCallback((data) => {
    if (mode !== 'multiplayer') return;
    const { action } = data;
    if (action.type === 'ATTACK') {
      const { row, col } = action.coordinates;
      setTableroPlayer(prevBoard => {
        const attackResult = prevBoard.attackCell(row, col);
        setMessage(attackResult.message);

        if (attackResult.newTablero.areAllShipsSunk()) {
          setMessage('¡Has perdido! El oponente hundió todos tus barcos.');
          setGamePhase(FASES_JUEGO.FINALIZADO);
        }
        return attackResult.newTablero;
      });
    } else if (action.type === 'GAME_STATE_UPDATE') {
        setMessage(action.message || 'Estado del juego actualizado.');
    } else if (action.type === 'GAME_READY') {
        setMessage('Ambos jugadores listos. ¡Comienza la batalla!');
        setGamePhase(FASES_JUEGO.BATALLA);
        setCurrentPlayerTurn('player');
    }
  }, [mode, setTableroPlayer, setMessage, setGamePhase, setCurrentPlayerTurn]);

  useEffect(() => {
    if (mode !== 'multiplayer') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_SERVER_URL);

      socketRef.current.on('connect', () => {
        currentSocketPlayerId.current = socketRef.current.id;
        playerId.current = socketRef.current.id;
        setMessage('Conectado al servidor. Buscando partida...');
        socketRef.current.emit('requestGame');
      });

      socketRef.current.on('gameFound', (data) => {
        setGameId(data.gameId);
        setMessage(`Partida ${data.gameId.substring(0,10)} encontrada. ${data.playerNumber === 1 ? 'Esperando al oponente...' : 'Juego listo!'}`);
        if (data.playerNumber === 1) {
            setGamePhase(FASES_JUEGO.COLOCACION);
            setCurrentPlayerTurn(null);
        } else {
            setGamePhase(FASES_JUEGO.COLOCACION);
            setCurrentPlayerTurn(null);
        }
      });

      socketRef.current.on('playerAction', handleActionReceived);

      socketRef.current.on('gameStarted', (data) => {
        setGamePhase(FASES_JUEGO.BATALLA);
        setCurrentPlayerTurn(data.startingPlayerId === playerId.current ? 'player' : 'rival');
        setMessage('¡Batalla iniciada!');
      });

      socketRef.current.on('disconnect', () => {
        setMessage('Desconectado del servidor.');
        setGameId(null);
        setCurrentPlayerTurn(null);
        setGamePhase(FASES_JUEGO.COLOCACION);
      });

      socketRef.current.on('error', (error) => {
        console.error('Error del socket:', error);
        setMessage(`Error del servidor: ${error.message || 'Desconocido'}`);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [mode, setGameId, setMessage, setGamePhase, setCurrentPlayerTurn, handleActionReceived]);

  return { sendPlayerAction, currentSocketPlayerId };
};