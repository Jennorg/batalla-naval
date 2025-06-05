import { v4 as uuidv4 } from 'uuid';

class Pieza {
    constructor(id = uuidv4(), name, size, hits = 0, orientation, positions = []) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.hits = hits;
        this.orientation = orientation;
        this.positions = positions; 
    }

    isSunk() {
        return this.hits >= this.size;
    }

    toSimpleObject() {
        return {
            id: this.id,
            name: this.name,
            size: this.size,
            hits: this.hits,
            orientation: this.orientation,
            positions: this.positions.map(p => ({ row: p.row, col: p.col })),
            isSunk: this.isSunk(),
        };
    }

    static fromObject(obj) {
        const pieza = new Pieza(
            obj.id, 
            obj.name, 
            obj.size, 
            obj.hits, 
            obj.orientation, 
            obj.positions.map(p => ({ row: p.row, col: p.col }))
        );
        return pieza;
    }
}

export default Pieza;