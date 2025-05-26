import Pieza from '@/classes/Pieza';

class Lancha extends Pieza{
    constructor() {
        super(1)
        this.skin = '/public/piezas/lancha.png'
    }
}

export default Lancha;