export const placeRivalShipsRandomly = (board, shipTypesConfig) => {
  shipTypesConfig.forEach(shipConfig => {
    for (let i = 0; i < shipConfig.initialCount; i++) {
      let placed = false;
      // Se necesita la clase del barco para instanciarlo
      const ShipClass = shipConfig.ShipClass; 
      if (!ShipClass) {
        console.error(`Clase de barco no definida para ${shipConfig.name}`);
        continue;
      }
      const shipInstance = new ShipClass();
      
      for (let attempt = 0; attempt < 100 && !placed; attempt++) {
        const row = Math.floor(Math.random() * board.size);
        const col = Math.floor(Math.random() * board.size);
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        if (board.placeShip(shipInstance, row, col, orientation)) {
          placed = true;
        }
      }
      if (!placed) {
        console.warn(`No se pudo colocar el ${shipConfig.name} del rival en el tablero proporcionado.`);
      }
    }
  });
};