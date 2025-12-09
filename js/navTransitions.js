// navTransitions.js
// Simpel side-fade når man skifter mellem Dashboard / Departments osv.

function enablePageTransition() {
    // Når siden er klar -> fade ind
    requestAnimationFrame(() => {
        document.body.classList.add("page-loaded");
    });

    // Find alle links i topbaren
    const navLinks = document.querySelectorAll(".topbar-nav .nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (!href) return;

            // Hvis man allerede ER på denne side, så lad bare være
            const current = window.location.pathname.split("/").pop() || "index.html";
            const target = href.split("/").pop() || href;
            if (current === target) return;

            e.preventDefault();

            // Fade ud
            document.body.classList.remove("page-loaded");
            document.body.classList.add("page-leaving");

            // Når transition er færdig → skift side
            const onEnd = () => {
                document.body.removeEventListener("transitionend", onEnd);
                window.location.href = href;
            };

            // Fallback hvis transitionend ikke bliver fired
            setTimeout(onEnd, 250);

            document.body.addEventListener("transitionend", onEnd);
        });
    });
}

window.addEventListener("DOMContentLoaded", enablePageTransition);
