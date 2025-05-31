class Pieza {
    constructor(id, name, size) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.hits = 0;
        this.positions = []; 
    }

    hit() {
        this.hits++;
        if (this.hits >= this.size) {
            this.sunk = true;
        }
    }

    isSunk() {
        return this.sunk;
    }
    
    setSize(size) {
        this.size = size;
    }

    getSize() {
        return this.size;
    }

    setHits(hits) {
        this.hits = hits;
    }

    getHits() {
        return this.hits;
    }

    setPosicion(posicion) {
        this.posicion = posicion;
    }

    getPosicion() {
        return this.posicion;
    }

    setOrientacion(orientacion) {
        this.orientacion = orientacion;
    }

    getOrientacion() {
        return this.orientacion;
    }

    setSkin(skin) {
        this.skin = skin;
    }

    getSkin() {
        return this.skin;
    }
}

export default Pieza;