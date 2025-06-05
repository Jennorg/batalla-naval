import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useSocketManager = (eventHandlers) => {
  const socketRef = useRef(null);
  const playerIdRef = useRef(null);

  const {
    onConnectionSuccess,
    onStatusUpdate,
    onWaitingPlayersCountUpdate,
    onGameStarted,
    onOpponentLeft,
    onActionError,
    onActionReceived,
    onTurnUpdate,
  } = eventHandlers;

  const BACKEND_URL = 'https://backend-batallanaval.onrender.com'

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
    });

    const currentSocket = socketRef.current;

    const handleConnect = () => console.log('Socket conectado:', currentSocket.id);
    const handleDisconnect = (reason) => console.log('Socket desconectado:', reason);
    const handleConnectError = (error) => console.error('Error de conexión Socket.IO:', error);

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('connect_error', handleConnectError);

    if (onConnectionSuccess) {
      currentSocket.on('connectionSuccess', (data) => {
        playerIdRef.current = data.playerId;
        onConnectionSuccess(data);
      });
    }
    if (onStatusUpdate) currentSocket.on('statusUpdate', onStatusUpdate);
    if (onWaitingPlayersCountUpdate) currentSocket.on('waitingPlayersCountUpdate', onWaitingPlayersCountUpdate);
    if (onGameStarted) currentSocket.on('gameStarted', onGameStarted);
    if (onOpponentLeft) currentSocket.on('opponentLeft', onOpponentLeft);
    if (onActionError) currentSocket.on('actionError', onActionError);
    if (onActionReceived) currentSocket.on('actionReceived', onActionReceived);
    if (onTurnUpdate) currentSocket.on('turnUpdate', onTurnUpdate);

    return () => {
      console.log('Desconectando socket y limpiando listeners...');
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('connect_error', handleConnectError);
      if (onConnectionSuccess) currentSocket.off('connectionSuccess');
      if (onStatusUpdate) currentSocket.off('statusUpdate');
      if (onWaitingPlayersCountUpdate) currentSocket.off('waitingPlayersCountUpdate');
      if (onGameStarted) currentSocket.off('gameStarted');
      if (onOpponentLeft) currentSocket.off('opponentLeft');
      if (onActionError) currentSocket.off('actionError');
      if (onActionReceived) currentSocket.off('actionReceived');
      if (onTurnUpdate) currentSocket.off('turnUpdate');
      currentSocket.disconnect();
    };
  }, [
    onConnectionSuccess, onStatusUpdate, onWaitingPlayersCountUpdate,
    onGameStarted, onOpponentLeft, onActionError, onActionReceived, onTurnUpdate
  ]);

  const sendPlayerAction = useCallback((actionData) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('player-action', actionData);
    } else {
      console.error('Socket no conectado. No se puede enviar la acción.');
    }
  }, []);

  return { sendPlayerAction, playerId: playerIdRef };
};