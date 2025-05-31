import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useSocketManager = (eventHandlers) => {
  const socketRef = useRef(null);
  const playerIdRef = useRef(null); // Para almacenar el ID asignado por el servidor

  // Desestructura los manejadores de eventos pasados como argumento
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

  // La forma correcta de inicializar:

  useEffect(() => {
    // Conectar al servidor de Socket.IO
    socketRef.current = io(BACKEND_URL, {
        reconnectionAttempts: 5, // Intentar reconectar algunas veces
        reconnectionDelay: 3000, // Esperar 3 segundos entre intentos
    });

    const currentSocket = socketRef.current; // Captura la referencia actual para usar en el cleanup

    const handleConnect = () => console.log('Socket conectado:', currentSocket.id);
    const handleDisconnect = (reason) => console.log('Socket desconectado:', reason);
    const handleConnectError = (error) => console.error('Error de conexión Socket.IO:', error);

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('connect_error', handleConnectError);

    // Registrar listeners para eventos personalizados
    if (onConnectionSuccess) {
      currentSocket.on('connectionSuccess', (data) => {
        playerIdRef.current = data.playerId; // Almacena el ID del jugador
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

    // Limpieza al desmontar el componente
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
    // Las dependencias son los manejadores. Si cambian, el efecto se re-ejecuta.
    // Asegúrate de que estos manejadores estén envueltos en useCallback en App.jsx.
  }, [
    onConnectionSuccess, onStatusUpdate, onWaitingPlayersCountUpdate,
    onGameStarted, onOpponentLeft, onActionError, onActionReceived, onTurnUpdate
  ]);

  // Función para enviar acciones al servidor
  const sendPlayerAction = useCallback((actionData) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('player-action', actionData);
    } else {
      console.error('Socket no conectado. No se puede enviar la acción.');
    }
  }, []); // No hay dependencias aquí ya que socketRef.current no debería cambiar su identidad una vez asignado

  return { sendPlayerAction, playerId: playerIdRef }; // Exponer playerIdRef para que App.jsx pueda leerlo
};