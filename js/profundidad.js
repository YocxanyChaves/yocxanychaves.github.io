// Tarjetas con profundidad (contacto y proyectos): con el mouse encima
// se inclinan un poquito hacia el cursor y una luz suave lo sigue.
// Solo en pantallas con mouse y si no se pidieron animaciones reducidas.

(() => {
    const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const TARJETAS = '.form-container, .project';
    const INCLINACION = 6;      // grados máximos

    let activa = null;

    function soltar(tarjeta) {
        tarjeta.classList.remove('con-luz');
        tarjeta.style.transform = '';
        tarjeta.style.removeProperty('--luz-x');
        tarjeta.style.removeProperty('--luz-y');
    }

    document.addEventListener('pointermove', evento => {
        if (!conMouse.matches || sinMovimiento.matches) return;

        const tarjeta = evento.target.closest(TARJETAS);
        if (tarjeta !== activa) {
            if (activa) soltar(activa);
            activa = tarjeta;
        }
        if (!tarjeta) return;

        const r = tarjeta.getBoundingClientRect();
        const x = (evento.clientX - r.left) / r.width - 0.5;    // -0.5 a 0.5
        const y = (evento.clientY - r.top) / r.height - 0.5;

        tarjeta.style.transform =
            `perspective(900px) rotateX(${(-y * INCLINACION).toFixed(2)}deg) rotateY(${(x * INCLINACION).toFixed(2)}deg)`;
        tarjeta.classList.add('con-luz');
        tarjeta.style.setProperty('--luz-x', `${((x + 0.5) * 100).toFixed(1)}%`);
        tarjeta.style.setProperty('--luz-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    document.addEventListener('pointerleave', () => {
        if (activa) soltar(activa);
        activa = null;
    });
})();
