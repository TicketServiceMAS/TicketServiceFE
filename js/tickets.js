import {
    getDepartmentTicketList,
    markTicketAsMisrouted,
    markTicketAsCorrect,
    updateTicketPriority
} from "./api.js";

import { SELECTED_DEPARTMENT_ID } from "./config.js";

const PAGE_SIZE = 10;

let allTickets = [];
let filters = {
    search: "",
    status: "",
    routing: "",
    priority: ""
};

let currentPage = 1;
let currentView = "table";
let activeDepartmentKey = null;

const FILTER_STORAGE_KEY = "departmentTicketFilters";

const AUTH_USER_KEY = "currentUser";

/* ============================================================
   AUTH

const AUTH_USER_KEY = "currentUser";

function getCurrentUser() {
    try {
        const raw = sessionStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function canEditRouting() {
    const user = getCurrentUser();
    return user?.username === "admin";
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("da-DK");
}

function formatPriority(raw) {
    if (!raw) return "Normal";
    const s = String(raw).trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Normal";
}

function normalizePriority(p) {
    return (p || "Normal").toLowerCase();
}

function getStorageKey(departmentId) {
    return String(departmentId ?? SELECTED_DEPARTMENT_ID ?? "all");
}

function loadSavedFilters(departmentId) {
    try {
        const raw = localStorage.getItem(FILTER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw)?.[getStorageKey(departmentId)] ?? null;
    } catch {
        return null;
    }
}

function persistFilters() {
    if (!activeDepartmentKey) return;
    try {
        const raw = localStorage.getItem(FILTER_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[activeDepartmentKey] = {
            filters,
            currentView,
            currentPage
        };
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(parsed));
    } catch { }
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

let allTickets = [];

export async function loadTicketList(departmentId) {
    const container = document.getElementById("ticket-list");
    if (!container) return;

    const depId = departmentId ?? SELECTED_DEPARTMENT_ID;
    activeDepartmentKey = getStorageKey(depId);

    container.innerHTML = "Indlæser tickets…";

    try {
        const data = await getDepartmentTicketList(depId);
        allTickets = Array.isArray(data)
            ? data
            : Array.isArray(data?.tickets)
                ? data.tickets
                : [];

        const saved = loadSavedFilters(depId);
        if (saved) {
            filters = saved.filters || filters;
            currentView = saved.currentView || currentView;
            currentPage = saved.currentPage || 1;
        }

        renderTicketList(container);
    } catch (e) {
        console.error(e);
        container.innerHTML = "Kunne ikke hente tickets.";
    }
}

function normalizeTicket(t) {
    return {
        id: t.metricsDepartmentID ?? t.id ?? t.ticketId ?? "Ukendt",
        status: (t.status ?? t.routingStatus ?? "").toUpperCase(),
        subject: t.subject ?? t.title ?? "",
        date: t.createdAt ?? t.date,
        priority: formatPriority(
            t.priority ?? t.priorityLevel ?? t.severity ?? t.priority_name
        )
    };
}

function getNormalizedTickets() {
    return allTickets.map(normalizeTicket);
}

function matchesFilters(t) {
    if (filters.search) {
        const term = filters.search.toLowerCase();
        if (
            !`${t.id}`.toLowerCase().includes(term) &&
            !t.subject.toLowerCase().includes(term)
        ) return false;
    }

    if (filters.status && t.status !== filters.status) return false;

    if (filters.routing) {
        const isFailure = t.status === "FAILURE";
        if (filters.routing === "correct" && isFailure) return false;
        if (filters.routing === "incorrect" && !isFailure) return false;
    }

    if (filters.priority &&
        normalizePriority(t.priority) !== filters.priority) return false;

    return true;
}

function buildStatusCounts(tickets) {
    const counts = { "": tickets.length };
    tickets.forEach(t => {
        counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
}

function buildPriorityCounts(tickets) {
    const counts = { "": tickets.length };
    tickets.forEach(t => {
        const key = normalizePriority(t.priority);
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}

function paginate(tickets) {
    const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    return {
        totalPages,
        pageTickets: tickets.slice(start, start + PAGE_SIZE)
    };
}

function buildFilterBar(statuses) {
    return `
        <div class="ticket-controls">
            <div class="ticket-filters">
                <input class="ticket-filter-input"
                       id="ticketSearchInput"
                       placeholder="Søg efter ticket eller subject…"
                       value="${filters.search}">
                <select class="ticket-filter-select" id="ticketStatusFilter">
                    <option value="">Alle statusser</option>
                    ${statuses.map(s =>
        `<option value="${s}" ${filters.status === s ? "selected" : ""}>${s}</option>`
    ).join("")}
                </select>
                <select class="ticket-filter-select" id="ticketRoutingFilter">
                    <option value="">Alle routingtyper</option>
                    <option value="correct" ${filters.routing === "correct" ? "selected" : ""}>Korrekt routing</option>
                    <option value="incorrect" ${filters.routing === "incorrect" ? "selected" : ""}>Forkert routing</option>
                </select>
            </div>
            <div class="ticket-view-toggle">
                <button class="view-toggle-btn ${currentView === "table" ? "active" : ""}" data-view="table">Tabel</button>
                <button class="view-toggle-btn ${currentView === "card" ? "active" : ""}" data-view="card">Kort</button>
            </div>
        </div>
    `;
}

function renderTableRows(tickets) {
    const canEdit = canEditRouting();

    return `
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>ID</th><th>Status</th><th>Prioritet</th>
                    <th>Subject</th><th>Dato</th><th>Handling</th>
                </tr>
            </thead>
            <tbody>
                ${tickets.map(t => {
        const isFailure = t.status === "FAILURE";
        return `
                        <tr>
                            <td>#${t.id}</td>
                            <td><span class="ticket-status ${isFailure ? "status-failure" : "status-success"}">${t.status}</span></td>
                            <td>${t.priority}</td>
                            <td>${t.subject}</td>
                            <td>${formatDate(t.date)}</td>
                            <td>
                                ${canEdit
            ? `<button class="ticket-flag-button ${isFailure ? "flag-correct" : "flag-wrong"}"
                                        data-ticket-id="${t.id}"
                                        data-is-failure="${isFailure}">
                                        ${isFailure ? "Marker som korrekt routing" : "Marker som forkert routing"}
                                       </button>`
            : `<span class="ticket-no-permission">Ingen rettighed</span>`}
                            </td>
                        </tr>`;
    }).join("")}
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

function renderCardRows(tickets) {
    const canEdit = canEditRouting();

    return tickets.map(t => {
        const isFailure = t.status === "FAILURE";
        return `
            <div class="ticket-card">
                <h3>Ticket #${t.id}</h3>
                <p><strong>Status:</strong> ${t.status}</p>
                <p><strong>Prioritet:</strong> ${t.priority}</p>
                <p><strong>Subject:</strong> ${t.subject}</p>
                <p><strong>Dato:</strong> ${formatDate(t.date)}</p>
                ${canEdit
            ? `<button class="ticket-flag-button ${isFailure ? "flag-correct" : "flag-wrong"}"
                        data-ticket-id="${t.id}"
                        data-is-failure="${isFailure}">
                        ${isFailure ? "Marker som korrekt routing" : "Marker som forkert routing"}
                       </button>`
            : ""}
            </div>
        `;
    }).join("");
}

function renderTicketList(container) {
    const normalized = getNormalizedTickets();
    const filtered = normalized.filter(matchesFilters);

    const statuses = [...new Set(normalized.map(t => t.status))];
    const statusCounts = buildStatusCounts(normalized);
    const priorityCounts = buildPriorityCounts(normalized);

    const { totalPages, pageTickets } = paginate(filtered);

    container.innerHTML = `
        ${buildFilterBar(statuses)}
        <div id="ticket-results">
            ${currentView === "table"
        ? renderTableRows(pageTickets)
        : renderCardRows(pageTickets)}
        </div>
        <div class="ticket-pagination">
            <button class="pagination-btn" data-dir="prev" ${currentPage === 1 ? "disabled" : ""}>Forrige</button>
            <span>Side ${currentPage} af ${totalPages}</span>
            <button class="pagination-btn" data-dir="next" ${currentPage === totalPages ? "disabled" : ""}>Næste</button>
        </div>
    `;

    renderFilterChips(statuses, statusCounts, priorityCounts);
    wireUpInteractions(container, totalPages);
    attachFlagButtonHandlers(container);
}

function renderFilterChips(statuses, statusCounts, priorityCounts) {
    const statusEl = document.getElementById("statusChipContainer");
    const prioEl = document.getElementById("priorityChipContainer");

    if (statusEl) {
        statusEl.innerHTML = ["", ...statuses].map(s => `
            <button class="ticket-chip ${filters.status === s ? "ticket-chip-active" : ""}"
                    data-type="status"
                    data-value="${s}">
                ${s || "Alle"}
                <span class="ticket-chip-count">${statusCounts[s || ""] ?? 0}</span>
            </button>
        `).join("");
    }

    if (prioEl) {
        // ✅ VIGTIGT: RYD FØRST
        prioEl.innerHTML = "";

        const priorities = [
            { value: "", label: "Alle" },
            { value: "høj", label: "Høj" },
            { value: "normal", label: "Normal" },
            { value: "lav", label: "Lav" }
        ];

        prioEl.innerHTML = priorities.map(p => `
            <button class="ticket-chip ${filters.priority === p.value ? "ticket-chip-active" : ""}"
                    data-type="priority"
                    data-value="${p.value}">
                ${p.label}
                <span class="ticket-chip-count">${priorityCounts[p.value] ?? 0}</span>
            </button>
        `).join("");
    }
}

function wireUpInteractions(container, totalPages) {
    container.querySelector("#ticketSearchInput")?.addEventListener("input", e => {
        filters.search = e.target.value;
        currentPage = 1;
        persistFilters();
        renderTicketList(container);
    });

    container.querySelector("#ticketStatusFilter")?.addEventListener("change", e => {
        filters.status = e.target.value;
        currentPage = 1;
        persistFilters();
        renderTicketList(container);
    });

    container.querySelector("#ticketRoutingFilter")?.addEventListener("change", e => {
        filters.routing = e.target.value;
        currentPage = 1;
        persistFilters();
        renderTicketList(container);
    });

    container.querySelectorAll(".pagination-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage += btn.dataset.dir === "next" ? 1 : -1;
            persistFilters();
            renderTicketList(container);
        });
    });

    container.querySelectorAll(".view-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentView = btn.dataset.view;
            persistFilters();
            renderTicketList(container);
        });
    });

    document.getElementById("ticketChipRow")?.addEventListener("click", e => {
        const btn = e.target.closest(".ticket-chip");
        if (!btn) return;
        filters[btn.dataset.type] = btn.dataset.value || "";
        currentPage = 1;
        persistFilters();
        renderTicketList(container);
    });
}

function attachFlagButtonHandlers(container) {
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

function renderPriorityBadge(p) {
    return `
        <span class="priority-badge priority-${p.toLowerCase()}">
            ${p}
        </span>
    `;
}

/* ============================================================
   ROUTING ACTION BUTTONS (ADMIN)

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
            const id = btn.dataset.ticketId;
            const isFailure = btn.dataset.isFailure === "true";
            if (!confirm("Er du sikker?")) return;
            isFailure ? await markTicketAsCorrect(id) : await markTicketAsMisrouted(id);
            location.reload();

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
