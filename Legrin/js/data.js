const BARBEROS = ['Leider', 'Gringo', 'Bobby', 'TopBoy', 'Polo'];
const HORARIOS_DIA = {
    0: { inicio: 11 * 60,           fin: 17 * 60 },      // Domingo:   11:00 - 17:00
    1: { inicio: 10 * 60,           fin: 19 * 60 + 30 }, // Lunes:     10:00 - 19:30
    2: { inicio: 10 * 60,           fin: 19 * 60 + 30 }, // Martes:    10:00 - 19:30
    3: { inicio: 10 * 60,           fin: 19 * 60 + 30 }, // Miércoles: 10:00 - 19:30
    4: { inicio:  9 * 60,           fin: 20 * 60 },      // Jueves:     9:00 - 20:00
    5: { inicio:  7 * 60,           fin: 21 * 60 },      // Viernes:    7:00 - 21:00
    6: { inicio:  7 * 60,           fin: 21 * 60 },      // Sábado:     7:00 - 21:00
};
const DURACION_CORTE = 45;

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwIepuA4Uwpwm46_-ACkX0dr8WUryjrL71bwBslMGafEYR4hDPuPr8pkEJBOFFDbGU_6g/exec';

const WHATSAPP_ADMIN = '573233486719';
const WHATSAPP_CONTACTO = '573044652515';

const cuts = [
    { id: 1, image: 'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=600&h=600&fit=crop', title: 'Fade Clásico' },
    { id: 2, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop', title: 'Undercut Moderno' },
    { id: 3, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop', title: 'Pompadour' },
    { id: 4, image: 'https://images.unsplash.com/photo-1504634712202-b4169f325185?w=600&h=600&fit=crop', title: 'Buzz Cut' },
    { id: 5, image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=600&fit=crop', title: 'Textured Crop' },
    { id: 6, image: 'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=600&h=600&fit=crop', title: 'Slicked Back' }
];

const products = [
    { id: 1, name: 'Pomada Premium',  price: '$40.000', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop', description: 'Pomada fuerte para estilos clásicos' },
    { id: 2, name: 'Aceite Barba',    price: '$20.000', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop', description: 'Hidratación y brillo' },
    { id: 3, name: 'Shampoo Barba',   price: '$20.000', image: 'https://images.unsplash.com/photo-1596510915361-a3a33ead002e?w=400&h=400&fit=crop', description: 'Limpieza profunda' },
    { id: 4, name: 'Crema Afeitar',   price: '$15.000', image: 'https://images.unsplash.com/photo-1596510915361-a3a33ead002e?w=400&h=400&fit=crop', description: 'Suave y protector' },
    { id: 5, name: 'Clay Styling',    price: '$12.000', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop', description: 'Efecto mate natural' },
    { id: 6, name: 'Serum Capilar',   price: '$15.000', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop', description: 'Reparación capilar' }
];
