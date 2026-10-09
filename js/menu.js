// Menú de íconos con burbuja.
// La burbuja marca la sección activa y brinca de un ícono a otro con
// "squash and stretch": se estira en el aire, se aplasta al caer y rebota.
// Se mueve al hacer clic y también al cambiar de sección scrolleando.

document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu-iconos');
    const burbuja = menu.querySelector('.burbuja');
    const links = [...menu.querySelectorAll('a[data-seccion]')];
    const secciones = links
        .map(a => document.getElementById(a.dataset.seccion))
        .filter(Boolean);

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

    let activo = null;
    let animacion = null;
    let bloqueoScroll = false;   // mientras baja por un clic, el scroll no mueve la burbuja
    let esperaBloqueo;

    // Posición horizontal (px) del centro de un ícono dentro del menú
    function posicionDe(link) {
        const menuRect = menu.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        return linkRect.left - menuRect.left + (linkRect.width - burbuja.offsetWidth) / 2;
    }

    // Dónde está la burbuja ahora mismo (aunque esté a medio brinco)
    function xActual() {
        return new DOMMatrixReadOnly(getComputedStyle(burbuja).transform).m41;
    }

    function marcarActivo(link) {
        links.forEach(a => {
            a.classList.toggle('activo', a === link);
            if (a === link) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
        });
    }

    function moverBurbuja(link, animar = true) {
        if (!link || link === activo) return;
        activo = link;
        marcarActivo(link);

        const destino = posicionDe(link);
        const final = `translate(${destino}px, 0) scale(1, 1)`;

        if (!animar || !burbuja.classList.contains('lista')) {
            if (animacion) animacion.cancel();
            burbuja.style.transform = final;
            burbuja.classList.add('lista');
            return;
        }

        const origen = xActual();
        if (animacion) animacion.cancel();
        burbuja.style.transform = final;

        // Animaciones reducidas: solo se desliza, sin rebote
        if (sinMovimiento.matches) {
            animacion = burbuja.animate(
                [{ transform: `translate(${origen}px, 0)` }, { transform: final }],
                { duration: 250, easing: 'ease-out' }
            );
            return;
        }

        const x = t => origen + (destino - origen) * t;
        const alto = Math.min(9, 4 + Math.abs(destino - origen) * 0.03); // brinca más si va más lejos (sin salirse del menú)

        animacion = burbuja.animate([
            // se agacha para tomar impulso
            { offset: 0,    transform: `translate(${x(0)}px, 0) scale(1, 1)`,                easing: 'ease-out' },
            { offset: 0.1,  transform: `translate(${x(0)}px, 0) scale(1.15, 0.85)`,          easing: 'ease-out' },
            // en el aire: se estira hacia arriba
            { offset: 0.42, transform: `translate(${x(0.55)}px, ${-alto}px) scale(0.85, 1.2)`, easing: 'ease-in' },
            // cae y se aplasta contra la "tela"
            { offset: 0.68, transform: `translate(${x(1)}px, 0) scale(1.3, 0.7)`,            easing: 'ease-out' },
            // rebota un poquito
            { offset: 0.8,  transform: `translate(${x(1)}px, -4px) scale(0.92, 1.08)`,       easing: 'ease-in' },
            { offset: 0.9,  transform: `translate(${x(1)}px, 0) scale(1.07, 0.93)`,          easing: 'ease-out' },
            // y se queda quieta
            { offset: 1,    transform: final }
        ], { duration: 620 });
    }

    // Clic en un ícono: la burbuja brinca de una vez y el scroll no la
    // vuelve a mover hasta llegar (si no, pasaría por las secciones intermedias)
    links.forEach(link => {
        link.addEventListener('click', evento => {
            // En compu el cambio lo hace el carrusel de páginas (js/paginas.js)
            // y la burbuja se mueve con su aviso "paginacambio"
            if (window.paginas && typeof window.paginas.activo === 'function' && window.paginas.activo()) return;

            // Inicio sube hasta arriba del todo: en celular el correo 3D
            // está encima del título y si no quedaba escondido
            if (link.dataset.seccion === 'inicio') {
                evento.preventDefault();
                window.scrollTo({ top: 0 });   // suave por el scroll-behavior del CSS
                history.replaceState(null, '', '#inicio');
            }

            moverBurbuja(link);
            bloqueoScroll = true;
            clearTimeout(esperaBloqueo);
            esperaBloqueo = setTimeout(() => { bloqueoScroll = false; }, 1200);
        });
    });

    if ('onscrollend' in window) {
        window.addEventListener('scrollend', () => {
            clearTimeout(esperaBloqueo);
            bloqueoScroll = false;
        });
    }

    // En compu: la burbuja sigue al carrusel de páginas
    document.addEventListener('paginacambio', evento => {
        moverBurbuja(links.find(a => a.dataset.seccion === evento.detail.id));
    });

    // En teléfono: sección activa al scrollear (la que cruza la mitad de la pantalla)
    const observador = new IntersectionObserver(entradas => {
        if (bloqueoScroll) return;
        if (window.paginas && typeof window.paginas.activo === 'function' && window.paginas.activo()) return;
        entradas.forEach(entrada => {
            if (!entrada.isIntersecting) return;
            const link = links.find(a => a.dataset.seccion === entrada.target.id);
            moverBurbuja(link);
        });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

    secciones.forEach(seccion => observador.observe(seccion));

    // Posición inicial (sin animación): la sección del enlace (#...) o Inicio
    const inicial = links.find(a => a.getAttribute('href') === location.hash) || links[0];
    moverBurbuja(inicial, false);

    // Si cambia el tamaño de la pantalla, reubicar sin animación
    window.addEventListener('resize', () => {
        if (!activo) return;
        if (animacion) animacion.cancel();
        burbuja.style.transform = `translate(${posicionDe(activo)}px, 0) scale(1, 1)`;
    });
});
