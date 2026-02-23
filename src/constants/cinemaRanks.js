export const CINEMA_RANKS = [
    { min: 0, title: "Turista de Estudio", desc: "Acabas de entrar al set." },
    { min: 10, title: "Extra de Fondo", desc: "Ya sabes dónde pararte." },
    { min: 25, title: "Claquetista", desc: "¡Luces, cámara, acción!" },
    { min: 50, title: "Focus Puller", desc: "Manteniendo la nitidez." },
    { min: 100, title: "Montajista", desc: "Creando narrativa en las sombras." },
    { min: 200, title: "Director de Fotografía", desc: "Pintando con luz." },
    { min: 300, title: "Guionista Auteur", desc: "La pluma es más fuerte que el lente." },
    { min: 400, title: "Productor Visionario", desc: "Haces que lo imposible suceda." },
    { min: 480, title: "Arquitecto de Sueños", desc: "Construyes realidades." },
    { min: 500, title: "Lumière Renacido", desc: "Eres el cine mismo." }
];

export const getRankTitle = (count) => {
    const rank = [...CINEMA_RANKS].reverse().find(r => (count || 0) >= r.min);
    return rank ? rank.title.toUpperCase() : "TURISTA DE ESTUDIO";
};

export const getRankInfo = (count) => {
    return [...CINEMA_RANKS].reverse().find(r => (count || 0) >= r.min) || CINEMA_RANKS[0];
};
