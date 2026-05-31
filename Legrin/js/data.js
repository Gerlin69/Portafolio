const BARBEROS_CONFIG = [
    { key: 'Leider',  nombre: 'Leider V.',          whatsapp: '573044652515' },
    { key: 'Gringo',  nombre: 'Andres M. "Gringo"', whatsapp: '573222222222' },
    { key: 'Dobby',   nombre: 'Freddy R "Dobby"',   whatsapp: '573233333333' },
    { key: 'Tyga',  nombre: 'Felipe M. "Tyga"',   whatsapp: '57302' },
    { key: 'Polo',    nombre: 'Juan Diaz "Polo"',   whatsapp: '573255555555' },
];
const BARBEROS = BARBEROS_CONFIG.map(b => b.nombre);
const ADMIN_PIN = 'legrin1234';
const HORARIOS_DIA = {
    0: { inicio: 10 * 60,           fin: 17 * 60       }, // Domingo:   10:00 - 17:00
    1: { inicio: 10 * 60,           fin: 19 * 60 + 30 }, // Lunes:     10:00 - 19:30
    2: { inicio: 10 * 60,           fin: 19 * 60 + 30 }, // Martes:    10:00 - 19:30
    3: { inicio: 10 * 60,           fin: 19 * 60 + 30 }, // Miércoles: 10:00 - 19:30
    4: { inicio:  9 * 60,           fin: 19 * 60 + 30 }, // Jueves:     9:00 - 19:30
    5: { inicio:  7 * 60,           fin: 19 * 60 + 30 }, // Viernes:    7:00 - 19:30
    6: { inicio:  7 * 60,           fin: 19 * 60 + 30 }, // Sábado:     7:00 - 19:30
};
const DURACION_CORTE = 45;
const ALMUERZO = { inicio: 13 * 60, fin: 14 * 60, buffer: 5 }; // 1:00 PM - 2:00 PM, reinicia a las 2:05 PM

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkZB0MyiCJoVroKVuG7Povnf7KQaZPe4sNAjVQcnNde1-tXIhcD6pmmLbecGBHAy-LMA/exec';
const APPS_SCRIPT_TOKEN = 'Lgr9vBk2xMpQ7nRs4'; // cambiar este valor y actualizar también en Apps Script
const IMGBB_API_KEY = 'b60c57bd67096bc0d9e5d5789473aab2'; // Obtén tu API key gratuita en: https://api.imgbb.com/

const WHATSAPP_ADMIN = '573233486719';
const WHATSAPP_CONTACTO = '573044652515';

const cuts = [
    { id: 1, image: 'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=600&h=600&fit=crop', title: 'Jersey' },
    { id: 2, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop', title: 'El Hongo' },
    { id: 3, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop', title: 'El 7' },
    { id: 4, image: 'https://images.unsplash.com/photo-1504634712202-b4169f325185?w=600&h=600&fit=crop', title: 'Buzz Cut' },
    { id: 5, image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=600&fit=crop', title: 'Textured Crop' },
    { id: 6, image: 'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=600&h=600&fit=crop', title: 'Slicked Back' }
];

const products = [
    { id: 1, name: 'Cera',            price: '$30.000', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop', description: 'Pomada fuerte para estilos clásicos' },
    { id: 2, name: 'Minoxidil',       price: '$20.000', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop', description: 'Hidratación y brillo' },
    { id: 3, name: 'Shampoos',        price: '$20.000', image: 'https://images.unsplash.com/photo-1596510915361-a3a33ead002e?w=400&h=400&fit=crop', description: 'Limpieza profunda' },
    { id: 4, name: 'Perfumes',        price: '$15.000', image: 'https://images.unsplash.com/photo-1596510915361-a3a33ead002e?w=400&h=400&fit=crop', description: 'Fragancias exclusivas para hombre' },
    { id: 5, name: 'Primitivos Men',  price: '$45.000', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop', description: 'Línea de cuidado masculino premium' },
];
