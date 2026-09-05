/**
 * Carga datos de ejemplo para poder ver la página de reportes funcionando
 * de inmediato. Correr con: npm run seed
 *
 * Nota: desde que lib/db.ts usa Postgres (antes usaba node:sqlite), todas
 * las funciones de la capa de datos son async -- por eso este script ahora
 * vive dentro de una función async y cada llamada lleva `await`. También
 * cierra el pool de conexiones al final (`pool.end()`) para que el proceso
 * de `tsx` termine solo en vez de quedarse colgado esperando conexiones
 * abiertas.
 */
import pool, {
  upsertDailyReport,
  createStrategy,
  createImprovement,
  updateImprovementStatus,
  createLead,
  createRefugio,
  createGato,
  createProducto,
} from "../lib/db";

function isoDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // ---------- Refugio de ejemplo (sistema multi-refugio) ----------
  // Credenciales de demo -- entra a /refugio con usuario "patitas-felices" y
  // password "demo1234" para ver el panel del refugio ya con datos.
  const refugioDemo = await createRefugio({
    nombre: "Refugio Patitas Felices",
    usuario: "patitas-felices",
    password: "demo1234",
    responsableNombre: "Tessie Sit",
    responsableTelefono: "55 0000 0000",
    responsableEmail: "contacto@patitasfelices.example",
    ciudad: "Ciudad de México",
    notas: "Refugio de ejemplo cargado por el seed.",
  });

  const gatoBlackie = await createGato({
    refugioId: refugioDemo.id,
    nombre: "Blackie",
    sexo: "Macho",
    edadAprox: "1 año aprox.",
    descripcion: "Juguetón, cariñoso, ya vacunado y esterilizado.",
    estado: "DISPONIBLE",
  });
  await createGato({
    refugioId: refugioDemo.id,
    nombre: "Nube",
    sexo: "Hembra",
    edadAprox: "6 meses aprox.",
    descripcion: "Tímida al principio, muy cariñosa una vez que agarra confianza.",
    estado: "DISPONIBLE",
  });

  const dailyData = [
    { d: 9, f: 2, x: 1, r: 0, w: 1, ig: 0, s: "Primer día del monitor de búsqueda web. Se probaron 6 palabras clave por ciudad." },
    { d: 8, f: 1, x: 0, r: 1, w: 2, ig: 0, s: "Reddit dio un candidato real en r/mexico. Búsqueda web sigue siendo la fuente más consistente." },
    { d: 7, f: 3, x: 2, r: 0, w: 1, ig: 0, s: "Buen día para el formulario -- coincide con que se publicaron 2 gatos nuevos en el sitio." },
    { d: 6, f: 0, x: 0, r: 0, w: 1, ig: 0, s: "Día flojo en general. Se revisó por qué: coincidió con fin de semana largo." },
    { d: 5, f: 2, x: 1, r: 1, w: 0, ig: 0, s: "Se probó horario distinto para la búsqueda en X (medio día en vez de mañana)." },
    { d: 4, f: 4, x: 0, r: 0, w: 2, ig: 3, s: "Primer día del anuncio de Instagram activo -- salto notable en candidatos." },
    { d: 3, f: 2, x: 1, r: 0, w: 1, ig: 5, s: "El anuncio de Instagram sigue siendo la fuente principal del día." },
    { d: 2, f: 3, x: 0, r: 2, w: 1, ig: 4, s: "Se ajustó el eslogan del anuncio; parece sostener el ritmo de candidatos." },
    { d: 1, f: 2, x: 1, r: 0, w: 0, ig: 6, s: "Mejor día del mes en candidatos totales." },
    { d: 0, f: 1, x: 0, r: 1, w: 1, ig: 3, s: "Día en curso." },
  ];

  for (const row of dailyData) {
    await upsertDailyReport({
      date: isoDate(row.d),
      candidatesFormulario: row.f,
      candidatesX: row.x,
      candidatesReddit: row.r,
      candidatesWeb: row.w,
      candidatesInstagram: row.ig,
      summary: row.s,
    });
  }

  await createStrategy({
    title: "Publicar en grupos locales de Facebook",
    description: "Compartir manualmente cada gato nuevo en 3 grupos de mascotas de la zona.",
    channel: "Facebook (manual)",
    status: "ACTIVA",
  });
  await createStrategy({
    title: "Probar horario de publicación en X",
    description: "Comparar candidatos generados publicando a medio día vs. en la mañana.",
    channel: "X",
    status: "EN_PRUEBA",
  });
  await createStrategy({
    title: "Anuncio pagado en Instagram con presupuesto bajo",
    description: "Correr el anuncio 'Adopta un gatito' con $50 MXN/día por una semana y medir costo por candidato.",
    channel: "Instagram",
    status: "ACTIVA",
  });
  await createStrategy({
    title: "Alianza con veterinarias locales",
    description: "Dejar flyers impresos en 5 veterinarias de la zona con QR al catálogo.",
    channel: "Boca en boca",
    status: "IDEA",
  });
  await createStrategy({
    title: "Publicar reseñas de adopciones exitosas",
    description: "Testimonios cortos de familias que ya adoptaron, para generar confianza.",
    channel: "Instagram",
    status: "IDEA",
  });

  await createImprovement({
    title: "Acortar el formulario filtro a 5 preguntas",
    description: "El formulario actual tiene 8 campos; probar si menos fricción sube la tasa de envío.",
    area: "Formulario filtro",
    status: "PROPUESTA",
  });
  await createImprovement({
    title: "Avisar por Telegram en tiempo real",
    description: "Conectar el bot de Telegram para que cada Lead nuevo llegue al chat del equipo al instante.",
    area: "Notificaciones",
    status: "EN_PROGRESO",
  });
  const flyerImprovement = await createImprovement({
    title: "Autogenerar el flyer al publicar un gato",
    description: "Disparar el generador de flyer automáticamente al guardar un gato nuevo en el panel.",
    area: "Generador de flyer",
    status: "IMPLEMENTADA",
  });
  await updateImprovementStatus(
    flyerImprovement.id,
    "IMPLEMENTADA",
    "Cero flyers hechos a mano desde que se activó -- ahorra ~15 min por gato."
  );

  await createImprovement({
    title: "Descartar leads duplicados automáticamente",
    description: "Si el mismo teléfono o correo ya existe, marcar el lead como duplicado en vez de crear uno nuevo.",
    area: "Captación",
    status: "PROPUESTA",
  });

  // ---------- Bitácora propia del refugio de ejemplo ----------
  await upsertDailyReport({
    date: isoDate(1),
    refugioId: refugioDemo.id,
    candidatesFormulario: 1,
    summary: "Reporte propio del refugio: una familia vino a conocer a Nube en persona.",
    nextSteps: "Dar seguimiento por teléfono en 2 días.",
  });
  await createImprovement({
    refugioId: refugioDemo.id,
    title: "Tomar mejores fotos con luz natural",
    description: "Las fotos actuales de los gatos se ven oscuras -- probar tomarlas cerca de la ventana.",
    area: "Fotos",
    status: "PROPUESTA",
  });

  await createLead({
    source: "ANUNCIO_INSTAGRAM",
    refugioId: refugioDemo.id,
    gatoDeInteresId: gatoBlackie.id,
    nombre: "Marisol H.",
    telefono: "55 1234 5678",
    ciudad: "Ciudad de México",
    tipoVivienda: "departamento",
    viviendaEnRenta: true,
    permiteMascotasRenta: true,
    tieneOtrasMascotas: false,
    experienciaPrevia: true,
    todaLaFamiliaDeAcuerdo: true,
    comentario: "Vio el anuncio de Instagram, le encantó Blackie.",
  });
  await createLead({
    source: "FORMULARIO_SITIO",
    nombre: "Daniel R.",
    email: "daniel@example.com",
    ciudad: "Guadalajara",
    tipoVivienda: "casa",
    viviendaEnRenta: false,
    tieneOtrasMascotas: true,
    otrasMascotasDetalle: "Un perro adulto, tranquilo",
    experienciaPrevia: false,
    todaLaFamiliaDeAcuerdo: true,
  });
  await createLead({
    source: "MONITOR_BUSQUEDA_WEB",
    nombre: "Paola G.",
    ciudad: "Monterrey",
    comentario: "Publicó en un foro local buscando adoptar un gato negro.",
  });

  // ---------- Tienda de ejemplo ----------
  await createProducto({
    nombre: "Croquetas 1kg (adulto)",
    descripcion: "Alimento seco balanceado, sabor pollo.",
    precioNormalCentavos: 18000,
    precioAdoptanteCentavos: 15000,
    stock: 20,
  });
  await createProducto({
    nombre: "Arena aglomerante 4kg",
    descripcion: "Baja generación de polvo, control de olores.",
    precioNormalCentavos: 12000,
    precioAdoptanteCentavos: 9500,
    stock: 15,
  });
  await createProducto({
    nombre: "Juguete varita con plumas",
    precioNormalCentavos: 6500,
    precioAdoptanteCentavos: 4500,
    stock: 30,
  });

  console.log("Listo: datos de ejemplo cargados en la base de datos Postgres (DATABASE_URL).");
  console.log("");
  console.log("Login de refugio de ejemplo -> http://localhost:3000/refugio");
  console.log("  usuario:  patitas-felices");
  console.log("  password: demo1234");
  console.log("");
  console.log("Login de equipo -> http://localhost:3000/reportes");
  console.log("  password: la que hayas puesto en EQUIPO_PASSWORD (.env.local)");
}

main()
  .catch((err) => {
    console.error("SEED_FAILED", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
