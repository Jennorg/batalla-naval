import TableroClass from '@/classes/tablero/Tablero'; 
import { SHIP_TYPES_CONFIG } from '@/assets/SHIP_TYPES_CONFIG.JS';

export const placeRivalShipsRandomly = (tablero, shipTypesConfig) => {
  let currentBoard = tablero; 

  for (const shipConfig of shipTypesConfig) {
    for (let i = 0; i < shipConfig.initialCount; i++) {
      let placed = false;
      let attempts = 0;
      const newShipInstance = new shipConfig.ShipClass(); 

      while (!placed && attempts < 500) { 
        const row = Math.floor(Math.random() * currentBoard.size);
        const col = Math.floor(Math.random() * currentBoard.size);
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';

        const placeResult = currentBoard.placeShip(newShipInstance, row, col, orientation);

        if (placeResult.success) {
          currentBoard = placeResult.newTablero; 
          placed = true;
        }
        attempts++;
      }
      if (!placed) {
        console.warn(`No se pudo colocar el barco ${newShipInstance.name} (intentos: ${attempts}).`);
      }
    }
  }
  return currentBoard; 
};