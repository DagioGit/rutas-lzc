// Comportamiento compartido por todas las páginas: barra superior, menú móvil,
// barra flotante y cuentas regresivas en vivo ([data-eta]).

(function () {
    const barra = document.getElementById("barra");
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");
    const flotante = document.querySelector(".flotante");
    const pie = document.querySelector(".pie");

    function alDesplazar() {
        if (barra) barra.classList.toggle("is-scrolled", window.scrollY > 8);
        if (flotante) {
            const finPie = pie ? pie.getBoundingClientRect().top < window.innerHeight - 40 : false;
            flotante.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.6 && !finPie);
        }
    }
    window.addEventListener("scroll", alDesplazar, { passive: true });
    alDesplazar();

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            const abierto = navLinks.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(abierto));
        });
        navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
            navLinks.classList.remove("is-open");
            navToggle.setAttribute("aria-expanded", "false");
        }));
    }

    // Botones de imprimir (en la ficha técnica)
    document.addEventListener("click", e => {
        if (e.target.closest("[data-imprimir]")) window.print();
    });

    // ---------- Cuentas regresivas ----------
    const R = window.RUTA_2;
    const H = window.RutaHorario;
    const F = window.Formato;
    window.actualizarLlegadas = function () {
        if (!R || !H) return;
        R.paradas.forEach(p => {
            const e = H.estado(p.id);
            const llegando = !!(e && e.enParada);
            // fuera de servicio (22:00 a 6:00) se muestra la hora de la primera combi
            const texto = !e ? "—" : !e.servicio ? `${F.horaDia(e.llegada)}` : llegando ? "En parada" : F.reloj(e.segundos);
            document.querySelectorAll(`[data-eta="${p.id}"]`).forEach(el => { el.textContent = texto; });
            document.querySelectorAll(`[data-fila="${p.id}"], [data-eta-caja="${p.id}"]`).forEach(el => el.classList.toggle("is-llegando", llegando));
        });
    };
    window.actualizarLlegadas();
    setInterval(window.actualizarLlegadas, 1000);

    document.querySelectorAll("[data-frecuencia]").forEach(el => { el.textContent = H ? H.frecuencia : 10; });
})();
