class Celda {
    constructor(row, col) {
      this.row = row;
      this.col = col;
      this.isOccupied = false;
      this.isHit = false;
      this.shipId = null;
      this.shipName = null;
      this.isSunkShipPart = false; 
    }
  }
  
  export default Celda;