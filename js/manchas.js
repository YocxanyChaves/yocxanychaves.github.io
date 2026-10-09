// Fondo de bolitas de slime.
// Cada mancha se queda en su lugar (sin girar ni dar vueltas): va cambiando
// de forma porque sus lóbulos salen y se meten, y además crece y se encoge.
// Cada una tiene su propia "zona" (lo más grande que puede llegar a ser)
// y las zonas nunca se tocan entre sí, así que las manchas no pueden chocar.
//
// En compu cada página tiene su propio fondo (su propio canvas con sus
// propias manchas), para que al cambiar de página se vaya con todo y fondo.
// En teléfono hay un solo fondo fijo detrás de todo (#manchas).

const SEPARACION = 12;   // espacio mínimo (px) entre las zonas de dos bolitas
const VELOCIDAD = 1.5;     // qué tan rápido cambian de forma y de tamaño
const DEFORMACION = 1.2;   // 0 = círculos perfectos, 1 = manchas normales, 1.5 = muy exageradas
const RESPIRACION = 0.15; // cuánto crecen y se encogen (0.18 = 18% más grandes o más chicas)
const COLOR = 'rgba(0, 0, 0, 1)';

const modoCompu = window.matchMedia('(min-width: 769px)');

function r(min, max)
{
    return Math.random() * (max - min) + min;
}

// Una "escena" es un canvas con sus propias manchas
function crearEscena(canvas, maxResolucion)
{
    return { canvas, ctx: canvas.getContext('2d'), W: 0, H: 0, bolitas: [], maxResolucion };
}

function ajustarTamano(e)
{
    const d = Math.min(window.devicePixelRatio || 1, e.maxResolucion);
    e.W = e.canvas.clientWidth;
    e.H = e.canvas.clientHeight;
    e.canvas.width = e.W * d;
    e.canvas.height = e.H * d;
    e.ctx.setTransform(d, 0, 0, d, 0, 0);
}

// Reparte las bolitas por la pantalla sin que sus zonas se toquen
function crearBolitas(e)
{
    const { W, H } = e;
    const bolitas = [];

    // Cantidad según el tamaño de pantalla
    const cantidad = Math.max(3, Math.min(14, Math.round(W * H / 140000)));

    // Primero las grandes, así las chicas llenan los huecos
    const radios = [];
    // El tamaño va según la pantalla, así en celular no quedan gigantes
    const lado = Math.min(W, H);
    for (let i = 0; i < cantidad; i++) radios.push(lado * r(0.08, 0.16));
    radios.sort((a, b) => b - a);

    for (const R of radios)
    {
        // Cada mancha tiene sus propias ondas. Las ondas no giran: cada una
        // sale hacia afuera y luego se mete hacia adentro en el mismo lugar,
        // así la forma va cambiando sin que la mancha dé vueltas
        const ondas = [];
        let sumaAmp = 0;
        // Lóbulos grandes pesan más (forma de mancha), los chicos solo dan detalle
        const pesos = [0.30, 0.22, 0.13, 0.06];   // para 2, 3, 4 y 5 lóbulos
        for (let k = 2; k <= 5; k++) {
            const amp = pesos[k - 2] * r(0.5, 1) * DEFORMACION;
            sumaAmp += amp;
            ondas.push({
                k,
                amp,
                fase: r(0, Math.PI * 2),
                pulso: r(0.25, 0.6),                                 // qué tan rápido sale/se mete
                fasePulso: r(0, Math.PI * 2)
            });
        }

        // Lo más grande que puede llegar a ser: todas las ondas hacia afuera
        // a la vez y en su momento más grande de la respiración
        const zona = R * (1 + sumaAmp) * (1 + RESPIRACION);

        let x, y, cabe = false;
        for (let intento = 0; intento < 400 && !cabe; intento++)
        {
            x = r(0, W);
            y = r(0, H);
            cabe = bolitas.every(o => Math.hypot(o.x - x, o.y - y) >= zona + o.zona + SEPARACION);
        }

        // Si no cabe, no se agrega (mejor menos bolitas que encimadas)
        if (!cabe) continue;

        bolitas.push({
            x, y,
            R, zona,
            respira: r(0.3, 0.6),                  // qué tan rápido crece y se encoge
            faseRespira: r(0, Math.PI * 2),
            ondas
        });
    }

    e.bolitas = bolitas;
}

// Forma de mancha: lóbulos que salen y se meten, y un tamaño que respira
function forma(b, T)
{
    const N = 48, pts = [];
    const escala = 1 + RESPIRACION * Math.sin(T * b.respira + b.faseRespira);

    for (let k = 0; k < N; k++) {
        const th = k / N * Math.PI * 2;

        let variacion = 1;
        for (const o of b.ondas) {
            // va de lóbulo hacia afuera a entrada hacia adentro, sin girar
            variacion += o.amp * Math.sin(T * o.pulso + o.fasePulso) * Math.sin(th * o.k + o.fase);
        }
        variacion = Math.max(variacion, 0.4);

        const rad = b.R * variacion * escala;
        pts.push([b.x + Math.cos(th) * rad, b.y + Math.sin(th) * rad]);
    }
    return pts;
}

function dibujarBolita(ctx, b, T)
{
    const pts = forma(b, T), N = pts.length;
    const medio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

    ctx.beginPath();
    const ini = medio(pts[N - 1], pts[0]);
    ctx.moveTo(ini[0], ini[1]);
    for (let k = 0; k < N; k++) {
        const p = pts[k], e = medio(p, pts[(k + 1) % N]);
        ctx.quadraticCurveTo(p[0], p[1], e[0], e[1]);
    }
    ctx.closePath();
    ctx.fillStyle = COLOR;
    ctx.fill();
}

function dibujarEscena(e, T)
{
    e.ctx.clearRect(0, 0, e.W, e.H);
    for (const b of e.bolitas) dibujarBolita(e.ctx, b, T);
}

// ---------- Escenas: el fondo fijo (teléfono) y uno por página (compu) ----------
const fondoGeneral = crearEscena(document.getElementById('manchas'), 2);

const listaPaginas = [...document.querySelectorAll('#paginas .pagina')];
const fondosPagina = listaPaginas.map(pagina => {
    const canvas = document.createElement('canvas');
    canvas.className = 'fondo-pagina';
    canvas.setAttribute('aria-hidden', 'true');
    pagina.prepend(canvas);

    // si la página scrollea por dentro, el fondo se queda quieto
    pagina.addEventListener('scroll', () => {
        canvas.style.transform = `translateY(${pagina.scrollTop}px)`;
    }, { passive: true });

    // 5 fondos a pantalla completa: con resolución 1.5 alcanza y se ahorra memoria
    return crearEscena(canvas, 1.5);
});

function escenasActivas()
{
    return modoCompu.matches ? fondosPagina : [fondoGeneral];
}

function prepararEscenas()
{
    for (const e of escenasActivas()) {
        const anchoAntes = e.W;
        ajustarTamano(e);
        // En celular la barra del navegador cambia el alto al hacer scroll;
        // solo se reparten de nuevo si cambia el ancho (o si aún no hay manchas)
        if (e.W && (e.W !== anchoAntes || !e.bolitas.length)) crearBolitas(e);
    }

    // En compu se dibujan una vez todos los fondos de página desde el inicio,
    // así el primer giro no tiene que dibujar los que todavía no se habían visto
    if (modoCompu.matches) {
        fondosPagina.forEach(e => dibujarEscena(e, tiempo));
    }
}

// Reloj de las manchas. Mientras gira el carrusel se pausa, pero sin
// frenazos: al empezar el giro las manchas frenan suavecito hasta quedar
// quietas, y al terminar arrancan suavecito desde la misma forma.
let tiempo = 0;
let ritmo = 1;                 // 1 = velocidad normal, 0 = pausadas
let cuadroAnterior = null;
let paginaQueSeVa = null;
const FRENO = 7;               // qué tan rápido frenan y arrancan (unos 0.3 s)

function animar(t)
{
    const enCompu = modoCompu.matches;
    const girando = enCompu && window.paginas && window.paginas.girando && window.paginas.girando();

    // máximo 0.1 s por cuadro: si la pestaña estuvo oculta, no dan un brinco al volver
    const pasado = cuadroAnterior === null ? 0 : Math.min((t - cuadroAnterior) / 1000, 0.1);
    cuadroAnterior = t;

    ritmo += ((girando ? 0 : 1) - ritmo) * Math.min(1, pasado * FRENO);
    if (girando && ritmo < 0.01) ritmo = 0;
    tiempo += pasado * VELOCIDAD * ritmo;

    if (enCompu) {
        // solo se dibujan las páginas que se ven (todas mientras gira el carrusel)
        const visibles = window.paginas && window.paginas.visibles
            ? window.paginas.visibles()
            : fondosPagina.map((_, i) => i);

        if (!girando) {
            fondosPagina.forEach(e => { e.quieta = false; });
            paginaQueSeVa = visibles[0];
        }
        const paginaQueLlega = window.paginas && window.paginas.actual
            ? listaPaginas.findIndex(p => p.id === window.paginas.actual())
            : -1;

        for (const i of visibles) {
            const e = fondosPagina[i];
            // mientras frenan se dibujan la que se va y la que llega; las demás
            // se dibujan una sola vez (redibujar las 5 en cada cuadro trababa el giro)
            const frenando = girando && ritmo > 0 && (i === paginaQueSeVa || i === paginaQueLlega);
            if (girando && e.quieta && !frenando) continue;
            dibujarEscena(e, tiempo);
            e.quieta = girando;
        }
    } else {
        dibujarEscena(fondoGeneral, tiempo);
    }

    requestAnimationFrame(animar);
}

prepararEscenas();
requestAnimationFrame(animar);

let esperaResize;
window.addEventListener('resize', () =>
{
    clearTimeout(esperaResize);
    esperaResize = setTimeout(prepararEscenas, 200);
});
modoCompu.addEventListener('change', prepararEscenas);
