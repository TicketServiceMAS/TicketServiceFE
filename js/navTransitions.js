

function enablePageTransition() {

    requestAnimationFrame(() => {
        document.body.classList.add("page-loaded");
    });


    const navLinks = document.querySelectorAll(".topbar-nav .nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (!href) return;

            const current = window.location.pathname.split("/").pop() || "index.html";
            const target = href.split("/").pop() || href;
            if (current === target) return;

            e.preventDefault();

            document.body.classList.remove("page-loaded");
            document.body.classList.add("page-leaving");

            const onEnd = () => {
                document.body.removeEventListener("transitionend", onEnd);
                window.location.href = href;
            };

            setTimeout(onEnd, 250);

            document.body.addEventListener("transitionend", onEnd);
        });
    });
}

window.addEventListener("DOMContentLoaded", enablePageTransition);
