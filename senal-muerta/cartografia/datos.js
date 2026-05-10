// Señal Muerta — Datos cartográficos
// Cargar antes del script principal del mapa

// SEÑALES EN TIEMPO REAL — posiciones estimadas basadas en último avistamiento
// radio: grados de margen de movimiento (~0.001° ≈ 111m)
// velocidad: grados por tick (tick = 50ms)
const creaturasDinamicas = [
  {
    id: 'CD-001',
    nombre: 'Gusano de Asfalto',
    amenaza: 'i',
    lat: 21.8825, lng: -102.2960,
    radio: 0.0022,
    velocidad: 0.000012,
    pauseProb: 0.15,
    nota: 'Desplazamiento subterráneo — firma sísmica de baja frecuencia',
    link: '../bestiario/gusano-de-asfalto.html'
  },
  {
    id: 'CD-002',
    nombre: 'Gusano de Asfalto',
    amenaza: 'i',
    lat: 21.8710, lng: -102.3010,
    radio: 0.0018,
    velocidad: 0.000010,
    pauseProb: 0.2,
    nota: 'Actividad en zona de tránsito — túneles residuales activos',
    link: '../bestiario/gusano-de-asfalto.html'
  },
  {
    id: 'CD-003',
    nombre: 'Chacal de Feria',
    amenaza: 'ii',
    lat: 21.8835, lng: -102.2895,
    radio: 0.003,
    velocidad: 0.000055,
    pauseProb: 0.1,
    nota: 'Manada de 5–7 individuos — corredor activo zona centro',
    link: '../bestiario/chacal-de-feria.html'
  },
  {
    id: 'CD-004',
    nombre: 'Hormiga Coordinadora',
    amenaza: 'ii',
    lat: 21.8818, lng: -102.2955,
    radio: 0.0012,
    velocidad: 0.000035,
    pauseProb: 0.05,
    nota: 'Columna activa — dos castas documentadas en zona norte',
    link: '../bestiario/hormiga-coordinadora.html'
  },
  {
    id: 'CD-005',
    nombre: 'Coyote Mutado',
    amenaza: 'ii',
    lat: 21.8652, lng: -102.3055,
    radio: 0.004,
    velocidad: 0.000080,
    pauseProb: 0.12,
    nota: 'Manada — actividad perimetral campus sur',
    link: '../bestiario/coyote-mutado.html'
  },
  {
    id: 'CD-006',
    nombre: 'Cervato de Concreto',
    amenaza: 'i',
    lat: 21.8840, lng: -102.2945,
    radio: 0.0025,
    velocidad: 0.000030,
    pauseProb: 0.25,
    nota: 'Avistamiento recurrente zona norte — comportamiento no agresivo',
    link: '../bestiario/cervato-de-concreto.html'
  }
];

const sujetos = [
  {
    codigo: "F-01",
    nombre: "Fabián",
    lat: 21.8820,
    lng: -102.2950,
    zona: "Colonia San Marcos",
    estado: "Activo — base establecida",
    capitulos: 4,
    link: "../personajes/fabian/index.html"
  },
  {
    codigo: "F-02",
    nombre: "Felipe",
    lat: 21.8830,
    lng: -102.2900,
    zona: "Centro histórico — departamento documentado",
    estado: "Activo — base establecida",
    capitulos: 4,
    link: "../personajes/felipe/index.html"
  },
  {
    codigo: "F-03",
    nombre: "Gaby",
    lat: 21.8780,
    lng: -102.2960,
    zona: "Zona sur — domicilio familiar",
    estado: "Activo — base establecida",
    capitulos: 1,
    link: "../personajes/gaby/index.html"
  },
  {
    codigo: "F-04",
    nombre: "Aarón",
    lat: 21.8900,
    lng: -102.2880,
    zona: "Desconocida",
    estado: "PENDIENTE DE LOCALIZACIÓN",
    capitulos: 0,
    link: "../personajes/aaron/index.html"
  },
  {
    codigo: "F-05",
    nombre: "Carlos",
    lat: 21.8650,
    lng: -102.3050,
    zona: "Campus sur UAA → Centro en tránsito",
    estado: "Activo — en movimiento",
    capitulos: 5,
    link: "../personajes/carlos/index.html"
  }
];

const avistamientos = [
  {
    id: "AV-001",
    criatura: "Cervato de Concreto",
    amenaza: "i",
    sujeto: "F-01",
    dia: 1,
    lat: 21.8840,
    lng: -102.2945,
    descripcion: "Primer avistamiento documentado. Cruce de calle zona norte, dirección oriente. Duración: 3 segundos.",
    link: "../personajes/fabian/cap-01.html"
  },
  {
    id: "AV-002",
    criatura: "Cervato de Concreto",
    amenaza: "i",
    sujeto: "F-03",
    dia: 1,
    lat: 21.7980,
    lng: -102.3800,
    descripcion: "Espécimen muerto en km 91 carretera 45. Herida letal por depredador de mayor talla. Primera evidencia de jerarquía predatoria.",
    link: "../personajes/gaby/cap-01.html"
  },
  {
    id: "AV-003",
    criatura: "Gusano de Asfalto",
    amenaza: "i",
    sujeto: "F-01",
    dia: 1,
    lat: 21.8825,
    lng: -102.2960,
    descripcion: "Detección acústica únicamente. Crujido periódico desde avenida principal. Grietas radiales en calle Galeana días posteriores.",
    link: "../personajes/fabian/cap-01.html"
  },
  {
    id: "AV-004",
    criatura: "Araña de Casa",
    amenaza: "ii",
    sujeto: "F-01",
    dia: 18,
    lat: 21.8860,
    lng: -102.2930,
    descripcion: "Primer avistamiento directo. Interior de supermercado norte, pasillo central. 8 cápsulas de eclosión recuperadas en bodega.",
    link: "../personajes/fabian/cap-04.html"
  },
  {
    id: "AV-005",
    criatura: "Chacal de Feria",
    amenaza: "ii",
    sujeto: "F-02",
    dia: 14,
    lat: 21.8835,
    lng: -102.2895,
    descripcion: "Manada de 5–7 individuos. Corredor entre avenida y mercado. Comportamiento de centinela documentado por primera vez.",
    link: "../personajes/felipe/cap-02.html"
  },
  {
    id: "AV-006",
    criatura: "Mosca Forúnculo",
    amenaza: "ii",
    sujeto: "F-02",
    dia: 21,
    lat: 21.8832,
    lng: -102.2898,
    descripcion: "Primer registro de ciclo parasitario. Centinela de Chacal de Feria como huésped. Emergencia larvaria documentada.",
    link: "../personajes/felipe/cap-03.html"
  },
  {
    id: "AV-007",
    criatura: "Mosca Forúnculo",
    amenaza: "ii",
    sujeto: "F-02",
    dia: 35,
    lat: 21.8838,
    lng: -102.2890,
    descripcion: "Primer avistamiento del adulto. Duración: menos de 1 segundo. Zumbido de componente subsónico. Forma no documentada.",
    link: "../personajes/felipe/cap-04.html"
  },
  {
    id: "AV-008",
    criatura: "Hormiga Coordinadora",
    amenaza: "ii",
    sujeto: "F-01",
    dia: 5,
    lat: 21.8818,
    lng: -102.2955,
    descripcion: "Columna activa en esquina noreste de perímetro base. Dos castas documentadas. Comportamiento de coordinación en tiempo real.",
    link: "../personajes/fabian/cap-03.html"
  },
  {
    id: "AV-009",
    criatura: "Coyote Mutado",
    amenaza: "ii",
    sujeto: "F-05",
    dia: 14,
    lat: 21.8652,
    lng: -102.3055,
    descripcion: "Tres individuos en borde norte del campus sur UAA. Evaluación prolongada sin aproximación. Primera documentación de morfología modificada.",
    link: "../personajes/carlos/cap-02.html"
  },
  {
    id: "AV-010",
    criatura: "Coyote Mutado",
    amenaza: "ii",
    sujeto: "F-05",
    dia: 21,
    lat: 21.8655,
    lng: -102.3048,
    descripcion: "Siete individuos. Primera prueba operativa del sistema de detección de F-05. Reconocieron sección cuarteada de barda sur.",
    link: "../personajes/carlos/cap-04.html"
  },
  {
    id: "AV-011",
    criatura: "Gusano de Asfalto",
    amenaza: "i",
    sujeto: "F-05",
    dia: 38,
    lat: 21.8710,
    lng: -102.3010,
    descripcion: "Primer avistamiento directo documentado. Detección anticipada por acelerómetro portátil. Vehículo dañado por túnel residual 4 cuadras después.",
    link: "../personajes/carlos/cap-05.html"
  },
  {
    id: "AV-012",
    criatura: "La Catedral",
    amenaza: "iv",
    sujeto: "F-03",
    dia: 1,
    lat: 21.8200,
    lng: -102.4500,
    descripcion: "Avistamiento desde km 87 carretera 45. Horizonte norte. Distancia: varios kilómetros. Único avistamiento confirmado en el período documentado.",
    link: "../personajes/gaby/cap-01.html"
  }
];

const zonas = [
  {
    id: "ZONA-001",
    nombre: "Territorio Toro de Calicanto — Zona Poniente",
    amenaza: "iii",
    descripcion: "Territorio marcado activo. No acceder sin escolta. Olor a amoníaco = retiro inmediato.",
    coords: [
      [21.8870, -102.3020],
      [21.8870, -102.2980],
      [21.8840, -102.2980],
      [21.8840, -102.3020]
    ]
  },
  {
    id: "ZONA-002",
    nombre: "Actividad Araña Hidráulica — Drenaje Sur",
    amenaza: "ii",
    descripcion: "Zona de drenaje con actividad confirmada. No entrar a espacios inundados sin equipo de detección.",
    coords: [
      [21.8800, -102.2920],
      [21.8800, -102.2880],
      [21.8770, -102.2880],
      [21.8770, -102.2920]
    ]
  },
  {
    id: "ZONA-003",
    nombre: "Corredor Chacal de Feria — Zona Centro",
    amenaza: "ii",
    descripcion: "Actividad nocturna confirmada. Evitar después de las 22:00 hrs sin grupo.",
    coords: [
      [21.8850, -102.2910],
      [21.8850, -102.2880],
      [21.8820, -102.2880],
      [21.8820, -102.2910]
    ]
  },
  {
    id: "ZONA-004",
    nombre: "Campus Sur UAA — Base F-05",
    amenaza: "i",
    descripcion: "Infraestructura de detección activa. Acceso coordinado requerido. Actividad no identificada en perímetro norte.",
    coords: [
      [21.8670, -102.3070],
      [21.8670, -102.3030],
      [21.8635, -102.3030],
      [21.8635, -102.3070]
    ]
  }
];

const rutas = [
  {
    id: "RUTA-001",
    nombre: "Tránsito F-03 — León a Aguascalientes",
    sujeto: "F-03",
    descripcion: "Carretera 45. Detenida en km 87 por accidente en cadena. Llegó a Aguascalientes por brecha alternativa al día siguiente.",
    color: "#8a8670",
    coords: [
      [21.1167, -101.6833],
      [21.5000, -102.1000],
      [21.7980, -102.3800],
      [21.8500, -102.3200],
      [21.8780, -102.2960]
    ]
  },
  {
    id: "RUTA-002",
    nombre: "Tránsito F-05 — Campus Sur a Centro",
    sujeto: "F-05",
    descripcion: "Semana 5–6 post-Emergencia. Vehículo dañado por Gusano de Asfalto. Completó el trayecto a pie.",
    color: "#c8a84a",
    coords: [
      [21.8650, -102.3050],
      [21.8680, -102.3020],
      [21.8700, -102.2980],
      [21.8710, -102.3010],
      [21.8750, -102.2970],
      [21.8830, -102.2900]
    ]
  }
];

const infraestructura = [
  {
    id: "INF-001",
    nombre: "Hospital General de Aguascalientes",
    tipo: "medical",
    descripcion: "Operativo durante días 1–3 post-Emergencia bajo F-02. Actualmente sin personal médico confirmado.",
    lat: 21.8810,
    lng: -102.2870,
    link: "../personajes/felipe/cap-01.html"
  },
  {
    id: "INF-002",
    nombre: "Campus Sur UAA",
    tipo: "base",
    descripcion: "Base de operaciones F-05. Sistema de detección por vibración instalado. Capacidad: 34+ personas.",
    lat: 21.8650,
    lng: -102.3050,
    link: "../personajes/carlos/index.html"
  },
  {
    id: "INF-003",
    nombre: "Km 87 — Carretera 45",
    tipo: "incidente",
    descripcion: "Punto de detención de F-03. Cervato de Concreto muerto con evidencia de depredador mayor. Primera evidencia de jerarquía predatoria.",
    lat: 21.7980,
    lng: -102.3800,
    link: "../personajes/gaby/cap-01.html"
  }
];
