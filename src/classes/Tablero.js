import CeldaClass from './Celda.js';

class Tablero {
  constructor(size = 10, initialGrid = null, initialShips = null) {
    this.size = size;
    this.grid = initialGrid 
      ? initialGrid.map(row => row.map(cell => ({...cell}))) 
      : Array(size).fill(null).map((_, r) => Array(size).fill(null).map((_, c) => new CeldaClass(r, c)));
    this.ships = initialShips ? [...initialShips] : []; 
  }

  getShipCells(shipSize, startRow, startCol, orientation) {
    const cells = [];
    for (let i = 0; i < shipSize; i++) {
      let r = startRow;
      let c = startCol;
      if (orientation === 'horizontal') {
        c += i;
      } else {
        r += i;
      }
      cells.push({ row: r, col: c });
    }
    return cells;
  }

  canPlaceShip(shipSize, startRow, startCol, orientation) {
    if (shipSize <= 0) return false;
    const potentialCells = this.getShipCells(shipSize, startRow, startCol, orientation);
    for (const cellPos of potentialCells) {
      if (cellPos.row < 0 || cellPos.row >= this.size || cellPos.col < 0 || cellPos.col >= this.size) {
        return false;
      }
      if (this.grid[cellPos.row][cellPos.col].isOccupied) {
        return false;
      }
    }
    return true;
  }

  placeShip(shipInstance, startRow, startCol, orientation) {
    if (!this.canPlaceShip(shipInstance.size, startRow, startCol, orientation)) {
      return { success: false, newTablero: this }; 
    }

    const newGrid = this.grid.map(row => row.map(cell => ({...cell})));
    const cellsToOccupy = this.getShipCells(shipInstance.size, startRow, startCol, orientation);

    cellsToOccupy.forEach(cellPos => {
      const cellInNewGrid = newGrid[cellPos.row][cellPos.col];
      cellInNewGrid.isOccupied = true;
      cellInNewGrid.shipId = shipInstance.id; 
      cellInNewGrid.shipName = shipInstance.name; 
    });

    shipInstance.positions = cellsToOccupy;

    const newShips = [...this.ships, shipInstance]; 
    
    return { success: true, newTablero: new Tablero(this.size, newGrid, newShips) };
  }

  attackCell(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return { status: 'invalid', message: 'Ataque fuera de límites.', newTablero: this };
    }

    const cell = this.grid[row][col];

    if (cell.isHit) {
      return { status: 'already_hit', message: 'Celda ya atacada.', newTablero: this };
    }

    const newGrid = this.grid.map(r => r.map(c => ({...c})));
    const newCell = newGrid[row][col];
    newCell.isHit = true;

    let attackStatus = 'miss';
    let attackMessage = '¡Agua!';
    let shipName = null;
    let sunkShip = null;
    const newShips = this.ships.map(s => {
        console.log('Clonando barco:', s.name, 'ID:', s.id);
        const ClonedShipClass = s.constructor; // Obtiene la clase del barco original
        const clonedShip = new ClonedShipClass(s.id, s.name, s.size /* otros args del constructor si los hay */); // Recrea usando el constructor
        Object.assign(clonedShip, s); // Copia las propiedades. 'hits' se debe copiar. 'positions' también.
        clonedShip.hits = s.hits; // Asegúrate de que 'hits' se copie explícitamente si Object.assign no lo hace bien para tu setup.
        clonedShip.positions = [...s.positions]; // Asegura una copia profunda de las posiciones si es un array de objetos
        return clonedShip;
    });

    console.log('Nueva celda atacada:', newCell);
    if (newCell.isOccupied && newCell.shipId) {
      const shipIndex = newShips.findIndex(s => s.id === newCell.shipId);
      console.log('Barco encontrado:', newShips[shipIndex].name, 'en la celda:', row, col);
      if (shipIndex !== -1) {
        const updatedShip = newShips[shipIndex];

        updatedShip.hits += 1;
        console.log('hit en barco:', updatedShip.name, 'Hits actuales:', updatedShip.hits);

        if (updatedShip.isSunk()) {
          attackStatus = 'sunk';
          shipName = updatedShip.name;
          attackMessage = `¡Hundiste un ${updatedShip.name}!`;
          sunkShip = updatedShip;

          // --- INICIO: Lógica para marcar celdas del barco hundido ---
          if (updatedShip.positions && updatedShip.positions.length > 0) {
            updatedShip.positions.forEach(pos => {
              if (newGrid[pos.row] && newGrid[pos.row][pos.col]) {
                newGrid[pos.row][pos.col].isSunkShipPart = true;
              }
            });
          }
          // --- FIN: Lógica para marcar celdas del barco hundido ---

          // ***** Punto de Depuración: Console.log *****
          console.log(`------------------------------------`);
          console.log(`BARCO HUNDIDO DETECTADO:`);
          console.log(`Nombre/ID: ${updatedShip.name || updatedShip.id}`);
          console.log(`Hits: ${updatedShip.hits} / Tamaño: ${updatedShip.size}`);
          console.log(`Posiciones del barco:`, JSON.parse(JSON.stringify(updatedShip.positions)));
          console.log(`Celdas marcadas como 'isSunkShipPart':`);
          updatedShip.positions.forEach(pos => {
            if (newGrid[pos.row] && newGrid[pos.row][pos.col]) {
                console.log(`  Celda [${pos.row}, ${pos.col}]: `, newGrid[pos.row][pos.col]);
            }
          });
          console.log(`------------------------------------`);
          // ***** Fin del Console.log *****

        } else {
          attackStatus = 'hit';
          shipName = updatedShip.name;
          attackMessage = `¡Impacto en ${updatedShip.name}!`;
        }
      }
    }

    return { status: attackStatus, message: attackMessage, shipName: shipName, sunkShip: sunkShip, newTablero: new Tablero(this.size, newGrid, newShips) };
  }

  areAllShipsSunk() {
    if (this.ships.length === 0) return false;
    return this.ships.every(ship => ship && typeof ship.isSunk === 'function' && ship.isSunk());
  }

  reset() {
    return new Tablero(this.size);
  }
}

export default Tablero;