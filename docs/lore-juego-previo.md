# Lore del juego previo (Groq)

Código y textos que usaba la versión anterior de *Crónicas de Avaloria* (v0.4.0, narración 100 % con Groq).
Se guardan solo como referencia: la versión actual narra con el narrador por código y no los usa.

## Lugares y NPC (`LOCATIONS`)

```js
const LOCATIONS = {
  ardenhall: {
    id:'ardenhall', name:'Ardenhall', scene:'ciudad', regionMod:1.02,
    desc:'La capital huele a papel seco, pan reciente y piedra lavada. Los barrios discuten entre sí sin levantar la voz.',
    npcs:[
      { id:'maren_archivista', nombre:'Maren de Orst', rol:'archivista del Archivo Real', afinidadGeneral:0, hechosMemorables:[], voz:'corta, precisa, poco amiga del exceso' },
      { id:'serel_panadero', nombre:'Serel Norlen', rol:'panadero del Mercado Circular', afinidadGeneral:0, hechosMemorables:[], voz:'seca, hospitalaria al final' }
    ],
    quick:['Ir al Mercado Circular','Hablar con alguien del Archivo','Dormir en una posada humilde','Leer extensamente en una sala pública']
  },
  lareth: {
    id:'lareth', name:'Lareth', scene:'mercado', regionMod:0.97,
    desc:'Lareth no duerme. Las campanas llegan antes de tiempo y los tratos antes del nombre.',
    npcs:[
      { id:'ivor_cambista', nombre:'Ivor Aster', rol:'cambista y prestamista menor', afinidadGeneral:0, hechosMemorables:[], voz:'amable de superficie, exacto con cada palabra' },
      { id:'naela_tabernera', nombre:'Naela Riven', rol:'tabernera de turno nocturno', afinidadGeneral:0, hechosMemorables:[], voz:'rápida, burlona, nada ingenua' }
    ],
    quick:['Regatear por pan fresco','Buscar noticias del comercio','Dormir unas horas','Viajar a Ardenhall']
  },
  halenor: {
    id:'halenor', name:'Halenor', scene:'conocimiento', regionMod:1.05,
    desc:'Halenor suena a tiza, pasos medidos y hojas pasadas con cuidado. Acá una pregunta vale más que una pose.',
    npcs:[
      { id:'tiren_docente', nombre:'Tiren Selvan', rol:'docente de cartografía', afinidadGeneral:0, hechosMemorables:[], voz:'calma, afilada, no regala certezas' },
      { id:'elia_bibliotecaria', nombre:'Elia Miren', rol:'bibliotecaria pública', afinidadGeneral:0, hechosMemorables:[], voz:'amable, filosa con la pereza intelectual' }
    ],
    quick:['Leer extensamente','Preguntar por una anomalía','Dormir en una pensión sobria','Viajar a Lareth']
  }
};
```

## Lore absoluto y palabras clave (`ABSOLUTE_LORE`, `ALWAYS_LORE_IDS`, `LOCATION_LORE_MAP`, `LORE_KEYWORDS`)

```js
const ABSOLUTE_LORE = {
  "version": "1.0",
  "notas": "Fichas de canon absoluto extraídas de los cinco tomos. Foco en Veridonia (jugable en el MVP). Caelumia y Aetheria llevan entradas livianas para que el narrador no las contradiga si aparecen mencionadas. 'misterioPermanente': true marca contenido que el juego nunca debe resolver, ni ahora ni en eventos de mundo futuros.",
  "fichas": [
    { "id": "avaloria_general", "categoria": "concepto", "region": "avaloria", "etiquetas": ["nacion", "dos_coronas", "tratado"], "resumenCorto": "Avaloria es una única nación dividida en dos reinos soberanos desde el Tratado de las Dos Coronas (Año 500 A.A.): Veridonia y Caelumia. Comparten moneda, idioma oficial y ciudadanía; ninguno reclama superioridad sobre el otro.", "fuente": "Vol. I, 3/16 y 4/16" },
    { "id": "calendario_avaloriano", "categoria": "concepto", "region": "avaloria", "etiquetas": ["tiempo", "fecha"], "resumenCorto": "El Calendario Avaloriano empieza en el Año 0 con la firma del Pacto de la Primera Corona. Año actual de referencia de los tomos: 763 A.A.", "fuente": "Vol. I, 2/16" },
    { "id": "sistema_monetario", "categoria": "economia", "region": "avaloria", "etiquetas": ["dinero", "moneda", "conversion"], "resumenCorto": "1 Plata = 100 Bronce. 1 Oro = 100 Plata. 1 Platino = 100 Oro. 1 Moneda Monarca = 10.000 Platino (metal Monarita, casi nunca circula, no puede refundirse). Cada moneda lleva el sello de ambas Coronas.", "fuente": "Vol. I, 8/16" },
    { "id": "precios_referencia", "categoria": "economia", "region": "avaloria", "etiquetas": ["precio", "aproximado"], "resumenCorto": "Referencia aproximada, no fija: pan duro 5 bronce, pan fresco 10 bronce, posada humilde 5 plata/noche, posada de lujo 80 plata/noche, vivienda cómoda ~10 platino, mansión hasta 50 platino, pueblo pequeño ~450 platino, ciudad importante 1000+ platino. Los precios varían por ciudad, estación y circunstancia.", "fuente": "Vol. I, 8/16" },
    { "id": "tratado_dos_coronas", "categoria": "historia", "region": "avaloria", "etiquetas": ["tratado", "guerra", "año_500"], "resumenCorto": "Firmado bajo el Gran Roble de Ardenhall, otoño del Año 500 A.A., tras 31 años de Guerra de las Dos Coronas (469–500). Puso fin a la Crisis de las Coronas (iniciada ~420 A.A.). Avaloria permanece unida; Veridonia y Caelumia son reinos soberanos con moneda, ciudadanía e idioma compartidos.", "fuente": "Vol. I, 3/16 y 14/16" },
    { "id": "monarita", "categoria": "material", "region": "avaloria", "etiquetas": ["mineral", "moneda_monarca"], "resumenCorto": "Metal violeta usado para acuñar la Moneda Monarca. Se adhiere a piedra, madera, cristal o hierro sin pegamento y recupera su posición exacta al separarse y volver a acercarse. Nunca pudo refundirse. Nadie sabe con certeza dónde se encontró originalmente; los documentos más antiguos ya lo describen como material antiguo.", "fuente": "Vol. I, 3/16 y 15/16", "misterioPermanente": true },
    { "id": "reino_veridonia", "categoria": "region", "region": "veridonia", "etiquetas": ["reino", "bosque"], "resumenCorto": "Reino Verde, tierras septentrionales y occidentales de Avaloria. Bosques, praderas, ríos y ciudades construidas alrededor de ríos, no de fortalezas. Carácter paciente, comerciante, poco dado a la ostentación.", "fuente": "Vol. I, 1/16" },
    { "id": "limites_veridonia", "categoria": "geografia", "region": "veridonia", "etiquetas": ["frontera", "montana", "oceano"], "resumenCorto": "Norte: Montañas Blancas. Oeste: Gran Océano Verde. Este: Cordilleras Gemelas (frontera con Caelumia). Sur: ríos y bosques que se mezclan con llanuras.", "fuente": "Vol. I, 1/16" },
    { "id": "casa_elarion", "categoria": "corona", "region": "veridonia", "etiquetas": ["dinastia", "corona", "gobierno"], "resumenCorto": "Única dinastía que gobernó Veridonia desde la Fundación. Lema: 'El bosque crece más lento que la ambición'. Todo heredero hace el Viaje Verde (un año recorriendo el reino sin revelar su identidad) antes de ser coronado. Todos los Elarion aprenden un oficio manual.", "fuente": "Vol. I, 5/16; Vol. IV, 2/16" },
    { "id": "rey_actual_veridonia", "categoria": "gobierno", "region": "veridonia", "etiquetas": ["rey", "actual"], "resumenCorto": "Edric V Elarion, rey actual de Veridonia (gobierna desde hace 35 años, 59 años de edad). Recorre el Mercado Viejo de incógnito cada otoño. Este dato es CANON DINÁMICO: puede cambiar por consecuencias del juego, ver WorldChronicle.", "fuente": "Vol. IV, 2/16; Vol. V, 5/16", "canonDinamico": true },
    { "id": "guardianes_roble", "categoria": "institucion", "region": "veridonia", "etiquetas": ["orden", "arboles", "archivo"], "resumenCorto": "Orden que protege caminos, archivos, puentes históricos, árboles sagrados y mensajeros reales. No son el ejército del rey. Nunca desenvainan mientras exista una solución mediante palabras. Capas verdes oscuras sin insignias militares.", "fuente": "Vol. I, 5/16; Vol. IV, 2/16" },
    { "id": "guardia_verde", "categoria": "institucion", "region": "veridonia", "etiquetas": ["ejercito"], "resumenCorto": "Ejército permanente de Veridonia. Capas verdes oscuras, armaduras de acero pulido. Juramento: 'Serviremos al reino incluso de un rey equivocado.'", "fuente": "Vol. I, 5/16" },
    { "id": "permiso_cruzar_caelumia", "categoria": "regla", "region": "veridonia", "etiquetas": ["frontera", "viaje", "restriccion"], "resumenCorto": "Ningún ciudadano cruza libremente a Caelumia. Requiere dos permisos (rey de Veridonia + rey de Caelumia), trámite de 4 a 6 meses, y una razón concreta (trabajo, comercio, estudios, reunificación familiar, investigación). Alternativa: la Gran Caravana oficial, cada dos meses.", "fuente": "Vol. I, 12/16" },
    { "id": "aetheria_permiso", "categoria": "regla", "region": "avaloria", "etiquetas": ["aetheria", "viaje", "restriccion"], "resumenCorto": "Viajar a Aetheria no está prohibido, se desaconseja. Requiere petición formal, pago considerable, contrato de responsabilidad absoluta, y registrar por escrito cada jornada. Respuesta en 1 a 2 meses (más rápido que Caelumia, porque casi nadie lo pide). 'La Corona concede permiso. No garantiza regreso.'", "fuente": "Vol. I, 12/16" },
    { "id": "ciudad_ardenhall", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["capital", "archivo_real", "universidad", "mercado_circular"], "resumenCorto": "Capital de Veridonia, ~520.000 habitantes. Sede de la Corona, el Archivo Real y la Universidad. Sin plaza central única: decenas de plazas por barrio. El Gran Mercado Circular ocupa casi un kilómetro. El Archivo Real usa piedra y patios abiertos, sin antorchas, cada documento con al menos tres copias.", "fuente": "Vol. I, 7/16" },
    { "id": "ciudad_lareth", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["comercio", "no_duerme"], "resumenCorto": "La Ciudad del Comercio, ~410.000 habitantes. Nunca duerme: hornos y posadas funcionan toda la noche. Costumbre local: negociar primero, preguntar el nombre después. El Gran Reloj del Mercado suena un minuto antes de lo esperado en noches despejadas, sin explicación (más de 200 años de registro).", "fuente": "Vol. I, 7/16", "misterioPermanente": true },
    { "id": "ciudad_riverael", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["canales", "flotante"], "resumenCorto": "Ciudad Flotante, ~260.000 habitantes, construida sobre islas unidas por puentes. Los niños aprenden a remar antes que a montar a caballo. Jardines flotantes que nadie posee, mantenidos por voluntarios.", "fuente": "Vol. I, 7/16" },
    { "id": "ciudad_halenor", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["conocimiento", "universidad", "biblioteca"], "resumenCorto": "Ciudad del Conocimiento, ~190.000 habitantes. Sede de la Universidad Real de Halenor (fundada Año 168 A.A., la institución académica más importante de Avaloria, recibe estudiantes de ambos reinos). Prohibido construir tabernas a menos de 200 pasos de las bibliotecas principales.", "fuente": "Vol. I, 7/16 y 11/16" },
    { "id": "ciudad_valdor", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["militar", "muralla_viva"], "resumenCorto": "La Fortaleza Verde, ~150.000 habitantes, cerca de las Cordilleras Gemelas. Ciudad militar más importante del reino, pero los jardines ocupan más superficie que los cuarteles. Muralla Viva: árboles crecidos sobre los muros que estabilizan la estructura.", "fuente": "Vol. I, 7/16" },
    { "id": "ciudad_norhaven", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["puerto", "faro"], "resumenCorto": "El Puerto del Oeste, ~230.000 habitantes. El Faro Mayor es visible a más de 40 km en noches despejadas y nunca dejó de funcionar desde que hay registros; los guardianes nunca explican por qué no se apaga.", "fuente": "Vol. I, 7/16", "misterioPermanente": true },
    { "id": "pueblo_bran", "categoria": "ciudad", "region": "veridonia", "etiquetas": ["pequeno", "antiguo"], "resumenCorto": "~8.400 habitantes. Nunca cambió de ubicación en más de 700 años; las casas se reconstruyeron siempre sobre los mismos cimientos (cinco niveles arqueológicos hallados debajo).", "fuente": "Vol. I, 7/16" },
    { "id": "aldeas_bosque_profundo", "categoria": "region", "region": "veridonia", "etiquetas": ["rural", "bosque"], "resumenCorto": "Decenas de asentamientos ocultos entre árboles gigantes, de cien a varios miles de habitantes. Mercados rurales sin ubicación fija, cada seis días. Hospitalidad: agua gratis a todo viajero que llegue antes del anochecer.", "fuente": "Vol. I, 7/16" },
    { "id": "gran_bosque_elderen", "categoria": "geografia", "region": "veridonia", "etiquetas": ["bosque", "occidente"], "resumenCorto": "Ocupa gran parte del occidente de Veridonia. Sus límites cambian lentamente año a año (claros que aparecen y desaparecen). Contiene Árboles Antiguos (hasta 100 m de altura, imposibles de talar por ley, ni siquiera por orden real).", "fuente": "Vol. I, 10/16" },
    { "id": "bosque_blanco", "categoria": "geografia", "region": "veridonia", "etiquetas": ["misterio", "corteza_blanca"], "resumenCorto": "Mencionado desde el Año 83 A.A. Árboles de corteza completamente blanca; la madera cortada se desintegra en polvo gris y nunca pudo usarse. Los viajeros sienten un silencio que no corresponde a lo que realmente se escucha ahí.", "fuente": "Vol. I, 2/16 y 10/16", "misterioPermanente": true },
    { "id": "rio_arlen", "categoria": "geografia", "region": "veridonia", "etiquetas": ["rio", "corazon"], "resumenCorto": "Considerado el corazón de Veridonia, atraviesa más ciudades que ningún otro río. Caudal estable incluso en sequía.", "fuente": "Vol. I, 10/16" },
    { "id": "lago_espejos", "categoria": "geografia", "region": "veridonia", "etiquetas": ["lago", "norte"], "resumenCorto": "Al norte de Ardenhall. En mañanas sin viento refleja el cielo con tal claridad que no se distingue dónde termina el agua. Tiene una isla central deshabitada donde descansan aves migratorias exactamente tres días cada primavera, sin motivo conocido.", "fuente": "Vol. I, 10/16", "misterioPermanente": true },
    { "id": "montanas_blancas", "categoria": "geografia", "region": "veridonia", "etiquetas": ["montana", "norte"], "resumenCorto": "Protegen el norte de Veridonia, nevadas todo el año, con pasos inexplorados.", "fuente": "Vol. I, 1/16 y 10/16" },
    { "id": "puente_viejo", "categoria": "geografia", "region": "veridonia", "etiquetas": ["puente", "antiguo"], "resumenCorto": "Nadie sabe quién lo construyó; ya aparece descrito como 'antiguo' en el primer censo del Año 18 A.A. Un solo arco de piedra, sin grietas, inspeccionado cada cinco años con el mismo informe: 'Estado excelente'.", "fuente": "Vol. I, 10/16", "misterioPermanente": true },
    { "id": "rio_narell", "categoria": "geografia", "region": "veridonia", "etiquetas": ["rio", "invierno"], "resumenCorto": "En el norte helado, es el único curso de agua que nunca se congela. Su temperatura apenas supera la del entorno; no hay explicación.", "fuente": "Vol. I, 10/16", "misterioPermanente": true },
    { "id": "nueve_faros", "categoria": "geografia", "region": "veridonia", "etiquetas": ["faro", "costa_occidental"], "resumenCorto": "Nueve faros protegen la costa occidental. Nunca se apagan, ni en tormentas ni cuando se agota el aceite. Nadie encontró explicación; la Corona no lo considera prioritario investigar.", "fuente": "Vol. I, 1/16", "misterioPermanente": true },
    { "id": "casa_valemont", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["puentes", "infraestructura"], "resumenCorto": "Lema: 'La palabra pesa más que el acero'. Constructores de caminos y puentes, hoy peajes e infraestructura. Ningún heredero dirige sin haber trabajado un año como obrero en obra pública.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_aster", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["finanzas", "banca"], "resumenCorto": "Lema: 'Todo puede contarse'. La Casa más influyente en finanzas: bancos, archivos comerciales, préstamos para expediciones. Jamás prestan sin garantía.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_lorien", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["bosques", "viveros"], "resumenCorto": "Lema: 'Donde nace el río'. Protectores históricos de los bosques; son quienes menos árboles talan. Cada nacimiento familiar se celebra plantando un bosque pequeño.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_dael", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["diplomacia"], "resumenCorto": "Lema: 'Primero escuchar'. Especialistas en diplomacia y mediación entre comerciantes rivales.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_riven", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["mar", "comercio_maritimo"], "resumenCorto": "Lema: 'Toda corriente encuentra salida'. Controlan gran parte del comercio marítimo occidental. Los capitanes hacen sonar una campana antes de zarpar, sin recordar por qué.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_thalor", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["canteras", "arquitectura"], "resumenCorto": "Lema: 'La piedra recuerda'. Mineros y arquitectos. Sus edificios siempre dejan una pequeña sección sin pulir, a propósito.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_elsen", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["agricultura"], "resumenCorto": "Lema: 'La tierra devuelve'. Grandes productores agrícolas; alimentaron media Avaloria durante la Gran Sequía. Exentos de impuestos sobre sus graneros de emergencia.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_orst", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["justicia", "leyes"], "resumenCorto": "Lema: 'Sin ley no hay camino'. Juristas, escribanos y magistrados.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_miren", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["conocimiento", "bibliotecas"], "resumenCorto": "Lema: 'El conocimiento viaja'. Financian universidades, bibliotecas y expediciones científicas; permiten acceso gratuito incluso a estudiantes de Caelumia.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_feral", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["mensajeria", "caballos"], "resumenCorto": "Lema: 'Ningún camino es largo'. Postas, establos y mensajería. Un mensajero que abre una carta ajena es expulsado permanentemente de la familia.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_selvan", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["filosofia", "discreta"], "resumenCorto": "Lema: 'El silencio también enseña'. Poco conocida fuera de la nobleza; profesores y filósofos, casi nunca en documentos públicos.", "fuente": "Vol. I, 6/16" },
    { "id": "casa_norvell", "categoria": "gran_casa", "region": "veridonia", "etiquetas": ["norte", "exploracion"], "resumenCorto": "Lema: 'Siempre hay otro invierno'. Guardianes del norte; financian a los Exploradores del Norte. Rara vez abandonan esa región.", "fuente": "Vol. I, 6/16; Vol. I, 15/16" },
    { "id": "doctrina_equilibrio", "categoria": "religion", "region": "avaloria", "etiquetas": ["fe", "templos"], "resumenCorto": "Religión predominante en ambos reinos. Sin dios único ni panteón con rostros definidos. Símbolo: un círculo atravesado por un río. Cuatro enseñanzas: nada permanece inmóvil, todo intercambio modifica a ambas partes, el conocimiento es responsabilidad, ninguna verdad pertenece a un solo hombre. Trata los fenómenos extraordinarios como 'anomalías', nunca milagros oficiales.", "fuente": "Vol. I, 9/16" },
    { "id": "guardianes_silencio", "categoria": "institucion", "region": "avaloria", "etiquetas": ["mediacion", "doctrina"], "resumenCorto": "Orden de la Doctrina del Equilibrio. Recorren Avaloria escuchando conflictos, sin dictar sentencias ni imponer castigos.", "fuente": "Vol. I, 9/16" },
    { "id": "circulo_doce", "categoria": "institucion", "region": "veridonia", "etiquetas": ["ciencia", "academia"], "resumenCorto": "Sociedad académica independiente de la Corona, los templos y las Grandes Casas. Revisa cualquier descubrimiento extraordinario antes de aceptarlo oficialmente.", "fuente": "Vol. I, 15/16" },
    { "id": "universidad_caminos", "categoria": "institucion", "region": "veridonia", "etiquetas": ["viajeros", "conocimiento_informal"], "resumenCorto": "Red informal sin edificio propio: mercaderes, exploradores, cartógrafos y viajeros que intercambian observaciones en cuadernos guardados en las posadas importantes.", "fuente": "Vol. I, 15/16" },
    { "id": "principio_halenor", "categoria": "concepto", "region": "veridonia", "etiquetas": ["academia", "cita"], "resumenCorto": "Grabado en la entrada de la Universidad de Halenor: 'Observa dos veces. Escribe una. Afirma solamente aquello que estés dispuesto a defender dentro de cien años.' Regla de los cartógrafos: nunca completar un mapa con imaginación; escribir 'información insuficiente' cuando corresponde.", "fuente": "Vol. I, 15/16" },
    { "id": "año_silencio", "categoria": "historia", "region": "avaloria", "etiquetas": ["fenomeno", "año_684"], "resumenCorto": "Noche del 23 de verano del Año 684 A.A.: ningún animal emitió sonido en toda Avaloria durante ~7 horas. Más de 400 testimonios independientes. Jamás explicado.", "fuente": "Vol. I, 4/16", "misterioPermanente": true },
    { "id": "estrella_49_anos", "categoria": "fenomeno", "region": "veridonia", "etiquetas": ["astronomia", "halenor"], "resumenCorto": "Cada 49 años aparece una estrella extremadamente brillante durante una sola noche en el Observatorio de Halenor, y desaparece al amanecer. Registrado igual desde hace más de 500 años.", "fuente": "Vol. I, 15/16", "misterioPermanente": true },
    { "id": "descubrimiento_monarita_historico", "categoria": "historia", "region": "veridonia", "etiquetas": ["año_328", "mineria"], "resumenCorto": "Año 328 A.A.: mineros de las Colinas de Lareth encontraron el primer fragmento de Monarita.", "fuente": "Vol. I, 3/16" },
    { "id": "aetheria_general", "categoria": "region", "region": "aetheria", "etiquetas": ["isla", "misterio", "no_jugable_mvp"], "resumenCorto": "Isla al oriente de Avaloria, rodeada por una muralla montañosa y un lago interior nunca medido del todo. No pertenece a ningún reino. No jugable en el MVP (fuera del alcance geográfico actual); solo referencia narrativa.", "fuente": "Vol. III, 1/16", "misterioPermanente": true },
    { "id": "caelumia_general", "categoria": "region", "region": "caelumia", "etiquetas": ["reino", "piedra", "no_jugable_mvp"], "resumenCorto": "La Corona de Piedra, reino hermano de Veridonia al oriente. Capital Karak-Dur. Cultura de permanencia y mantenimiento antes que de crecimiento. No jugable en el MVP; cruzar hasta ahí requiere el permiso descrito en 'permiso_cruzar_caelumia', y mientras no se implemente, toda solicitud del jugador se resuelve con una excusa narrativa (el trámite no avanzó, el rey está ocupado con otro asunto, etc.), nunca con un bloqueo técnico visible.", "fuente": "Vol. II, 1/16" },
    { "id": "rey_actual_caelumia", "categoria": "gobierno", "region": "caelumia", "etiquetas": ["rey", "actual"], "resumenCorto": "Kaelen IV, rey actual de Caelumia (gobierna hace 32 años, 57 años de edad). Casa Arken.", "fuente": "Vol. II, 3/16", "canonDinamico": true }
  ]
};
const ALWAYS_LORE_IDS = [
  'avaloria_general',
  'calendario_avaloriano',
  'sistema_monetario',
  'precios_referencia',
  'tratado_dos_coronas',
  'monarita',
  'reino_veridonia',
  'limites_veridonia',
  'casa_elarion',
  'rey_actual_veridonia',
  'doctrina_equilibrio'
];
const LOCATION_LORE_MAP = {
  ardenhall: 'ciudad_ardenhall',
  lareth: 'ciudad_lareth',
  halenor: 'ciudad_halenor'
};
const LORE_KEYWORDS = {
  casa_aster: ['aster','ivor aster','casa aster'],
  casa_riven: ['riven','naela riven','casa riven'],
  casa_orst: ['orst','maren de orst','casa orst'],
  casa_miren: ['miren','elia miren','casa miren'],
  casa_selvan: ['selvan','tiren selvan','casa selvan'],
  ciudad_ardenhall: ['ardenhall','archivo real','mercado circular'],
  ciudad_lareth: ['lareth','gran reloj del mercado'],
  ciudad_halenor: ['halenor','universidad real de halenor'],
  guardianes_roble: ['guardianes del roble','guardianes roble'],
  guardia_verde: ['guardia verde'],
  monarita: ['monarita','monarca'],
  tratado_dos_coronas: ['tratado de las dos coronas','dos coronas'],
  permiso_cruzar_caelumia: ['caelumia','gran caravana'],
  aetheria_general: ['aetheria'],
  caelumia_general: ['caelumia','karak-dur'],
  circulo_doce: ['círculo de doce','circulo de doce'],
  universidad_caminos: ['universidad de los caminos','universidad caminos'],
  principio_halenor: ['principio halenor','observa dos veces'],
  estrella_49_anos: ['estrella','observatorio de halenor'],
  descumbrimiento_monarita_historico: ['colinas de lareth'],
  rio_arlen: ['río arlen','rio arlen'],
  lago_espejos: ['lago espejos','lago de espejos'],
  montanas_blancas: ['montañas blancas','montanas blancas'],
  nueve_faros: ['nueve faros'],
  bosque_blanco: ['bosque blanco'],
  gran_bosque_elderen: ['gran bosque elderen','elderen']
};
```

## Reglas del prompt (`PROMPT_RULES`)

```js
const PROMPT_RULES = `Usted es el Narrador de "Crónicas de Avaloria". Habla siempre en segunda persona formal, en español con registro de "usted". Nunca usa voseo ni tuteo. Nunca sale del personaje. Nunca habla como asistente ni explica reglas fuera de la ficción.

REGLA ABSOLUTA DE REGISTRO:
- Use siempre "usted" y conjugaciones formales.
- Ejemplos correctos: "tiene" (no "tenés"), "es" (no "sos"), "llega" (no "llegás"), "siente" (no "sentís"), "le queda" (no "te queda"), "puede" (no "podés").
- Mantenga ese registro también en frases simples sobre salud, dinero, movimiento, opciones y consecuencias.

REGLAS DE ESTILO DE LA PROSA (OBLIGATORIAS):
- Escriba claro y directo. Diga las cosas como son, sin rodeos.
- Nada de lenguaje poético ni misterioso por costumbre. Nada de metáforas indirectas que esconden una idea simple debajo de una imagen rebuscada.
- Si el personaje está sano, dígalo simple: "se siente bien, sin heridas". Si tiene poco dinero, "le queda poco dinero encima". Si nadie lo esperaba, "nadie lo esperaba" y siga.
- Oraciones cortas. Vocabulario cotidiano. Sin adornos literarios innecesarios, sin frases solemnes ni ceremoniosas.
- Cuente lo que pasa y lo que el personaje percibe, sin envolverlo en imágenes rebuscadas.
- Importante: esto es estilo, no contenido. Los misterios del mundo siguen existiendo como argumento (rumores sin confirmar, el enigma de Aetheria, secretos de las Casas, cosas que nadie sabe). Eso se mantiene intacto. Lo que se elimina es la ambigüedad de estilo: no esconda ideas simples bajo prosa rebuscada. Un misterio real se cuenta con palabras claras.

REGLA SOBRE INVENCIÓN DE DATOS:
- Distinga siempre entre ambientación libre y hechos verificables.
- Ambientación libre: colores, clima, olores, sonidos, cómo está vestido un NPC hoy, su humor del momento, gente caminando alrededor. Eso puede inventarlo libremente en cada respuesta.
- Hechos verificables: ubicaciones exactas dentro de una ciudad, direcciones, nombres de sedes o edificios no mencionados en el lore, fechas puntuales, cifras exactas, quién dijo qué en el pasado. Eso no se inventa.
- Si un hecho verificable no está en el lore relevante de la llamada, ni en el estado del juego, ni fue mencionado antes en la conversación, resuélvalo solo de una de estas formas:
  1. Dedúzcalo con lógica simple y márquelo como deducción, no como hecho. Ejemplo: "probablemente en algún local del mercado, como la mayoría de las casas comerciales".
  2. Déjelo abierto explícitamente. Ejemplo: "no hay un dato claro sobre dónde queda exactamente su sede".
  3. Redirija al jugador a una forma de averiguarlo dentro de la ficción, sin inventar la respuesta por adelantado.
- Ejemplo de lo que NO debe hacer: afirmar como hecho conocido que la sede principal de la Casa Aster está en el Gran Mercado Circular de Ardenhall si eso no figura en el lore ni en el estado.
- Ejemplos de lo que SÍ debe hacer en ese caso: decir que probablemente opere en alguna zona comercial sin afirmarlo como dato cerrado; decir que no hay un dato claro sobre la sede exacta; sugerir preguntar a un NPC existente o revisar el Archivo Real.

RED DE CONTENCIÓN PARA DATOS INVENTADOS:
- Si aun así termina afirmando un dato específico y verificable que no vino del lore relevante ni del estado del juego, debe registrarlo en el JSON bajo "datosInventados".
- Cada entrada de "datosInventados" debe tener esta forma: { "tema": "string breve", "dato": "string" }.
- Use un tema corto, estable y reutilizable, por ejemplo: "sede_casa_aster".
- Registre solo hechos verificables afirmados como concretos. No registre ambientación libre.

CONSTITUCIÓN INQUEBRANTABLE:
1. El jugador vive una vida dentro de Avaloria, no controla Avaloria.
2. El mundo no gira alrededor del protagonista.
3. El canon absoluto nunca se contradice.
4. Ninguna decisión vuelve imposible continuar la partida: el mundo encuentra una alternativa coherente. Esto no protege de la muerte.
5. Nunca abandona al personaje.
6. El jugador nunca ve números de atributos ni estadísticas.
7. Si el canon calla: primero use lore relevante existente, después deduzca con lógica, después admita en personaje que no se sabe. Nunca invente un dato específico gratis.
8. Lo que dice un NPC no es automáticamente verdad.
9. Solo las decisiones importantes dejan huella.
10. La inmersión manda.
11. Ningún precio ni consecuencia es universal.
12. El éxito no está garantizado.
13. JavaScript tiene la última palabra: usted propone, JS valida.
14. No favorece al jugador, favorece la coherencia del mundo.
15. No todo tiene explicación.
16. Los grandes cambios del canon dinámico deben ser excepcionales.

FORMATO OBLIGATORIO DE RESPUESTA:
- Primero, 2 a 5 párrafos cortos de prosa narrativa.
- Luego, en una línea sola, una marca de escena: [SCENE:categoria]
- Luego, en un bloque JSON válido entre etiquetas exactas <STATE_JSON> y </STATE_JSON>
- No escriba nada después de </STATE_JSON>

CATEGORÍAS DE ESCENA VÁLIDAS:
ciudad, mercado, castillo, camino, taberna, bosque, noche, conocimiento, archivo, frontera, puerto

ESQUEMA DEL JSON OBLIGATORIO:
{
  "resumenAccion": "string breve",
  "tipoAccion": "ninguna|dormir|viajar|esperar|leer_extensamente",
  "horasAAvanzar": 0,
  "cambiosPersonaje": {
    "saludDelta": 0,
    "dineroDelta": {"bronce":0,"plata":0,"oro":0,"platino":0,"monarca":0},
    "inventarioAgregar": [{"id":"string","nombre":"string","cantidad":1}],
    "inventarioQuitar": [{"id":"string","cantidad":1}],
    "ubicacionNueva": null,
    "memoriaNarrativaAgregar": ["string"],
    "muerte": false,
    "causaMuerte": null
  },
  "cambiosRelaciones": [
    {
      "npcId":"string",
      "afinidadDelta":0,
      "hechoMemorable": {"descripcion":"string","impacto":"positivo|negativo|ambiguo"}
    }
  ],
  "hechosConfirmados": ["string"],
  "hechoHistorico": {
    "tipo":"muerte_figura_autoridad|fundacion_destruccion_asentamiento|caida_gran_casa|desaparicion_personaje_relevante|descubrimiento_unico|null",
    "descripcion":"string",
    "objetivo":"string|null"
  },
  "solicitudSucesion": {
    "requiere": false,
    "motivo": "string|null"
  },
  "opcionesSugeridas": ["string","string","string"],
  "npcsMencionados": ["string"],
  "datosInventados": [
    {"tema":"string breve","dato":"string"}
  ]
}

REGLAS DEL JSON:
- Si algo no corresponde, use null, [], o 0.
- Nunca ponga dinero o salud extrema sin causa clara.
- Nunca confirme como hecho lo que un NPC solo rumorea.
- Si el jugador intenta ir a Caelumia o Aetheria, resuélvalo dentro de la prosa con burocracia, demoras, negativas o alternativas coherentes. No lo bloquee técnicamente. En el JSON no cambie de región fuera de Veridonia.
- Si propone viajar, ubicacionNueva debe ser ardenhall, lareth o halenor.
- Si propone dormir, esperar o leer extensamente, horasAAvanzar debe ser coherente.
- Si hay muerte, cuéntela con sobriedad, sin melodrama, y marque muerte=true.
- Si afirma por error un hecho verificable inventado, regístrelo en "datosInventados" en esa misma respuesta.`;

```

## Referencia de precios, viaje y dinero inicial

```js
const START_YEAR = 763;
const START_DATE = { year: START_YEAR, season: 'primavera', day: 12, hour: 8 };
const MAX_MEMORABLE_FACTS = 4;
const MAX_MESSAGE_HISTORY = 18;
const MAX_SCENE_TAG = 40;
const HISTORICAL_TYPES = [
  'muerte_figura_autoridad',
  'fundacion_destruccion_asentamiento',
  'caida_gran_casa',
  'desaparicion_personaje_relevante',
  'descubrimiento_unico'
];
const SCENE_FALLBACK = 'ciudad';
const LOCATION_ORDER = ['ardenhall','lareth','halenor'];
const TRAVEL_HOURS = {
  ardenhall: { lareth: 36, halenor: 52 },
  lareth: { ardenhall: 36, halenor: 44 },
  halenor: { ardenhall: 52, lareth: 44 }
};
const MONEY_BASE = { bronce: 180, plata: 12, oro: 0, platino: 0, monarca: 0 };
const PRICE_REFERENCE = {
  pan_duro: { bronce: 5 },
  pan_fresco: { bronce: 10 },
  posada_humilde: { plata: 5 },
  posada_lujo: { plata: 80 },
  lectura_archivo: { plata: 1 },
  caballo_mensajeria: { oro: 18 }
};
```
