import {
    getDepartmentTicketList,
    markTicketAsMisrouted,
    markTicketAsCorrect,
    updateTicketPriority
} from "./api.js";

import { SELECTED_DEPARTMENT_ID } from "./config.js";

/* ============================================================
   AUTH
============================================================ */

const AUTH_USER_KEY = "currentUser";

function getCurrentUser() {
    try {
        const raw = sessionStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function getCurrentUserRole() {
    const u = getCurrentUser();
    if (!u || !u.username) return "user";
    return u.username === "admin" ? "admin" : "user";
}

function isAdmin() {
    return getCurrentUserRole() === "admin";
}

/* ============================================================
   UTILS
============================================================ */

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("da-DK");
}

/* PRIORITET → P1/P2/P3/SIMA */
function normalizeTicket(t) {
    const raw = t.priority?.priorityName || t.priority || "";

    let priority;
    switch (String(raw).toUpperCase()) {
        case "1":
        case "P1":
            priority = "P1";
            break;
        case "2":
        case "P2":
            priority = "P2";
            break;
        case "3":
        case "P3":
            priority = "P3";
            break;
        case "4":
        case "SIMA":
            priority = "SIMA";
            break;
        default:
            priority = "P3"; // fallback
    }

    return {
        id: t.metricsDepartmentID ?? t.id ?? t.ticketId ?? "Ukendt",
        status: (t.status || "").toUpperCase(),
        subject: t.subject || "(Ingen subject)",
        date: t.date,
        priority
    };
}

/* ============================================================
   LOAD TICKETS
============================================================ */

let allTickets = [];

export async function loadTicketList(departmentId) {
    const container = document.getElementById("ticket-list");
    if (!container) return;

    const dept = departmentId ?? SELECTED_DEPARTMENT_ID;

    container.innerHTML = `
        <p style="padding:10px 0;font-size:0.9rem;color:#6b7280;">
            Indlæser tickets for department #${dept}...
        </p>
    `;

    try {
        const raw = await getDepartmentTicketList(dept);

        allTickets = Array.isArray(raw)
            ? raw.map(normalizeTicket)
            : (raw.tickets || []).map(normalizeTicket);

        if (!allTickets.length) {
            container.innerHTML = `<p>Ingen tickets fundet.</p>`;
            return;
        }

        renderList(container);

    } catch (err) {
        container.innerHTML = `
            <p style="color:#b91c1c;">
                Fejl ved hentning af tickets.<br>${err.message}
            </p>
        `;
    }
}

/* ============================================================
   RENDER LIST
============================================================ */

function renderList(container) {
    const admin = isAdmin();

    container.innerHTML = `
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Prioritet</th>
                    <th>Subject</th>
                    <th>Dato</th>
                    <th>Handling</th>
                </tr>
            </thead>
            <tbody>
                ${allTickets.map(t => renderRow(t, admin)).join("")}
            </tbody>
        </table>
    `;

    attachHandlers(container, admin);
}

function renderRow(t, admin) {
    const isFailure = t.status === "FAILURE";

    return `
        <tr>
            <td>#${t.id}</td>

            <td>
                <span class="ticket-status ${isFailure ? "status-failure" : "status-success"}">
                    ${t.status}
                </span>
            </td>

            <td>
                ${admin ? renderPrioritySelector(t) : renderPriorityBadge(t.priority)}
            </td>

            <td>${t.subject}</td>
            <td>${formatDate(t.date)}</td>

            <td>
                ${admin
        ? renderAdminActions(t, isFailure)
        : '<span class="ticket-no-permission">Ingen rettighed</span>'}
            </td>
        </tr>
    `;
}

/* ============================================================
   PRIORITY SELECTOR (ADMIN)
============================================================ */

function renderPrioritySelector(t) {
    return `
        <select class="priority-select" data-ticket-id="${t.id}">
            <option value="1" ${t.priority === "P1" ? "selected" : ""}>P1</option>
            <option value="2" ${t.priority === "P2" ? "selected" : ""}>P2</option>
            <option value="3" ${t.priority === "P3" ? "selected" : ""}>P3</option>
            <option value="4" ${t.priority === "SIMA" ? "selected" : ""}>SIMA</option>
        </select>

        <button class="update-priority-btn" data-ticket-id="${t.id}">
            Opdater
        </button>
    `;
}

/* ============================================================
   PRIORITY BADGE (ikke-admin)
============================================================ */

function renderPriorityBadge(p) {
    return `
        <span class="priority-badge priority-${p.toLowerCase()}">
            ${p}
        </span>
    `;
}

/* ============================================================
   ROUTING ACTION BUTTONS (ADMIN)
============================================================ */

function renderAdminActions(t, isFailure) {
    return `
        <button
            class="ticket-flag-button ${isFailure ? "flag-correct" : "flag-wrong"}"
            data-ticket-id="${t.id}"
            data-is-failure="${isFailure}"
        >
            ${isFailure ? "Marker som korrekt" : "Marker som forkert"}
        </button>
    `;
}

/* ============================================================
   EVENT HANDLERS
============================================================ */

function attachHandlers(container, admin) {
    if (!admin) return;

    /* PRIORITY UPDATE */
    container.querySelectorAll(".update-priority-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const ticketId = btn.dataset.ticketId;

            const select = container.querySelector(
                `.priority-select[data-ticket-id="${ticketId}"]`
            );

            const newPriority = select.value;

            btn.disabled = true;
            btn.textContent = "Opdaterer...";

            try {
                await updateTicketPriority(ticketId, newPriority);
                alert("Prioritet opdateret!");
                location.reload();
            } catch (e) {
                alert("Fejl ved opdatering af prioritet.");
                console.error(e);
            }
        });
    });

    /* ROUTING STATUS UPDATE */
    container.querySelectorAll(".ticket-flag-button").forEach(btn => {
        btn.addEventListener("click", async () => {
            const ticketId = btn.dataset.ticketId;
            const isFailure = btn.dataset.isFailure === "true";

            const ok = window.confirm(
                isFailure
                    ? `Markér ticket #${ticketId} som KORREKT?`
                    : `Markér ticket #${ticketId} som FORKERT routed?`
            );
            if (!ok) return;

            btn.disabled = true;
            btn.textContent = "Opdaterer...";

            try {
                if (isFailure) {
                    await markTicketAsCorrect(ticketId);
                } else {
                    await markTicketAsMisrouted(ticketId);
                }
                location.reload();
            } catch (e) {
                alert("Fejl ved opdatering af routing-status.");
                console.error(e);
            }
        });
    });
}
