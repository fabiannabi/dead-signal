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
    radio: 0.0010,
    velocidad: 0.000003,
    pauseProb: 0.18,
    nota: 'Desplazamiento subterráneo — firma sísmica de baja frecuencia',
    link: '../bestiario/gusano-de-asfalto.html'
  },
  {
    id: 'CD-002',
    nombre: 'Gusano de Asfalto',
    amenaza: 'i',
    lat: 21.8710, lng: -102.3010,
    radio: 0.0009,
    velocidad: 0.000003,
    pauseProb: 0.22,
    nota: 'Actividad en zona de tránsito — túneles residuales activos',
    link: '../bestiario/gusano-de-asfalto.html'
  },
  {
    id: 'CD-003',
    nombre: 'Chacal de Feria',
    amenaza: 'ii',
    lat: 21.8835, lng: -102.2895,
    radio: 0.0015,
    velocidad: 0.000014,
    pauseProb: 0.10,
    nota: 'Manada de 5–7 individuos — corredor activo zona centro',
    link: '../bestiario/chacal-de-feria.html'
  },
  {
    id: 'CD-004',
    nombre: 'Hormiga Coordinadora',
    amenaza: 'ii',
    lat: 21.8818, lng: -102.2955,
    radio: 0.0006,
    velocidad: 0.000009,
    pauseProb: 0.05,
    nota: 'Columna activa — dos castas documentadas en zona norte',
    link: '../bestiario/hormiga-coordinadora.html'
  },
  {
    id: 'CD-005',
    nombre: 'Coyote Mutado',
    amenaza: 'ii',
    lat: 21.8652, lng: -102.3055,
    radio: 0.0018,
    velocidad: 0.000020,
    pauseProb: 0.12,
    nota: 'Manada — actividad perimetral campus sur',
    link: '../bestiario/coyote-mutado.html'
  },
  {
    id: 'CD-006',
    nombre: 'Cervato de Concreto',
    amenaza: 'i',
    lat: 21.8840, lng: -102.2945,
    radio: 0.0012,
    velocidad: 0.000008,
    pauseProb: 0.28,
    nota: 'Avistamiento recurrente zona norte — comportamiento no agresivo',
    link: '../bestiario/cervato-de-concreto.html'
  }
];

// GRUPOS NO IDENTIFICADOS — zonas sin cobertura documental previa
// size: número de puntos en el cluster (3 o 5)
const gruposActivos = [
  {
    id: 'GR-001',
    size: 5,
    amenaza: 'ii',
    lat: 21.8952, lng: -102.2675,
    radio: 0.0016,
    velocidad: 0.000011,
    pauseProb: 0.08,
    nota: 'Señal no clasificada — patrón de grupo — zona noreste sin cobertura documental'
  },
  {
    id: 'GR-002',
    size: 3,
    amenaza: 'i',
    lat: 21.8925, lng: -102.3115,
    radio: 0.0012,
    velocidad: 0.000007,
    pauseProb: 0.22,
    nota: 'Señal de baja intensidad — agrupación débil — zona noroeste'
  },
  {
    id: 'GR-003',
    size: 4,
    amenaza: 'ii',
    lat: 21.8815, lng: -102.2715,
    radio: 0.0014,
    velocidad: 0.000013,
    pauseProb: 0.10,
    nota: 'Señal no clasificada — movimiento coordinado — zona este sin documentar'
  },
  {
    id: 'GR-004',
    size: 3,
    amenaza: 'iii',
    lat: 21.8725, lng: -102.2875,
    radio: 0.0010,
    velocidad: 0.000006,
    pauseProb: 0.28,
    nota: 'Señal de alta intensidad — origen desconocido — corredor sur'
  }
];

// ALERTAS ACTIVAS — se selecciona una aleatoriamente al cargar el mapa
const alertasActivas = [
  { codigo: 'ALR-001', texto: 'Manada Chacal de Feria — corredor norte-centro — comportamiento de caza coordinado', señales: 7 },
  { codigo: 'ALR-002', texto: 'Actividad sísmica Gusano de Asfalto — zona norte — asfalto con deterioro reciente detectado', señales: 2 },
  { codigo: 'ALR-003', texto: 'Columna Hormiga Coordinadora — cruzando perímetro este — nueva casta documentada', señales: 11 },
  { codigo: 'ALR-004', texto: 'Coyote Mutado — aproximación a barda norte campus sur — reconocimiento de estructura', señales: 4 },
  { codigo: 'ALR-005', texto: 'Señal no clasificada — zona noreste sin cobertura previa — patrón de grupo confirmado', señales: 5 },
  { codigo: 'ALR-006', texto: 'Actividad acústica subterránea — avenida central norte — origen sin confirmar', señales: 1 },
  { codigo: 'ALR-007', texto: 'Cervato de Concreto — grupo de tres especímenes — zona parques norte — sin agresividad', señales: 3 },
  { codigo: 'ALR-008', texto: 'Firma vibratoria en zona de drenaje sur — posible Araña Hidráulica — acceso cerrado', señales: 1 },
  { codigo: 'ALR-009', texto: 'Hormiga Coordinadora — expansión de perímetro conocido — nuevas cámaras detectadas bajo vialidad', señales: 8 },
  { codigo: 'ALR-010', texto: 'Chacal de Feria — actividad nocturna documentada — zona mercado — centinela avanzado activo', señales: 6 },
  { codigo: 'ALR-011', texto: 'Señal no clasificada — zona noroeste — patrón circular — sin análogo en catálogo actual', señales: 3 },
  { codigo: 'ALR-012', texto: 'Gusano de Asfalto — crujido registrado — calle sin mapear sector norte — evacuación preventiva', señales: 1 },
  { codigo: 'ALR-013', texto: 'Coyote Mutado — reconocimiento de zona residencial nueva — manada ampliada — 9 individuos', señales: 9 },
  { codigo: 'ALR-014', texto: 'Señal de alta intensidad — ZONA-001 zona poniente — retiro inmediato — protocolo activo', señales: 1 },
  { codigo: 'ALR-015', texto: 'Cervato de Concreto — espécimen aislado — zona industrial este — comportamiento errático registrado', señales: 1 },
  { codigo: 'ALR-016', texto: 'Chacal de Feria — centinela avanzado — límite norte — posible expansión de territorio activa', señales: 1 },
  { codigo: 'ALR-017', texto: 'Actividad de vuelo sobre zona centro — frecuencia subsónica — posible Mosca Forúnculo adulta', señales: 1 },
  { codigo: 'ALR-018', texto: 'Hormiga Coordinadora — columna cruzando infraestructura vial principal — interrupción de tránsito', señales: 14 },
  { codigo: 'ALR-019', texto: 'Señal no clasificada — zona industrial este — patrón circular — sin categorización posible', señales: 4 },
  { codigo: 'ALR-020', texto: 'Gusano de Asfalto — emergencia superficial registrada a mediodía — testigo anónimo — no confirmado', señales: 1 },
  { codigo: 'ALR-021', texto: 'Chacal de Feria — manada completa en espacio abierto — riesgo de contacto elevado — zona sur', señales: 8 },
  { codigo: 'ALR-022', texto: 'Señal no clasificada — sector residencial norte — origen indeterminado — patrón persistente', señales: 6 },
  { codigo: 'ALR-023', texto: 'Coyote Mutado — ruta de patrullaje ampliada 400m respecto a semana anterior — tendencia documentada', señales: 7 },
  { codigo: 'ALR-024', texto: 'Cervato de Concreto — actividad de forrajeo en zona parques — tres especímenes jóvenes', señales: 3 },
  { codigo: 'ALR-025', texto: 'Vibración intensa zona poniente — firma no coincide con Gusano de Asfalto — análisis en curso', señales: 1 },
  { codigo: 'ALR-026', texto: 'Hormiga Coordinadora — nueva cámara detectada bajo infraestructura vial — riesgo estructural menor', señales: 9 },
  { codigo: 'ALR-027', texto: 'Chacal de Feria — comportamiento de caza sobre objetivo no identificado — zona norte — en curso', señales: 5 },
  { codigo: 'ALR-028', texto: 'Señal no clasificada — corredor sur — patrón de movimiento no registrado en catálogo actual', señales: 3 },
  { codigo: 'ALR-029', texto: 'Gusano de Asfalto — red de túneles residuales activos — firma sísmica acumulada — zona norte', señales: 2 },
  { codigo: 'ALR-030', texto: 'Señal de alta prioridad — datos insuficientes — zona central — clasificación pendiente — no aproximar', señales: 4 }
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
