// theme.js
// Dark/light tema + logout + settings-menu-opsætning

/* ================= TEMA / DARK MODE ================= */

export function applyTheme(theme) {
    const body = document.body;
    if (theme === "dark") {
        body.setAttribute("data-theme", "dark");
    } else {
        body.removeAttribute("data-theme");
    }
}

export function initTheme() {
    let saved = null;
    try {
        saved = window.localStorage.getItem("appTheme");
    } catch (_) {}

    if (saved !== "dark" && saved !== "light") {
        saved = "light";
    }

    applyTheme(saved);
}

export function toggleTheme() {
    let current = "light";
    try {
        current = window.localStorage.getItem("appTheme") || "light";
    } catch (_) {}

    const next = current === "light" ? "dark" : "light";

    try {
        window.localStorage.setItem("appTheme", next);
    } catch (_) {}

    applyTheme(next);
}

/* ================= LOGOUT ================= */

export function handleLogout() {
    try {
        window.localStorage.removeItem("authToken");
        window.localStorage.removeItem("currentUser");
    } catch (_) {}

    window.location.href = "./login.html";
}

/* ================= SETTINGS-MENU (tandhjul) ================= */

export function setupSettingsMenu() {
    const btn = document.getElementById("settingsButton");
    const dropdown = document.getElementById("settingsDropdown");

    if (!btn || !dropdown) return;

    function openMenu() {
        dropdown.classList.add("settings-dropdown-open");
        btn.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        dropdown.classList.remove("settings-dropdown-open");
        btn.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
        const isOpen = dropdown.classList.contains("settings-dropdown-open");
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = e.target.closest(".settings-item");
        if (!item) return;

        const action = item.dataset.setting;

        switch (action) {
            case "refresh":
                window.location.reload();
                break;
            case "theme":
                toggleTheme();
                break;
            case "logout":
                handleLogout();
                break;
            default:
                break;
        }

        closeMenu();
    });

    document.addEventListener("click", () => {
        closeMenu();
    });
}
