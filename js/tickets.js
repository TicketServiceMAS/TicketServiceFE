import {
    getDepartmentTicketList,
    markTicketAsMisrouted,
    markTicketAsCorrect,
    updateTicketPriority
} from "./api.js";

import { SELECTED_DEPARTMENT_ID } from "./config.js";

/* ===================================================== */
/* STATE */
/* ===================================================== */

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

/* ===================================================== */
/* AUTH */
/* ===================================================== */

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

/* ===================================================== */
/* HELPERS */
/* ===================================================== */

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("da-DK");
}

/**
 * Mapper alle mulige priority-felter til en af:
 *  - "P1", "P2", "P3" eller "SIMA"
 */
function mapPriorityToCode(priorityRaw) {
    if (!priorityRaw) return "P3"; // default

    let value = priorityRaw;

    // Hvis backend sender et objekt, prøv at trække en tekstværdi ud
    if (typeof value === "object" && value !== null) {
        const candidate =
            value.code ??
            value.name ??
            value.label ??
            value.priority ??
            value.priorityLevel ??
            value.severity ??
            value.priority_name;

        if (candidate) {
            value = candidate;
        } else {
            value = String(value);
        }
    }

    const v = String(value).toLowerCase().trim();

    // Direkte match
    if (["p1", "prio1", "priority1", "1"].includes(v)) return "P1";
    if (["p2", "prio2", "priority2", "2"].includes(v)) return "P2";
    if (["p3", "prio3", "priority3", "3"].includes(v)) return "P3";
    if (["sima", "sima-ticket", "sima support"].includes(v)) return "SIMA";

    // Teksttyper → mappes til P1–P3
    if (["kritisk", "critical", "urgent", "høj", "hoej", "high"].includes(v)) return "P1";
    if (["medium", "mellem", "normal"].includes(v)) return "P2";
    if (["lav", "low"].includes(v)) return "P3";

    // Hvis der allerede står P1/P2/P3/SIMA i en eller anden casing
    const upper = String(value).toUpperCase().trim();
    if (["P1", "P2", "P3", "SIMA"].includes(upper)) return upper;

    // Fallback
    return "P3";
}

function formatPriority(raw) {
    return mapPriorityToCode(raw);
}

function normalizePriority(p) {
    // Bruges til nøgler i filter-state/counts (lowercase)
    return mapPriorityToCode(p).toLowerCase(); // "p1", "p2", "p3", "sima"
}

function getStorageKey(departmentId) {
    return String(departmentId ?? SELECTED_DEPARTMENT_ID ?? "all");
}

// Mapper P1/P2/P3/SIMA → backend priorityId
// JUSTÉR denne hvis jeres API bruger andre ID'er.
function mapPriorityCodeToId(code) {
    switch (code) {
        case "P1": return 1;
        case "P2": return 2;
        case "P3": return 3;
        case "SIMA": return 4;
        default: return 3;
    }
}

/* ===================================================== */
/* FILTER STATE STORAGE */
/* ===================================================== */

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

/* ===================================================== */
/* LOAD */
/* ===================================================== */

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

/* ===================================================== */
/* NORMALIZATION */
/* ===================================================== */

function normalizeTicket(t) {
    return {
        id: t.metricsDepartmentID ?? t.id ?? t.ticketId ?? "Ukendt",
        status: (t.status ?? t.routingStatus ?? "").toUpperCase(),
        subject: t.subject ?? t.title ?? "",
        content: t.content ?? t.body ?? t.mailContent ?? t.message ?? "",
        date: t.createdAt ?? t.date,
        // altid P1 / P2 / P3 / SIMA
        priority: formatPriority(
            t.priority ?? t.priorityLevel ?? t.severity ?? t.priority_name
        )
    };
}

function getNormalizedTickets() {
    return allTickets.map(normalizeTicket);
}

function findNormalizedTicketById(ticketId) {
    const normalized = getNormalizedTickets();
    return normalized.find(t => String(t.id) === String(ticketId)) || null;
}

/* ===================================================== */
/* FILTERING */
/* ===================================================== */

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

/* ===================================================== */
/* COUNTS */
/* ===================================================== */

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
        const key = normalizePriority(t.priority); // "p1"/"p2"/"p3"/"sima"
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}

/* ===================================================== */
/* PAGINATION */
/* ===================================================== */

function paginate(tickets) {
    const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    return {
        totalPages,
        pageTickets: tickets.slice(start, start + PAGE_SIZE)
    };
}

/* ===================================================== */
/* MODAL (MAIL CONTENT) */
/* ===================================================== */

function ensureModalWired() {
    const modal = document.getElementById("ticketModal");
    if (!modal) return;

    // Kun wire én gang
    if (modal.dataset.wired === "true") return;
    modal.dataset.wired = "true";

    const closeBtn = modal.querySelector("[data-ticket-modal-close]");
    closeBtn?.addEventListener("click", closeTicketModal);

    // klik på overlay (udenfor dialog) lukker
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeTicketModal();
    });

    // ESC lukker
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
            closeTicketModal();
        }
    });
}

function openTicketModal(ticket) {
    ensureModalWired();

    const modal = document.getElementById("ticketModal");
    if (!modal) return;

    const idEl = document.getElementById("ticketModalId");
    const subjectEl = document.getElementById("ticketModalSubject");
    const metaEl = document.getElementById("ticketModalMeta");
    const bodyEl = document.getElementById("ticketModalBody");

    if (idEl) idEl.textContent = `#${ticket.id}`;
    if (subjectEl) subjectEl.textContent = ticket.subject || "(ingen subject)";
    if (metaEl) metaEl.textContent = `${ticket.status || ""} • ${ticket.priority || ""} • ${formatDate(ticket.date) || ""}`;

    // Render content som tekst (XSS-sikkert)
    if (bodyEl) {
        bodyEl.textContent = ticket.content || "(intet indhold)";
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function closeTicketModal() {
    const modal = document.getElementById("ticketModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
}

/* ===================================================== */
/* UI BUILDERS */
/* ===================================================== */

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
    const priorityOptions = ["P1", "P2", "P3", "SIMA"];

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

        const priorityCell = canEdit
            ? `<select class="ticket-priority-select" data-ticket-id="${t.id}">
                                ${priorityOptions.map(p =>
                `<option value="${p}" ${t.priority === p ? "selected" : ""}>${p}</option>`
            ).join("")}
                           </select>`
            : t.priority;

        return `
                        <tr>
                            <td>#${t.id}</td>
                            <td><span class="ticket-status ${isFailure ? "status-failure" : "status-success"}">${t.status}</span></td>
                            <td>${priorityCell}</td>
                            <td>
                                <button class="ticket-open-btn"
                                        type="button"
                                        data-ticket-open-id="${t.id}">
                                    ${t.subject || "(ingen subject)"}
                                </button>
                            </td>
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
            </tbody>
        </table>
    `;
}

function renderCardRows(tickets) {
    const canEdit = canEditRouting();
    const priorityOptions = ["P1", "P2", "P3", "SIMA"];

    return tickets.map(t => {
        const isFailure = t.status === "FAILURE";

        const priorityRow = canEdit
            ? `<select class="ticket-priority-select" data-ticket-id="${t.id}">
                    ${priorityOptions.map(p =>
                `<option value="${p}" ${t.priority === p ? "selected" : ""}>${p}</option>`
            ).join("")}
               </select>`
            : t.priority;

        return `
            <div class="ticket-card">
                <div class="ticket-card-header">
                    <h3>Ticket #${t.id}</h3>
                    <button class="ticket-open-btn"
                            type="button"
                            data-ticket-open-id="${t.id}">
                        Åbn mail
                    </button>
                </div>
                <p><strong>Status:</strong> ${t.status}</p>
                <p><strong>Prioritet:</strong> ${priorityRow}</p>
                <p><strong>Subject:</strong> ${t.subject || "(ingen subject)"}</p>
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

/* ===================================================== */
/* RENDER */
/* ===================================================== */

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
    attachPriorityChangeHandlers(container);
    attachOpenTicketHandlers(container);
}

/* ===================================================== */
/* CHIPS */
/* ===================================================== */

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
        prioEl.innerHTML = "";

        const priorities = [
            { value: "", label: "Alle" },
            { value: "p1", label: "P1" },
            { value: "p2", label: "P2" },
            { value: "p3", label: "P3" },
            { value: "sima", label: "SIMA" }
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

/* ===================================================== */
/* EVENTS */
/* ===================================================== */

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

/* ===================================================== */
/* OPEN TICKET (SHOW MAIL CONTENT) */
/* ===================================================== */

function attachOpenTicketHandlers(container) {
    const results = container.querySelector("#ticket-results");
    if (!results) return;

    // Event delegation
    results.addEventListener("click", (e) => {
        const target = e.target;

        // Hvis man klikker på knapper/dropdowns der ikke skal åbne modal
        if (target.closest(".ticket-flag-button")) return;
        if (target.closest(".ticket-priority-select")) return;

        const openBtn = target.closest("[data-ticket-open-id]");
        if (!openBtn) return;

        const ticketId = openBtn.getAttribute("data-ticket-open-id");
        if (!ticketId) return;

        const ticket = findNormalizedTicketById(ticketId);
        if (!ticket) return;

        openTicketModal(ticket);
    });
}

/* ===================================================== */
/* ACTION BUTTONS */
/* ===================================================== */

function attachFlagButtonHandlers(container) {
    container.querySelectorAll(".ticket-flag-button").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.ticketId;
            const isFailure = btn.dataset.isFailure === "true";
            if (!confirm("Er du sikker?")) return;
            isFailure ? await markTicketAsCorrect(id) : await markTicketAsMisrouted(id);
            location.reload();
        });
    });
}

/**
 * Kun admin: ændre prioritet via dropdown.
 */
function attachPriorityChangeHandlers(container) {
    if (!canEditRouting()) return;

    container.querySelectorAll(".ticket-priority-select").forEach(select => {
        select.addEventListener("change", async () => {
            const ticketId = select.dataset.ticketId;
            const newCode = select.value; // P1 / P2 / P3 / SIMA
            const priorityId = mapPriorityCodeToId(newCode);

            const prevDisabled = select.disabled;
            select.disabled = true;

            try {
                await updateTicketPriority(ticketId, priorityId);

                // Opdatér lokal state så filtre m.m. stadig passer
                const rawTicket = allTickets.find(t =>
                    String(t.metricsDepartmentID ?? t.id ?? t.ticketId ?? "Ukendt") === String(ticketId)
                );
                if (rawTicket) {
                    rawTicket.priority = newCode;
                }
            } catch (err) {
                console.error(err);
                alert("Kunne ikke opdatere prioritet: " + (err?.message || err));
            } finally {
                select.disabled = prevDisabled;
            }
        });
    });
}
