// Carrusel de proyectos, con navegador (flechas y un puntito por proyecto).
// Es infinito: al final hay una copia del primero y al inicio una del último,
// y al llegar a una copia se salta sin animación a la tarjeta real.
// Avanza solo cada 4 s, pero únicamente cuando se está viendo Proyectos
// (nada corre en segundo plano) y no mientras el mouse está encima.

(() => {
    const ventana = document.querySelector('.carousel-window');
    const contenedor = document.querySelector('.projects-container');
    const proyectos = [...contenedor.querySelectorAll('.project')];
    const puntos = document.querySelector('.proyectos-puntos');
    const flechas = document.querySelectorAll('.proyectos-flecha');
    const seccion = document.getElementById('projects-section');

    const N = proyectos.length;
    const TRANSICION = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
    const CADA = 4000;

    // copias para que dé la vuelta sin fin (no se leen ni se pueden enfocar)
    const copia = original => {
        const c = original.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
        return c;
    };
    contenedor.prepend(copia(proyectos[N - 1]));
    contenedor.append(copia(proyectos[0]));

    let posicion = 1;            // 1..N son las reales; 0 y N+1 son las copias
    let moviendo = false;
    let mouseEncima = false;

    // un puntito por proyecto
    const botones = proyectos.map((proyecto, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'proyectos-punto';
        b.setAttribute('aria-label', 'Ir a ' + proyecto.querySelector('h3').textContent.trim());
        b.addEventListener('click', () => { irA(i + 1); reiniciarReloj(); });
        puntos.append(b);
        return b;
    });

    // El ancho se mide cada vez (cambia según el tamaño de pantalla)
    function anchoProyecto() {
        const estilo = getComputedStyle(proyectos[0]);
        return proyectos[0].offsetWidth + parseFloat(estilo.marginRight);
    }

    function colocar(animar) {
        contenedor.style.transition = animar ? TRANSICION : 'none';
        contenedor.style.transform = `translateX(${-posicion * anchoProyecto()}px)`;
    }

    function marcarPunto() {
        const real = (posicion - 1 + N) % N;
        botones.forEach((b, i) => {
            b.classList.toggle('activo', i === real);
            if (i === real) b.setAttribute('aria-current', 'true');
            else b.removeAttribute('aria-current');
        });
    }

    function irA(nueva) {
        if (moviendo || nueva === posicion) return;
        moviendo = true;
        posicion = nueva;
        marcarPunto();
        colocar(true);
    }

    contenedor.addEventListener('transitionend', evento => {
        if (evento.target !== contenedor) return;
        moviendo = false;
        // si quedó en una copia, salta a la tarjeta real sin que se note
        if (posicion === 0) { posicion = N; colocar(false); }
        if (posicion === N + 1) { posicion = 1; colocar(false); }
    });

    flechas.forEach(flecha => flecha.addEventListener('click', () => {
        irA(posicion + Number(flecha.dataset.direccion));
        reiniciarReloj();
    }));

    // ---------- Avance automático, solo cuando se está viendo ----------
    let seccionVisible = false;
    new IntersectionObserver(entradas => {
        seccionVisible = entradas[0].isIntersecting;
    }, { threshold: 0.4 }).observe(seccion);

    function seVe() {
        if (document.hidden || mouseEncima) return false;
        const p = window.paginas;
        if (p && typeof p.activo === 'function' && p.activo()) return !p.girando() && p.actual() === 'projects-section';
        return seccionVisible;     // teléfono: si la sección está en pantalla
    }

    let reloj;
    function reiniciarReloj() {
        clearInterval(reloj);
        reloj = setInterval(() => { if (seVe()) irA(posicion + 1); }, CADA);
    }

    ventana.addEventListener('pointerenter', () => { mouseEncima = true; });
    ventana.addEventListener('pointerleave', () => { mouseEncima = false; });

    // Si cambia el tamaño de la pantalla, reacomodar sin animación
    window.addEventListener('resize', () => {
        colocar(false);
        moviendo = false;
    });

    colocar(false);
    marcarPunto();
    reiniciarReloj();
})();
