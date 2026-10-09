// Carrusel 3D de páginas (solo en compu, más de 768px).
// Las 5 páginas son las caras de un pentágono que gira, con espacio entre
// ellas para que se vean flotando. Es cerrado: después de Contacto sigue
// Inicio y antes de Inicio está Contacto. Al cambiar de página:
// la pantalla (con todo y su fondo) se aleja hacia el fondo negro, el
// pentágono gira hasta la cara nueva y esa se acerca hasta llenar la pantalla.
// En reposo la página queda "plana" (sin 3D) para que el texto se vea nítido.
// En teléfono no se usa: ahí el scroll es normal.

(() => {
    const contenedor = document.getElementById('paginas');
    const carril = contenedor.querySelector('.carril');
    const paginas = [...carril.querySelectorAll('.pagina')];

    const modoCompu = window.matchMedia('(min-width: 769px)');
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

    const N = paginas.length;
    const ANGULO = 360 / N;           // 72° entre cara y cara
    const HUECO = 0.3;                // espacio entre caras, en fracción del ancho (flotan separadas)
    const PERSPECTIVA = 2400;         // igual que "perspective" del CSS
    const TAMANO_LEJOS = 0.55;        // qué tan pequeña se ve la pantalla al alejarse
    const FLOTE = 14;                 // cuánto suben y bajan las caras mientras giran (px)
    const UMBRAL_RUEDA = 50;          // cuánto hay que girar la rueda para cambiar de página

    let activo = false;
    let actual = 0;
    let giro = 0;                     // giro acumulado del pentágono (grados)
    let animando = false;
    let bloqueadoHasta = 0;           // evita cambios dobles por la inercia del touchpad
    let acumulado = 0;
    let ultimaRueda = 0;

    // Dos rayitos de luz que recorren el borde de cada pantalla mientras gira,
    // siempre en esquinas opuestas (en diagonal), persiguiéndose.
    // Cada rayo son varias rayitas cortas en fila, cada una siguiendo a la
    // anterior: así el rayo se curva en las esquinas, y cada pedacito solo
    // se desplaza (eso lo mueve la tarjeta gráfica sin redibujar: va fluido).
    // Si la página scrollea por dentro, los rayos se quedan en el borde.
    const PEDAZOS = 7;
    // colores de la punta a la cola: blanco, rosado bebé, lila, celeste, nada
    const COLORES = ['#ffffff', '#f8c8dc', '#e6c4f0', '#c8b8ff', '#b4c6ff', '#9fe0ff', 'rgba(140, 220, 255, 0.45)', 'rgba(140, 220, 255, 0)'];

    const rayos = paginas.flatMap(pagina => {
        const marco = document.createElement('span');
        marco.className = 'borde-chispa';
        marco.setAttribute('aria-hidden', 'true');
        const par = [0, 1].map(() => Array.from({ length: PEDAZOS }, (_, k) => {
            const pedazo = document.createElement('span');
            pedazo.className = 'rayo';
            // cada pedazo va del color de su cola al de su punta, para que el rayo se vea continuo
            pedazo.style.background = `linear-gradient(to right, ${COLORES[k + 1]}, ${COLORES[k]})`;
            pedazo.style.boxShadow = `0 0 6px ${k < 3 ? 'rgba(248, 200, 220, 0.85)' : 'rgba(200, 180, 255, 0.5)'}`;
            marco.append(pedazo);
            return pedazo;
        }));
        pagina.append(marco);
        pagina.addEventListener('scroll', () => {
            marco.style.transform = `translateY(${pagina.scrollTop}px)`;
        }, { passive: true });
        return par;
    });

    // Recorrido por el borde (con las esquinas redondeadas)
    const RADIO = 28, MARGEN = 2, VUELTA = 1300;   // radio de las esquinas, separación del borde, ms por vuelta

    function recorridoRayo(pedazo) {
        const caja = pedazo.parentElement;
        const W = caja.clientWidth - MARGEN * 2, H = caja.clientHeight - MARGEN * 2;
        const L = pedazo.offsetWidth, A = pedazo.offsetHeight;
        const puntos = [];                       // [x, y, dirección en grados]
        const esquina = (cx, cy, desde) => {     // cuarto de círculo, en 6 pasos
            for (let k = 0; k <= 6; k++) {
                const a = (desde + k * 15) * Math.PI / 180;
                puntos.push([cx + RADIO * Math.cos(a), cy + RADIO * Math.sin(a), desde + 90 + k * 15]);
            }
        };
        esquina(W - RADIO, RADIO, -90);          // arriba a la derecha
        esquina(W - RADIO, H - RADIO, 0);        // abajo a la derecha
        esquina(RADIO, H - RADIO, 90);           // abajo a la izquierda
        esquina(RADIO, RADIO, 180);              // arriba a la izquierda
        puntos.unshift([RADIO, 0, 0]);           // empieza arriba a la izquierda (la vuelta termina ahí mismo)

        // cada punto se ubica según la distancia recorrida, para ir a velocidad pareja
        let total = 0;
        const dist = puntos.map((pt, i) => (i ? (total += Math.hypot(pt[0] - puntos[i - 1][0], pt[1] - puntos[i - 1][1])) : 0));
        return {
            perimetro: total,
            cuadros: puntos.map(([x, y, dir], i) => ({
                offset: dist[i] / total,
                transform: `translate(${(x + MARGEN - L).toFixed(1)}px, ${(y + MARGEN - A / 2).toFixed(1)}px) rotate(${dir}deg)`
            }))
        };
    }

    function encenderCometas() {
        if (sinMovimiento.matches) return;
        rayos.forEach((pedazos, i) => {
            const { perimetro, cuadros } = recorridoRayo(pedazos[0]);
            // el segundo rayo de cada par va media vuelta adelante: en la esquina opuesta
            const inicio = VUELTA + (i % 2) * VUELTA / 2 + Math.floor(i / 2) * 260;
            // cada pedazo va un poquito atrás del anterior (lo que mide, en tiempo)
            const atraso = (pedazos[0].offsetWidth * 0.9 / perimetro) * VUELTA;
            pedazos.forEach((pedazo, k) => {
                const animacion = pedazo.animate(cuadros, { duration: VUELTA, iterations: Infinity, easing: 'linear' });
                animacion.currentTime = inicio - k * atraso;
            });
        });
    }

    function apagarCometas() {
        rayos.flat().forEach(pedazo => pedazo.getAnimations().forEach(a => a.cancel()));
    }

    // Distancia del centro del pentágono a cada cara
    const apotema = () => (window.innerWidth * (1 + HUECO) / 2) / Math.tan(Math.PI / N);
    const vista = (z, grados) => `translateZ(${z}px) rotateY(${grados}deg)`;

    function avisar() {
        document.dispatchEvent(new CustomEvent('paginacambio', { detail: { id: paginas[actual].id } }));
    }

    function marcarActual() {
        paginas.forEach((p, i) => p.classList.toggle('actual', i === actual));
    }

    const cara = (i, a) => `rotateY(${i * ANGULO}deg) translateZ(${a}px)`;

    // Pone las páginas como caras del pentágono (solo mientras gira)
    function armarPentagono() {
        const a = apotema();
        paginas.forEach((p, i) => { p.style.transform = cara(i, a); });
        contenedor.classList.add('en-3d', 'redondeadas');
        encenderCometas();
    }

    // Mientras gira, cada cara sube o baja un poquito, como si flotara
    function flotar(duracion) {
        const a = apotema();
        paginas.forEach((p, i) => {
            const dy = (i % 2 ? 1 : -1) * FLOTE * (0.7 + 0.3 * Math.sin(i * 1.7));
            p.animate([
                { transform: cara(i, a) + ' translateY(0)' },
                { transform: cara(i, a) + ` translateY(${dy}px)`, offset: 0.5 },
                { transform: cara(i, a) + ' translateY(0)' }
            ], { duration: duracion, easing: 'ease-in-out' });
        });
    }

    // Vuelve a dejar la página actual plana
    function desarmarPentagono() {
        paginas.forEach(p => { p.style.transform = ''; });
        carril.style.transform = '';
        contenedor.classList.remove('en-3d', 'redondeadas');
        apagarCometas();
    }

    // ¿Algo dentro de la página puede scrollear en esa dirección?
    // (por ejemplo "Sobre mí" en una pantalla baja, o el cuadro del mensaje)
    function puedeScrollear(desde, direccion) {
        for (let el = desde; el && el !== contenedor; el = el.parentElement) {
            const estilo = getComputedStyle(el);
            const scrolleable = /(auto|scroll)/.test(estilo.overflowY) && el.scrollHeight > el.clientHeight + 1;
            if (!scrolleable) continue;
            if (direccion > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
            if (direccion < 0 && el.scrollTop > 0) return true;
        }
        return false;
    }

    // Gira hasta la página "destino" por el lado más corto
    // (por ejemplo, de Contacto a Inicio gira una sola cara hacia adelante).
    // "pasosFijos" fuerza la dirección (lo usan la rueda y las flechas).
    function irA(destino, pasosFijos = null) {
        destino = ((destino % N) + N) % N;
        if (!activo || animando || destino === actual) return;

        const desde = actual;
        let pasos = pasosFijos ?? destino - desde;
        if (pasosFijos === null) {
            if (pasos > N / 2) pasos -= N;
            if (pasos < -N / 2) pasos += N;
        }

        actual = destino;
        animando = true;

        // Si se va hacia atrás, la página aparece mostrando su final
        const pagina = paginas[destino];
        pagina.scrollTop = pasos > 0 ? 0 : pagina.scrollHeight;

        history.replaceState(null, '', '#' + pagina.id);
        avisar();

        const terminar = () => {
            desarmarPentagono();
            marcarActual();
            animando = false;
            bloqueadoHasta = performance.now() + 400;
        };

        // Animaciones reducidas: sin 3D, la página nueva solo aparece suave
        if (sinMovimiento.matches) {
            marcarActual();
            pagina.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }).finished.then(terminar);
            return;
        }

        const a = apotema();
        const lejos = PERSPECTIVA * (1 / TAMANO_LEJOS - 1);   // cuánto se aleja hacia el fondo
        const g0 = giro;
        const g1 = giro - pasos * ANGULO;
        giro = g1;

        const duracion = Math.min(1900, 1250 + (Math.abs(pasos) - 1) * 250);
        const suave = 'cubic-bezier(0.4, 0, 0.2, 1)';

        armarPentagono();
        flotar(duracion);
        carril.style.transform = vista(-a, g1);

        // 1) se aleja con todo y fondo  2) el pentágono gira  3) la cara nueva se acerca
        const animacion = carril.animate([
            { offset: 0,    transform: vista(-a, g0),         easing: suave },
            { offset: 0.28, transform: vista(-a - lejos, g0), easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
            { offset: 0.72, transform: vista(-a - lejos, g1), easing: suave },
            { offset: 1,    transform: vista(-a, g1) }
        ], { duration: duracion });

        // las esquinas redondeadas se van quitando mientras la página se acerca
        setTimeout(() => contenedor.classList.remove('redondeadas'), duracion * 0.72);

        animacion.finished.then(terminar, terminar);
    }

    // Carrusel cerrado: de Contacto se pasa a Inicio y de Inicio a Contacto
    function siguiente(direccion) {
        irA(actual + direccion, direccion);
    }

    // ---------- Rueda del mouse / touchpad ----------
    contenedor.addEventListener('wheel', evento => {
        if (!activo || evento.ctrlKey) return;    // ctrl + rueda = zoom del navegador

        // el touchpad también puede deslizar de lado
        const delta = Math.abs(evento.deltaX) > Math.abs(evento.deltaY) ? evento.deltaX : evento.deltaY;
        const direccion = Math.sign(delta);
        if (!direccion) return;

        const ahora = performance.now();

        // Si la página tiene más contenido, primero se scrollea por dentro
        if (!animando && puedeScrollear(evento.target, direccion)) {
            bloqueadoHasta = ahora + 350;         // que la inercia no la cambie apenas llega al final
            return;
        }

        evento.preventDefault();

        if (animando || ahora < bloqueadoHasta) {
            // mientras siguen llegando eventos (inercia), se mantiene bloqueado
            if (ahora - ultimaRueda < 120) bloqueadoHasta = Math.max(bloqueadoHasta, ahora + 200);
            ultimaRueda = ahora;
            acumulado = 0;
            return;
        }

        if (ahora - ultimaRueda > 200) acumulado = 0;
        ultimaRueda = ahora;
        acumulado += delta;

        if (Math.abs(acumulado) >= UMBRAL_RUEDA) {
            acumulado = 0;
            siguiente(direccion);
        }
    }, { passive: false });

    // ---------- Teclado ----------
    document.addEventListener('keydown', evento => {
        if (!activo) return;
        const escribiendo = evento.target.closest('input, textarea, select, [contenteditable="true"]');
        if (escribiendo) return;

        const teclas = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': evento.shiftKey ? -1 : 1 };
        const lateral = { ArrowRight: 1, ArrowLeft: -1 };

        // flechas de los lados: siempre cambian de página
        if (lateral[evento.key]) { evento.preventDefault(); siguiente(lateral[evento.key]); return; }

        if (evento.key === 'Home') { evento.preventDefault(); irA(0); return; }
        if (evento.key === 'End')  { evento.preventDefault(); irA(N - 1); return; }

        const direccion = teclas[evento.key];
        if (!direccion) return;
        evento.preventDefault();

        const pagina = paginas[actual];
        if (puedeScrollear(pagina, direccion)) {
            const cuanto = evento.key.startsWith('Arrow') ? 100 : pagina.clientHeight * 0.85;
            pagina.scrollBy({ top: direccion * cuanto, behavior: sinMovimiento.matches ? 'auto' : 'smooth' });
        } else {
            siguiente(direccion);
        }
    });

    // ---------- Deslizar el dedo (tablets y pantallas táctiles grandes) ----------
    // deslizar hacia la izquierda o hacia arriba = siguiente página
    let toque = null;
    contenedor.addEventListener('touchstart', evento => {
        toque = { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
    }, { passive: true });

    contenedor.addEventListener('touchend', evento => {
        if (!activo || !toque) return;
        const dx = toque.x - evento.changedTouches[0].clientX;
        const dy = toque.y - evento.changedTouches[0].clientY;
        toque = null;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) >= 50) siguiente(Math.sign(dx));
        } else if (Math.abs(dy) >= 50 && !puedeScrollear(evento.target, Math.sign(dy))) {
            siguiente(Math.sign(dy));
        }
    }, { passive: true });

    // ---------- Enlaces internos (#seccion): menú, "Conecta conmigo"... ----------
    document.addEventListener('click', evento => {
        if (!activo) return;
        const enlace = evento.target.closest('a[href^="#"]');
        if (!enlace) return;
        const indice = paginas.findIndex(p => '#' + p.id === enlace.getAttribute('href'));
        if (indice < 0) return;
        evento.preventDefault();
        irA(indice);
    });

    // ---------- Activar / desactivar según el tamaño de pantalla ----------
    function activar() {
        activo = true;
        const desdeEnlace = paginas.findIndex(p => '#' + p.id === location.hash);
        if (desdeEnlace >= 0) actual = desdeEnlace;
        giro = -actual * ANGULO;
        window.scrollTo(0, 0);
        desarmarPentagono();
        marcarActual();
        avisar();
    }

    function desactivar() {
        activo = false;
        animando = false;
        carril.getAnimations().forEach(a => a.cancel());
        paginas.forEach(p => p.getAnimations().forEach(a => a.cancel()));
        desarmarPentagono();
        // en teléfono se sigue mostrando la misma sección
        paginas[actual].scrollIntoView({ behavior: 'auto' });
    }

    modoCompu.addEventListener('change', () => (modoCompu.matches ? activar() : desactivar()));

    // si cambia el tamaño a medio giro, se termina el giro de una vez
    window.addEventListener('resize', () => {
        if (activo && animando) carril.getAnimations().forEach(a => a.finish());
    });

    if (modoCompu.matches) activar();

    window.paginas = {
        activo: () => activo,
        irA: id => {
            const indice = paginas.findIndex(p => p.id === id);
            if (indice >= 0) irA(indice);
        },
        // qué páginas se ven ahora (el fondo de manchas solo dibuja esas)
        visibles: () => (animando ? paginas.map((_, i) => i) : [actual]),
        // mientras gira, todo lo demás se queda quieto (más liviano)
        girando: () => animando,
        // la página que está en pantalla (las demás no corren nada)
        actual: () => paginas[actual].id
    };
})();
