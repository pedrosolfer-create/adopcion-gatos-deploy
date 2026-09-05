# Sistema de adopción de gatos — arranque del proyecto

Este es el arranque real del sistema descrito en el documento de arquitectura
(`arquitectura-sistema-adopcion-gatos.pdf`, entregado antes en la
conversación). No es un mockup: es una app Next.js que corre, con base de
datos real y formularios funcionales -- y es instalable como PWA (ver más
abajo), así que además de abrirse en el navegador se puede instalar como
app en el celular.

## Qué hay construido

- **`/reportes`** (equipo, protegido con password) — la bitácora diaria de
  la búsqueda de adoptantes de **todos los refugios**: KPIs, gráfica de
  candidatos por día, desglose por fuente, historial de reportes diarios,
  tablero de estrategias de captación, y el backlog de **mejoras
  continuas** del sistema mismo (con estado e impacto medible). Todo con
  formularios reales que escriben a la base de datos.
- **`/refugio`** (multi-refugio, cada uno con su propio login) — el panel
  de un refugio específico: sus datos y los de su responsable, sus gatos
  (dar de alta uno nuevo), y su propia área de valoración/reportes -- todo
  filtrado para que un refugio nunca vea los datos de otro.
- **`/adopta`** — la landing pública de adopción: mismo eslogan y foto que el
  anuncio de Instagram, y el formulario filtro con las preguntas de
  evaluación inicial (vivienda, otras mascotas, experiencia previa, acuerdo
  familiar). Al enviarlo, crea un `Lead` real en la base de datos y termina
  en `/adopta/gracias`. Al final de la página está la sección "Adopta y
  dona", ahora con montos sugeridos y su impacto (ver más abajo).
- **`marketing/instagram-ad/`** — el generador del anuncio de Instagram
  (`output/anuncio-instagram.png`, formato 1080×1350). Mismo enfoque que el
  generador de flyers de antes: plantilla HTML/CSS + Playwright, nada de
  diseño manual.
- **`flyer-generator/`** (de la conversación anterior) sigue siendo el
  generador de fichas por gato -- no se movió, pero conceptualmente es parte
  de este mismo proyecto. Ahora usa el nuevo estilo "rescate" (ver abajo).
- **`/tienda`** -- catálogo público de comida, arena y accesorios para gato,
  con precio especial para quien ya adoptó. Carrito, checkout y pedido real
  guardado en base de datos (ver "Tienda" más abajo -- el pago en línea
  todavía no está conectado a un banco real, eso es la siguiente fase).

## Es una PWA (Progressive Web App) instalable

Todo el sistema es instalable como app -- en Android desde Chrome aparece el
banner "Instalar app" solo; en iPhone se instala manualmente desde Safari
(compartir → "Agregar a pantalla de inicio"). Una vez instalada abre a
pantalla completa, sin la barra del navegador, con su propio ícono (la
huella de gato en dorado que ves en las capturas).

Qué se agregó para que esto funcione:

- **`public/manifest.webmanifest`** -- nombre, ícono, color de marca, y
  accesos directos (shortcuts) a Adopta/Tienda/Refugio/Equipo para quien
  mantenga presionado el ícono ya instalado.
- **`public/icons/`** -- los íconos (192px, 512px, versión "maskable" para
  Android, apple-touch-icon para iOS). No los dibujé a mano: los genera
  `scripts/gen-icons.js` a partir de una huella de gato en SVG, así que si
  cambias el color de marca puedes regenerarlos con
  `node scripts/gen-icons.js` en vez de editar PNGs directamente.
- **`public/sw.js`** -- el Service Worker, registrado por
  `components/RegisterSW.tsx`. A propósito es conservador: solo cachea
  archivos estáticos (CSS/JS/íconos) y una página `/offline.html` de
  respaldo. **Nunca** intercepta formularios ni Server Actions (todo lo que
  es POST pasa derecho a la red) -- este sistema tiene sesiones y datos que
  cambian todo el tiempo (pedidos, leads, reportes), así que cachear
  páginas completas de forma agresiva podría mostrarle a alguien un panel
  desactualizado o de otro refugio. Verifiqué con Playwright que el
  manifest carga (200), los tres íconos cargan (200) y el Service Worker
  queda "activated" sin errores de consola.

## Ver un link real y compartible HOY (usando tu propia compu, temporal)

Esto **no** es hosting definitivo -- es para que hoy mismo tengas un link
`https://` de verdad que abrir en tu celular (e instalar como PWA) o mandarle
a alguien más, corriendo desde tu propia computadora. El link deja de
funcionar en cuanto cierras la terminal o apagas la compu -- para algo
permanente hace falta hosting real (ver la sección de arriba y la
comparación de pasarelas/hosting más abajo).

Necesitas Node.js 22 o más nuevo instalado (`node --version` para
comprobarlo; si no lo tienes, instálalo desde nodejs.org).

**1. Preparar el proyecto** (una sola vez):

```bash
cd proyecto-adopcion-gatos    # la carpeta que descomprimiste del zip
npm install
cp .env.example .env.local    # ábrelo y pon tu propio EQUIPO_PASSWORD y SESSION_SECRET
npm run seed                  # carga datos de ejemplo e imprime las credenciales
npm run build
npm run start                 # deja esta terminal abierta -- corre en el puerto 3000
```

**2. En OTRA ventana de terminal, sin cerrar la de arriba**, instala
`cloudflared` (túnel gratis de Cloudflare, no pide cuenta para esto):

- Mac: `brew install cloudflared`
- Windows: descárgalo desde
  [la página oficial de descargas](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)
  (ejecutable o instalador .msi)

Y corre:

```bash
cloudflared tunnel --url http://localhost:3000
```

Te va a imprimir una URL parecida a `https://algo-al-azar.trycloudflare.com`
-- ese es tu link real. Ábrelo en el celular e instálalo como app (Chrome en
Android lo ofrece solo; en iPhone es Safari → compartir → "Agregar a
pantalla de inicio"), o mándaselo a quien quieras que lo vea.

Cosas que debes saber antes de compartirlo:

- La URL cambia cada vez que vuelves a correr `cloudflared` -- no es un link
  fijo. Para uno permanente, el siguiente paso real es el hosting pagado (o
  la migración a base de datos gratis) que ya platicamos.
- Solo funciona mientras tu compu esté prendida, conectada a internet, y las
  dos terminales sigan abiertas.
- Es una URL pública, aunque al azar -- cualquiera que la adivine (muy poco
  probable) podría abrirla mientras esté activa. No es sensible en sí (es
  una demo), pero no la publiques en redes por las dudas.
- Los datos que captures (leads, pedidos, gatos) quedan guardados de verdad
  en la base de datos Postgres que hayas configurado en `DATABASE_URL` (ver
  sección "Base de datos" más abajo) -- no en un archivo local, así que no
  se pierden al cerrar el túnel ni al reiniciar tu compu.

## Diseño "estilo rescate" (lo más nuevo)

A partir de los 3 flyers de referencia que compartiste (Benito, Enzo, Kori)
armé un sistema de diseño reutilizable -- no copié esas imágenes, extraje el
lenguaje visual (listón rasgado con borde en zigzag, corazón dibujado a
mano, nombre en letra script, franja de WhatsApp negra, badge de edad con
borde punteado) y lo convertí en componentes de React + una hoja de estilos
aislada (`.rescue-theme` en `app/globals.css`, con una variante `--green`
para diferenciar visualmente la tienda de la adopción).

**Dónde se aplicó y dónde no**, exactamente como me pediste:

- Sí: `/adopta` (landing pública), `/tienda`, el generador de flyers
  (`flyer-generator/`) y el anuncio de Instagram (`marketing/instagram-ad/`)
  -- es decir, todo lo que ve el público.
- No: `/reportes` y `/refugio` siguen con el estilo original, plano y
  utilitario -- son paneles de trabajo, no material de marca, y así lo
  decidiste explícitamente.

Los componentes reutilizables viven en `components/rescue/` (`Doodles.tsx`,
`RibbonBanner.tsx`, `InfoBadge.tsx`, `ChecklistRow.tsx`, `WhatsAppBar.tsx`) --
si agregas una página pública nueva, se puede vestir con el mismo estilo
importando de ahí en vez de reinventar CSS.

## Tienda (lo más nuevo)

Catálogo único para todo el sistema -- no es por refugio, es uno solo
compartido (así lo decidiste: más simple de administrar y no fragmenta el
inventario entre refugios pequeños).

- **Alta y gestión de productos**: desde `/reportes` (equipo), sección
  "Tienda" -- nombre, descripción, precio normal, precio de adoptante, stock,
  activo/oculto.
- **Precio de adoptante**: en el carrito hay una casilla "Ya adopté con
  ustedes" que activa el precio especial. **Es una declaración del
  comprador, no está verificada contra los registros reales de adopción**
  -- documento esto explícitamente porque es una limitación real, no un
  detalle menor: alguien podría marcarla sin haber adoptado. Verificarlo de
  verdad requeriría cruzar el pedido con la tabla de adopciones confirmadas
  (por teléfono o correo) antes de aprobar el pedido -- queda como mejora
  pendiente si te importa cerrar ese hueco.
- **Seguridad de precios**: el carrito nunca envía precios al servidor, solo
  IDs de producto y cantidades -- `createPedido()` en `lib/db.ts` vuelve a
  buscar el precio real de cada producto en la base de datos antes de
  calcular el total. Así, aunque alguien manipule el HTML/JS del navegador
  para intentar mandar un precio falso, el servidor lo ignora por completo.
- **Estado actual del pago**: el pedido se guarda con status "Pendiente de
  pago" y en `/tienda/gracias` se le avisa al comprador que el equipo lo va
  a contactar para coordinar el pago -- exactamente el mismo patrón honesto
  que ya usa la sección de donativos (nada de checkout falso). Ver la
  comparación de pasarelas más abajo para conectar pago real en línea.

## Multi-refugio, logins y donativos (lo más nuevo)

**Dos tipos de acceso, dos propósitos distintos:**

- **Equipo** (`/reportes`) -- una sola password compartida (variable
  `EQUIPO_PASSWORD` en `.env.local`) para tu equipo central, que ve todo:
  todos los refugios, todos los reportes, todas las alarmas. No hay cuentas
  individuales todavía -- si más adelante hace falta saber *quién* del
  equipo hizo qué, hay que agregar cuentas por persona (queda como mejora
  pendiente).
- **Refugio** (`/refugio`) -- cada refugio tiene su propio usuario y
  password (se da de alta con `createRefugio(...)` en `lib/db.ts` -- por
  ahora a mano o por el seed; falta una pantalla para que el equipo dé de
  alta refugios nuevos desde la interfaz, ver "Cómo sigue esto"). Un
  refugio solo ve y edita lo suyo: sus gatos, su bitácora, sus KPIs.

Ambos logins usan password hasheado (nunca texto plano) y una cookie de
sesión firmada con `SESSION_SECRET` -- define esa variable en producción o
el sistema usa un secreto de desarrollo inseguro (y lo advierte en consola).

**Credenciales de la demo** (las carga `npm run seed`):

- Refugio: usuario `patitas-felices`, password `demo1234` -- ya tiene 2
  gatos de ejemplo (Blackie y Nube) y un reporte propio.
- Equipo: la password que pongas tú en `EQUIPO_PASSWORD`.

**Límite importante que debes conocer**: el formulario público de
`/adopta` todavía NO le pregunta al adoptante qué gato le interesa de qué
refugio (ese catálogo público con fotos, que también pediste, aún no está
construido -- ver "Cómo sigue esto"). Por ahora, todo `Lead` que llega por
`/adopta` se guarda sin refugio asignado, y solo lo ve el equipo en
`/reportes`, no un refugio específico en `/refugio`. En cuanto exista el
catálogo público, cada lead se podrá asociar automáticamente al refugio
dueño del gato que eligió el adoptante. Lo digo explícito para que no
asumas que ya está conectado -- no lo está.

**Donativos**: apliqué lo que encontré investigado sobre páginas de
donativos (fuente citada abajo) -- montos sugeridos de bajo a alto, cada
uno con su impacto concreto ("$100 = comida una semana", etc.), más la
opción de donar cualquier cantidad. Lo que **no** cambié es el mecanismo de
pago: sigue siendo un `mailto:` de ejemplo. Me dijiste que sería depósito a
una cuenta a nombre de Tessie Sit -- para publicar eso en la página
necesito el banco y la CLABE (18 dígitos) reales; en cuanto me los pases,
reemplazo el bloque de `mailto:` en `app/adopta/page.tsx` por esos datos.
Ojo con una cosa que no pude confirmar con certeza: no todos los bancos en
México permiten depósito en efectivo en OXXO para cualquier CLABE -- esto
varía por banco, así que vale la pena confirmar directamente con el banco
de esa cuenta si aplica, antes de anunciar "puedes pagar en OXXO" en la
página (*nivel de confianza: 0.5* en este punto específico -- lo demás de
la sección de donativos sí lo verifiqué).

Fuente sobre montos sugeridos: [Virtuous -- Suggested Donation Amount: 9 Best Guidelines](https://virtuous.org/blog/ask-amounts/)
(hallazgo citado: montos personalizados con impacto suben el tamaño del
donativo ~29% vs. ~4.5% de un monto genérico, y ordenarlos de menor a mayor
convierte 17% más que de mayor a menor).

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # pon tu DATABASE_URL, EQUIPO_PASSWORD y SESSION_SECRET
npm run seed      # carga datos de ejemplo (refugio demo, gatos, bitácora, estrategias, mejoras, leads)
npm run dev        # http://localhost:3000
```

Necesitas una base de datos Postgres antes de correr `npm run seed` o
`npm run dev` -- ver la sección "Base de datos" más abajo para cómo conseguir
una gratis (Neon) o correr una local. Sin `DATABASE_URL` en `.env.local`,
todas las páginas que leen/escriben datos van a fallar al conectar.

`npm run seed` imprime al final las credenciales de la demo (usuario/password
del refugio de ejemplo). Sin `EQUIPO_PASSWORD` en `.env.local`, el login de
`/reportes` va a rechazar cualquier intento -- es intencional, no un bug.

Para que un refugio pueda subir foto al dar de alta un gato (desde el
panel en `/refugio`) hace falta también `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en `.env.local` (gratis, sin
tarjeta -- ver el comentario en `.env.example` para cómo conseguirlos). Sin
esas tres variables, dar de alta un gato SIN foto sigue funcionando normal;
solo falla si se intenta subir una foto, y falla de forma controlada
(mensaje claro en el panel, el gato no se guarda a medias).

Hay un script de verificación automatizada (`scripts/verify.js`, con
Playwright) que prueba los dos logins, que un refugio no vea lo de otro, que
se pueda dar de alta un gato, y que el formulario público siga funcionando
de punta a punta. Córrelo con el servidor de `npm run dev` ya levantado:
`node scripts/verify.js`.

Para generar el anuncio de Instagram de nuevo (por ejemplo, tras cambiar el
eslogan o la foto):

```bash
cd marketing/instagram-ad
npm install
node render.js
```

El generador de flyers por gato (`flyer-generator/`, estilo rescate) vive
fuera de esta carpeta como proyecto aparte -- se entrega por separado. Se
corre igual: `npm install && node render.js` dentro de esa carpeta.

Hay un segundo script de verificación para la tienda
(`scripts/verify-tienda.js`) que prueba agregar productos al carrito, subir
la cantidad, hacer checkout, y que el pedido real llegue a `/tienda/gracias`
con el total correcto. Igual que el otro, requiere `npm run dev` corriendo:
`node scripts/verify-tienda.js`.

## Despliegue a producción: Neon + Render + tu dominio (gratis)

Esta es la ruta sin costo que se siguió para publicar el sistema en
`adopta.ceroluzcerogas.com`, verificada contra la documentación oficial de
cada proveedor (no adivinada):

1. **Base de datos -- Neon** (Postgres gratis, sin tarjeta, plan permanente):
   crea una cuenta en [neon.tech](https://neon.tech), crea un proyecto, y
   copia el connection string que te dan (ya trae `?sslmode=require`). Eso
   es tu `DATABASE_URL`.
2. **Repositorio -- GitHub**: sube este proyecto a un repositorio (privado
   o público) en GitHub. Render despliega leyendo un repo de Git, no acepta
   subir un .zip directo.
3. **Servidor -- Render** (plan gratis, Hobby): crea una cuenta en
   [render.com](https://render.com), "New Web Service", conecta el
   repositorio de GitHub. Build command: `npm install && npm run build`.
   Start command: `npm run start`. Agrega las variables de entorno
   (`DATABASE_URL`, `EQUIPO_PASSWORD`, `SESSION_SECRET`, las de Cloudinary
   si quieres que los refugios puedan subir fotos, y los píxeles si los
   usas) en la sección "Environment" del servicio.
4. **Primer despliegue**: espera a que termine el build y prueba la URL
   temporal que te da Render (`algo.onrender.com`) antes de conectar el
   dominio real. Corre `npm run seed` una vez (Render tiene una consola/Shell
   para el servicio) si quieres los datos de ejemplo, o da de alta tus
   refugios/gatos/productos reales a mano.
5. **Dominio propio**: en el dashboard de Render, agrega
   `adopta.ceroluzcerogas.com` como "Custom Domain" (el plan gratis incluye
   hasta 2). Render te da un hostname tipo `algo.onrender.com` para usar
   como destino del CNAME.
6. **DNS en DreamHost**: en el panel de DreamHost, DNS Settings de
   `ceroluzcerogas.com` → "Add Record" → CNAME → Host: `adopta`, Points to:
   el hostname que te dio Render. El resto del dominio (tu WordPress
   existente, etc.) no se toca.
7. **Espera la propagación y el certificado SSL**: Render emite el
   certificado automáticamente en cuanto detecta el CNAME apuntando
   correctamente -- puede tardar desde minutos hasta un par de horas.

**Limitaciones reales de esta ruta gratuita, para que las conozcas de
antemano:**

- Render "duerme" el servicio gratis tras 15 minutos sin visitas -- el
  primer visitante después de eso espera ~1 minuto mientras despierta. No es
  un error, es el comportamiento documentado del plan gratis.
- Neon gratis da 0.5 GB de almacenamiento y 100 horas de cómputo al mes por
  proyecto -- de sobra para el tamaño actual de este sistema, pero si crece
  mucho (miles de leads/pedidos) hay que revisar si sigue alcanzando.
- El plan gratis de Render no ofrece disco persistente -- por eso la
  migración a Postgres (ver sección de "Base de datos" arriba) no era
  opcional para esta ruta.

## Decisiones técnicas que vale la pena que conozcas

**Base de datos: Postgres (vía `pg`), ya migrado desde `node:sqlite`.** Las
primeras rondas de este proyecto usaron `node:sqlite` (el módulo nativo de
Node, sin dependencias) porque en ese momento no había forma de resolver el
hosting en producción -- SQLite guarda todo en un archivo local, lo cual
funciona bien en tu compu pero se pierde en cualquier hosting que no ofrezca
disco persistente (como el plan gratis de Render, que es el que se usa para
desplegar este proyecto). Por eso `lib/db.ts` se reescribió para usar
Postgres real (pensado para un plan gratuito como Neon o Supabase) a través
de la librería `pg` -- cada consulta ahora es asíncrona (`async`/`await`),
a diferencia de `node:sqlite` que era síncrono, así que si tocas `lib/db.ts`
o cualquier página que lo use, recuerda mantener los `await`.

Sigue siendo cierto lo que decía esta sección antes: toda la lógica de datos
vive en un solo archivo (`lib/db.ts`) con funciones tipadas -- el resto de
la app (páginas, acciones) nunca escribe SQL directo, solo llama a esas
funciones. Los nombres de columnas se mantuvieron en camelCase exactamente
como en la versión SQLite (van entre comillas dobles en el SQL para que
Postgres no los convierta a minúsculas), así que el resto del código no tuvo
que cambiar su forma de leer los datos.

Necesitas definir `DATABASE_URL` en `.env.local` (o en las variables de
entorno del hosting) con el connection string de tu base de Postgres, por
ejemplo `postgresql://usuario:password@host/basededatos?sslmode=require`.
Sin esa variable, cualquier página que lea o escriba datos va a fallar al
conectar -- es intencional (evita usar un secreto de desarrollo inseguro
como el de `SESSION_SECRET`), no un bug.

**Fotos de gatos: Cloudinary, no el disco del servidor.** Cuando un refugio
sube una foto desde `/refugio` (cámara del celular o galería), el archivo
NO se guarda en el disco del servidor -- se sube a Cloudinary
(`lib/cloudinary.ts`) y solo se guarda la URL resultante en
`Gato.fotoUrl`. La razón es la misma que con la base de datos: el plan
gratis de Render no tiene disco persistente, así que un archivo guardado
localmente se perdería en el siguiente redeploy. Cloudinary se eligió
porque su plan gratis no pide tarjeta de crédito y da 25 créditos/mes
(cada crédito cubre 1GB de storage, 1GB de banda, o 1000
transformaciones -- verificado en cloudinary.com/pricing, septiembre
2026), de sobra para las fotos de un refugio chico; se evaluaron también
Supabase Storage (1GB gratis, pero el proyecto se pausa tras 1 semana sin
uso, lo que rompería las URLs de las fotos) y Cloudflare R2 (10GB gratis,
pero pide vincular una tarjeta desde el primer momento aunque no se cobre
nada dentro del free tier). Necesitas `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en las variables de entorno
para que la subida funcione -- sin ellas, dar de alta un gato sin foto
sigue funcionando, y solo falla (de forma controlada, con aviso en el
panel) si se intenta subir una foto.

**Notificaciones: todavía no están conectadas.** El formulario de `/adopta`
ya crea el `Lead` en la base de datos (eso es lo que "recibir" un candidato
significa hoy), pero el aviso automático por Telegram/correo que se diseñó
en la arquitectura *no* está implementado -- necesita credenciales reales
(token del bot de Telegram, API key de Resend/SendGrid) que no existen en
este entorno. El lugar exacto donde conectarlo está marcado con `TODO` en
`app/adopta/actions.ts`. De hecho, ya quedó cargado como primera tarea en el
backlog de "Mejoras continuas" dentro de `/reportes`.

**Nombre del refugio y foto real.** El anuncio y la landing usan "Tu refugio
de gatos" como placeholder y la foto de Blackie (recortada de la imagen que
compartiste, no es una foto original) como ejemplo. Busca `TODO` en
`marketing/instagram-ad/render.js` para cambiar esto por los datos reales.

**Donaciones.** La sección "Dona" enlaza a un `mailto:` de ejemplo -- a
propósito no se construyó un flujo de pago falso. En cuanto definas el
método real (PayPal, Mercado Pago, transferencia), se reemplaza ese enlace.

## Vincular la campaña con gente que compra comida/arena/veterinario para gatos

Esto **no se resuelve con código propio buscando en Instagram/TikTok/Facebook**
-- lo que alguien busca o compra dentro de esas apps es privado y ninguna de
las tres expone eso por API a terceros (es la misma restricción que ya
explicó el documento de arquitectura para Grupos de Facebook). Lo que sí
existe, y es exactamente el mecanismo que describiste, es la **segmentación
por intereses y comportamiento** de Meta Ads Manager y TikTok Ads Manager:
ellos ya saben quién sigue cuentas de mascotas, interactúa con marcas de
alimento para gatos, arena, veterinarias, etc., y se les puede pedir que le
muestren el anuncio de adopción justo a esas personas.

Ya quedó conectada la mitad técnica de esto: `components/AdPixels.tsx`
inyecta el Píxel de Meta y el de TikTok (no hacen nada hasta que pongas tus
IDs reales en `.env.local` -- ver `.env.example`), y la página
`/adopta/gracias` dispara el evento de conversión "Lead" en cuanto alguien
termina el formulario. Eso es lo que le da al algoritmo de cada plataforma
la señal de "así se ve alguien que sí adopta", para que después busque
gente parecida (audiencia similar / *lookalike*) en vez de mostrar el
anuncio al azar.

La otra mitad -- que no es código, es configuración dentro de Ads Manager --
son los públicos a segmentar:

- **Por interés:** gatos, alimento para gatos (marcas como Whiskas, Purina
  Cat Chow, Friskies, Sheba), arena para gatos, veterinaria, juguetes para
  mascotas, dueños de mascotas.
- **Por comportamiento/compra:** Meta y TikTok también ofrecen segmentos de
  "compradores de productos para mascotas" en ciertos mercados.
- **Audiencia similar (lookalike):** una vez que el píxel tenga algunos
  leads reales, se le puede pedir a Meta/TikTok "encuéntrame más gente
  parecida a la que ya adoptó" -- esto normalmente funciona mejor que
  segmentar solo por interés.
- **Remarketing:** mostrarle el anuncio otra vez a quien visitó `/adopta`
  pero no llenó el formulario.

*Nivel de confianza: alto (0.85)* en que este es el mecanismo correcto -- es
publicidad digital estándar, no algo experimental. Lo que no verifiqué es si
tu refugio calificaría para el programa de créditos publicitarios de "Meta
for Nonprofits"; vale la pena que lo revises directamente en
`nonprofits.fb.com` porque cambiaría el cálculo de costos de abajo.

## Cuánto cuesta anunciarse en Instagram (México, 2026)

Investigué esto en vez de suponerlo -- son cifras de mercado de varias
agencias mexicanas, no la tarifa oficial de Meta (Meta no publica un precio
fijo; el costo lo determina una subasta en tiempo real). Dos fuentes
independientes coinciden en rangos similares:

| Métrica | Rango típico (México) |
|---|---|
| CPC (costo por clic) | $3.50 - $10 MXN |
| CPM (costo por 1,000 impresiones) | $40 - $110 MXN |
| CPL (costo por lead/formulario lleno) | $80 - $350 MXN |
| Presupuesto mensual "de validación" | $5,000 - $20,000 MXN |

El **mínimo técnico que permite la plataforma** es de aproximadamente $1
USD/día (Meta lo permite para ciertos objetivos como alcance), pero no sirve
para nada real -- es solo el piso técnico, no una recomendación.

**Para esta campaña específica**, dado que ya la diseñamos con presupuesto
bajo (la estrategia que quedó cargada en `/reportes` dice "$50 MXN/día"),
te propongo esto como punto de partida realista:

- **Primeras 2 semanas:** $100-200 MXN/día (~$3,000-6,000 MXN al mes), con
  objetivo "Clientes potenciales" (Leads) apuntando directo a `/adopta`, no
  "promocionar publicación" desde la app -- ese modo es más barato pero
  segmenta peor y no optimiza hacia gente que realmente llena formularios.
- Revisa el CPL real después de esas 2 semanas (con $150 MXN/día y un CPL de
  $80-350 MXN, esperarías entre 13 y 56 leads en las dos semanas -- un rango
  amplio a propósito, porque el resultado real depende mucho de qué tan
  bueno sea el segmento y el anuncio).
- Si el CPL te parece razonable, escala el presupuesto; si no, antes de
  subir el gasto prueba otro eslogan/foto -- ya tienes el generador para
  producir variantes rápido.

*Nivel de confianza: medio (0.65)*. Los rangos de CPC/CPM/CPL vienen de
páginas de agencias de marketing (no de Meta directamente), pueden estar
sesgados a la alza para vender sus servicios, y el costo real de tu campaña
específica depende de qué tan bien segmentada esté, qué tan bueno sea el
anuncio, y la competencia en tu zona. Tómalo como orden de magnitud para
presupuestar, no como cotización exacta -- el número real solo lo vas a
saber corriendo la campaña.

Fuentes: [Shortway - Publicidad en Instagram México](https://shortway.com.mx/cuanto-cuesta/publicidad-en-instagram) ·
[Holográfico - Costo publicidad Instagram México](https://holografico.mx/cuanto-cuesta-publicidad-instagram-mexico) ·
[Vizup - Meta Ads Minimum Budget Requirements 2026](https://www.tryvizup.com/blog/meta-ads-minimum-budget-requirements-2026)

## Comparación de pasarelas de pago para México (para conectar pago real)

Me pediste comparar opciones antes de elegir una, tanto para la tienda como
para donativos con tarjeta/OXXO en automático (el depósito manual a la
cuenta de Tessie Sit para donativos sigue siendo el plan por ahora -- esto
es para cuando quieras agregar tarjeta/OXXO además de eso, o para la
tienda).

**Cómo leer esta tabla**: las columnas de Stripe y Conekta las saqué
directo de sus páginas oficiales de precios (confianza alta, 0.85-0.9). Las
de Openpay y Mercado Pago no logré confirmarlas en sus propias páginas
oficiales -- Openpay no expone la tabla de precios sin iniciar sesión, y la
página de ayuda de Mercado Pago bloqueó el acceso automatizado. Esos dos
números vienen de un solo artículo comparativo de terceros (fluyez.com), así
que los marco con confianza baja (0.4) y te recomiendo confirmarlos
directamente en sus sitios antes de decidir solo por precio.

| Pasarela | Tarjeta (crédito/débito) | OXXO / efectivo | Cuota fija mensual | Confianza |
|---|---|---|---|---|
| **Stripe** | 3.6% + $3 MXN (+0.5% si es tarjeta internacional, +2% si hay conversión de moneda) | 4% + $3 MXN | Ninguna que haya encontrado | Alta (0.9) -- página oficial |
| **Conekta** | 3.4% + $3 MXN + IVA (pago único; MSI varía por banco y meses) | 2.6% + $3 MXN + IVA + $10-13 MXN cobrados al comprador en la tienda | Ninguna -- comisión mínima de $5.40 MXN + IVA por transacción | Alta (0.85) -- página oficial |
| **Openpay** | ~2.9% + $2.5 MXN (fuente de terceros dice "negociable") | ~3.9-4% + IVA (cifra genérica del mismo artículo, no específica de Openpay) | No confirmado | Baja (0.4) -- no pude ver su tabla oficial |
| **Mercado Pago** | ~3.49% a 3.99% + IVA + $4 MXN | Cobertura amplia en tiendas de conveniencia, pero no encontré el % exacto para OXXO específicamente | No confirmado | Baja (0.4) -- mismo artículo de terceros, y su página de ayuda oficial rechazó el acceso automatizado |

**Lo que sí puedo decir con más confianza (0.8)**, porque es requisito
estándar conocido de estas cuatro pasarelas en México, no algo que dependa
de la fuente de arriba: las cuatro piden RFC (persona física con actividad
empresarial, RESICO, o persona moral) y una cuenta bancaria mexicana con
CLABE para poder recibir depósitos -- ninguna deja operar solo con una
cuenta personal sin RFC. Si el refugio o la asociación todavía no tiene RFC
propio, ese es el primer paso antes de poder activar cualquiera de las
cuatro.

**Lo que no pude confirmar y no quiero adivinar**: cada cuánto se deposita el
dinero (Conekta tiene una página dedicada a esto pero el contenido que pude
extraer no incluyó la tabla real de días por método de pago), y si alguna
de las cuatro ofrece descuento para asociaciones civiles/donativos -- vale
la pena preguntarlo directamente a cada una, porque varias pasarelas sí
tienen programas para OSC que no siempre están en la página pública de
precios.

**Mi lectura del panorama, con esa salvedad de confianza**: Stripe y Conekta
son las dos que pude verificar de forma confiable, y Conekta cobra menos
tanto en tarjeta como en OXXO según sus propias cifras -- pero Stripe tiene
documentación en inglés más completa y es más conocido si en algún momento
quieres aceptar pagos internacionales. Si el volumen de la tienda es bajo al
inicio (que es lo esperable para un refugio chico), la diferencia en
comisión importa menos que qué tan fácil sea la integración -- ambas tienen
SDKs de Node bien documentados. No te recomiendo Openpay ni Mercado Pago
todavía basándome solo en esta tabla, dado que esos dos números tienen
confianza baja -- confírmalos tú directamente si te interesan antes de que
yo los compare con más peso.

## Cómo sigue esto (fases, según la arquitectura original)

1. ✅ Bitácora de reportes + landing de adopción + anuncio de Instagram.
2. ✅ Multi-refugio: login de equipo, login por refugio, alta de gatos desde
   el panel del refugio, donativos con montos sugeridos.
3. ✅ Tienda: catálogo único, carrito, checkout, pedidos, precio de
   adoptante (autodeclarado). Falta conectar pago real en línea -- ver la
   comparación de pasarelas de arriba.
4. ✅ Diseño "estilo rescate" aplicado a todo lo público (`/adopta`,
   `/tienda`, flyers, anuncio de Instagram).
5. Catálogo público de gatos (con foto, filtro por refugio/características) +
   que el adoptante elija un gato específico en `/adopta` -- esto es lo que
   falta para que un `Lead` público quede asociado automáticamente al
   refugio correcto (ver el límite explicado arriba). También: subir foto
   real desde el panel del refugio y disparar el generador de flyer
   automáticamente.
6. Pantalla para que el equipo dé de alta refugios nuevos desde la interfaz
   (hoy se crean con `createRefugio(...)` directo en código/seed).
7. Resultado automático preliminar en el formulario filtro (sí/no candidato)
   en vez de solo guardar las respuestas para revisión manual.
8. Pago real en línea, para tienda y/o donativos: elegir pasarela (ver
   comparación arriba -- confírmame el RFC/entidad legal disponible y si
   quieres empezar por Stripe o Conekta) e integrar tarjeta/OXXO
   automático, en vez del flujo manual actual ("Pendiente de pago" +
   contacto directo).
9. Conectar notificaciones reales (Telegram + correo).
10. Monitor de búsqueda externa (1-2 fuentes, con cola de revisión humana).
11. Cuentas individuales para el equipo (hoy es una sola password
    compartida).

Cada vez que se agregue algo, agrégalo también como entrada en "Mejoras
continuas" dentro de `/reportes` -- ese backlog es, literalmente, el
mecanismo de mejora continua que pediste: deja evidencia de qué se probó,
qué se implementó y qué impacto tuvo.
