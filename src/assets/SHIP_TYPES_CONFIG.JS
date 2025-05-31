import LanchaClass from '@/classes/ships/Lancha';
import AcorazadoClass from '@/classes/ships/Acorazado';
import BuqueClass from '@/classes/ships/Buque';
import PortaavionesClass from '@/classes/ships/Portaaviones';
import SubmarinoClass from '@/classes/ships/Submarino';

export const SHIP_TYPES_CONFIG = [
  { id: 'lancha', name: 'Lancha', size: 1, ShipClass: LanchaClass, initialCount: 1 },  
  { id: 'buque', name: 'Buque', size: 2, ShipClass: BuqueClass, initialCount: 1 },
  // { id: 'submarino', name: 'Submarino', size: 3, ShipClass: SubmarinoClass, initialCount: 1 },
  // { id: 'acorazado', name: 'Acorazado', size: 4, ShipClass: AcorazadoClass, initialCount: 1 },
  // { id: 'portaaviones', name: 'Portaaviones', size: 5, ShipClass: PortaavionesClass, initialCount: 1 },
];