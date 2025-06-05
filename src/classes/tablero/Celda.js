class Celda {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.isOccupied = false;
        this.shipId = null;
        this.shipName = null;
        this.isHit = false;
        this.isSunkShipPart = false;
    }

    toSimpleObject() {
        return {
            row: this.row,
            col: this.col,
            isOccupied: this.isOccupied,
            shipId: this.shipId,
            shipName: this.shipName,
            isHit: this.isHit,
            isSunkShipPart: this.isSunkShipPart,
        };
    }

    static fromObject(obj) {
        const celda = new Celda(obj.row, obj.col);
        celda.isOccupied = obj.isOccupied || false;
        celda.shipId = obj.shipId || null;
        celda.shipName = obj.shipName || null;
        celda.isHit = obj.isHit || false;
        celda.isSunkShipPart = obj.isSunkShipPart || false;
        return celda;
    }
}

export default Celda;