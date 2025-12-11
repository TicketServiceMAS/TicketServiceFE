const AUTH_BASE_URL = "http://localhost:8080";
// .idea/js/login.js

// Simpel "fake" auth-funktion – kan senere skiftes til rigtig backend
/*async function fakeAuthenticate(username, password) {
    // Simuler lidt netværksdelay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Demo-bruger
    if (username === "admin" && password === "admin123") {
        return {
            token: "dev-fake-token-123",
            user: {
                username: "admin",
                displayName: "Administrator"
            }
        };
    }*/
async function fakeAuthenticate(username, password) {
    const res = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
        throw new Error("Forkert brugernavn eller adgangskode.");
    }

    // Backend returns a plain string, not JSON
    const token = await res.text();

    return {
        token,
        user: { username } // optionally request user info later
    };
}



function setLoginMessage(type, text) {
    const msgEl = document.getElementById("loginMessage");
    if (!msgEl) return;

    if (!text) {
        msgEl.textContent = "";
        msgEl.className = "login-message";
        return;
    }

    msgEl.textContent = text;

    if (type === "error") {
        msgEl.className = "login-message login-message-error";
    } else if (type === "success") {
        msgEl.className = "login-message login-message-success";
    } else {
        msgEl.className = "login-message";
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const btn = document.getElementById("loginBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");

        const username = usernameInput?.value.trim();
        const password = passwordInput?.value ?? "";

        if (!username || !password) {
            setLoginMessage("error", "Udfyld både brugernavn og adgangskode.");
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Logger ind...";
            }
            setLoginMessage(null, "");

            // LIGE NU: fake login
            const result = await fakeAuthenticate(username, password);

            // Gem "token" og brugerinfo i localStorage
            sessionStorage.setItem("authToken", result.token);
            sessionStorage.setItem("currentUser", JSON.stringify(result.user));

            setLoginMessage("success", "Login lykkedes – omdirigerer...");

            // Redirect til dashboard
            setTimeout(() => {
                window.location.href = "index.html";
            }, 600);
        } catch (err) {
            setLoginMessage("error", err.message || "Login fejlede.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Login";
            }
        }
    });
});

/*
 * NÅR I SENERE FÅR BACKEND:
 *
 * 1) Slet fakeAuthenticate ovenfor
 * 2) Erstat i submit-handler:
 *
 *    const result = await fakeAuthenticate(username, password);
 *
 *    med fx:
 *
 *    const r = await fetch("http://localhost:8080/api/auth/login", {
 *        method: "POST",
 *        headers: { "Content-Type": "application/json" },
 *        body: JSON.stringify({ username, password })
 *    });
 *
 *    if (!r.ok) throw new Error("Login fejlede");
 *    const result = await r.json();
 *
 * 3) Sørg for at backend returnerer { token, user: { ... } }
 */
