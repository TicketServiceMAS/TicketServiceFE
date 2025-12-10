import { getDepartmentTicketList, markTicketAsMisrouted } from "./api.js";
import { SELECTED_DEPARTMENT_ID } from "./config.js";

const PAGE_SIZE = 10;
let allTickets = [];
let filters = {
    search: "",
    status: "",
    routing: "",
    priority: "",
};
let currentPage = 1;
let currentView = "table";
let activeDepartmentKey = null;

const FILTER_STORAGE_KEY = "departmentTicketFilters";

function getStatusChipTone(status = "") {
    const normalized = status.toLowerCase();
    if (normalized.includes("success")) return "tone-success";
    if (normalized.includes("default")) return "tone-warning";
    if (normalized.includes("fail")) return "tone-danger";
    return "tone-neutral";
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("da-DK");
}

function formatPriority(raw) {
    if (!raw) return "Normal";
    const str = String(raw).trim();
    if (!str) return "Normal";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStorageKey(departmentId) {
    const id = departmentId ?? SELECTED_DEPARTMENT_ID;
    return String(id ?? "all");
}

function loadSavedFilters(departmentId) {
    try {
        const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const key = getStorageKey(departmentId);
        return parsed?.[key] ?? null;
    } catch (err) {
        console.warn("Kunne ikke læse filter-tilstand", err);
        return null;
    }
}

function persistFilters() {
    if (!activeDepartmentKey) return;

    try {
        const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};

        parsed[activeDepartmentKey] = {
            filters,
            currentView,
            currentPage
        };

        window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(parsed));
    } catch (err) {
        console.warn("Kunne ikke gemme filter-tilstand", err);
    }
}

export async function loadTicketList(departmentId) {
    const container = document.getElementById("ticket-list");
    if (!container) return;

    const activeDepartment = departmentId ?? SELECTED_DEPARTMENT_ID;
    activeDepartmentKey = getStorageKey(activeDepartment);
    if (!activeDepartment) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <div style="padding:10px 0;font-size:0.9rem;color:#6b7280;">
            Indlæser tickets for department #${activeDepartment}...
        </div>
    `;

    try {
        const data = await getDepartmentTicketList(activeDepartment);

        let tickets;
        if (Array.isArray(data)) {
            tickets = data;
        } else if (data && Array.isArray(data.tickets)) {
            tickets = data.tickets;
        } else {
            tickets = [];
        }

        allTickets = tickets;
        const savedFilters = loadSavedFilters(activeDepartment);
        filters = savedFilters?.filters || { search: "", status: "", routing: "", priority: "" };
        currentView = savedFilters?.currentView || currentView || "table";
        currentPage = savedFilters?.currentPage || 1;

        if (!tickets.length) {
            container.innerHTML = `
                <div style="padding:12px 0;font-size:0.9rem;color:#6b7280;">
                    Der blev ikke fundet nogle tickets for dette department.
                </div>
            `;
            return;
        }

        renderTicketList(container);
    } catch (e) {
        console.error("Fejl ved hentning af tickets:", e);
        container.innerHTML = `
            <p style="color:#b91c1c;font-size:0.9rem;">
                Kunne ikke hente tickets for dette department.<br>
                <small>${e && e.message ? e.message : e}</small>
            </p>
        `;
    }
}

function buildFilterBar(statuses) {
    return `
        <div class="ticket-controls">
            <div class="ticket-filters">
                <input
                    type="search"
                    class="ticket-filter-input"
                    id="ticketSearchInput"
                    placeholder="Søg efter ticket eller subject..."
                    value="${filters.search}"
                />
                <select class="ticket-filter-select" id="ticketStatusFilter">
                    <option value="">Alle statusser</option>
                    ${statuses
                        .map(status => {
                            const active = filters.status === status ? "selected" : "";
                            return `<option value="${status}" ${active}>${status}</option>`;
                        })
                        .join("")}
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

function renderFilterChips(statuses, priorities, statusCounts, priorityCounts) {
    const statusContainer = document.getElementById("statusChipContainer");
    const priorityContainer = document.getElementById("priorityChipContainer");
    const chipRow = document.getElementById("ticketChipRow");

    if (chipRow) {
        chipRow.style.display = statuses.length ? "flex" : "none";
    }

    if (statusContainer) {
        const statusOptions = ["", ...statuses];
        statusContainer.innerHTML = statusOptions
            .map(status => {
                const label = status || "Alle";
                const isActive = filters.status === status;
                const count = statusCounts[status || ""] ?? 0;
                const toneClass = getStatusChipTone(status || "");
                return `<button class="ticket-chip ${toneClass} ${isActive ? "ticket-chip-active" : ""}" data-type="status" data-value="${status}">${label}<span class="ticket-chip-count">${count}</span></button>`;
            })
            .join("");
    }

    if (priorityContainer) {
        const defaultPriorities = ["Høj", "Normal", "Lav"];
        const uniquePriorities = Array.from(new Set(["", ...priorities, ...defaultPriorities]));
        priorityContainer.innerHTML = uniquePriorities
            .map(priority => {
                const label = priority || "Alle";
                const isActive = filters.priority.toLowerCase() === priority.toLowerCase();
                const countKey = priority || "Normal";
                const count = priority ? (priorityCounts[countKey] ?? 0) : (priorityCounts[""] ?? 0);
                return `<button class="ticket-chip ${isActive ? "ticket-chip-active" : ""}" data-type="priority" data-value="${priority}">${label}<span class="ticket-chip-count">${count}</span></button>`;
            })
            .join("");
    }

    const chipButtons = document.querySelectorAll("#ticketChipRow .ticket-chip");
    chipButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-type");
            const value = btn.getAttribute("data-value") || "";

            if (type === "status") {
                filters.status = value;
            }

            if (type === "priority") {
                filters.priority = value;
            }

            currentPage = 1;
            persistFilters();
            renderTicketList(document.getElementById("ticket-list"));
        });
    });
}

function renderTableRows(tickets) {
    return `
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Prioritet</th>
                    <th>Subject</th>
                    <th>Dato</th>
                    <th class="ticket-table-actions">Handling</th>
                </tr>
            </thead>
            <tbody>
                ${tickets
                    .map(t => {
                        const isFailure = t.status === "FAILURE";
                        return `
                            <tr class="ticket-table-row" data-ticket-id="${t.id}">
                                <td class="ticket-id">#${t.id}</td>
                                <td><span class="ticket-status ${isFailure ? "status-failure" : "status-success"}">${t.status}</span></td>
                                <td>${t.priority}</td>
                                <td>${t.subject}</td>
                                <td>${formatDate(t.date)}</td>
                                <td class="ticket-table-actions">
                                    <button
                                        class="ticket-flag-button"
                                        data-ticket-id="${t.id}"
                                        ${isFailure ? "disabled" : ""}
                                    >
                                        ${isFailure ? "Markeret som forkert" : "Marker som forkert routing"}
                                    </button>
                                </td>
                            </tr>
                        `;
                    })
                    .join("")}
            </tbody>
        </table>
    `;
}

function renderCardRows(tickets) {
    return tickets
        .map(t => {
            const isFailure = t.status === "FAILURE";
            return `
                <div class="ticket-card" data-ticket-id="${t.id}">
                    <div class="ticket-card-header">
                        <h3>Ticket #${t.id}</h3>
                        <button
                            class="ticket-flag-button"
                            data-ticket-id="${t.id}"
                            ${isFailure ? "disabled" : ""}
                        >
                            ${isFailure ? "Markeret som forkert" : "Marker som forkert routing"}
                        </button>
                    </div>
                    <p><strong>Status:</strong> ${t.status}</p>
                    <p><strong>Prioritet:</strong> ${t.priority}</p>
                    <p><strong>Subject:</strong> ${t.subject}</p>
                    <p><strong>Date:</strong> ${formatDate(t.date)}</p>
                </div>
            `;
        })
        .join('<hr class="ticket-divider">');
}

function normalizeTicket(ticket) {
    return {
        raw: ticket,
        id:
            ticket.metricsDepartmentID ??
            ticket.id ??
            ticket.ticketId ??
            ticket.ticketNumber ??
            "Ukendt",
        status: (ticket.status ?? ticket.routingStatus ?? "").toUpperCase() || "-",
        subject: ticket.subject ?? ticket.title ?? "(ingen subject)",
        date: ticket.createdAt ?? ticket.created_at ?? ticket.date,
        priority: formatPriority(ticket.priority || ticket.priorityLevel || ticket.severity || ticket.priority_name)
    };
}

function getNormalizedTickets() {
    return allTickets.map(normalizeTicket);
}

function matchesFilters(ticket, overrides = {}) {
    const { search, status, routing, priority } = { ...filters, ...overrides };
    const term = search.trim().toLowerCase();

    const matchesSearch = term
        ? `${ticket.id}`.toLowerCase().includes(term) || ticket.subject.toLowerCase().includes(term)
        : true;

    const matchesStatus = status
        ? ticket.status === status
        : true;

    const isMisrouted = ticket.status === "FAILURE";
    const matchesRouting = routing === "correct"
        ? !isMisrouted
        : routing === "incorrect"
            ? isMisrouted
            : true;

    const matchesPriority = priority
        ? (ticket.priority || "Normal").toLowerCase() === priority.toLowerCase()
        : true;

    return matchesSearch && matchesStatus && matchesRouting && matchesPriority;
}

function filterTickets() {
    return getNormalizedTickets().filter(ticket => matchesFilters(ticket));
}

function buildStatusCounts(tickets) {
    const base = tickets.filter(t => matchesFilters(t, { status: "" }));
    const counts = { "": base.length };

    base.forEach(t => {
        counts[t.status] = (counts[t.status] || 0) + 1;
    });

    return counts;
}

function buildPriorityCounts(tickets) {
    const base = tickets.filter(t => matchesFilters(t, { priority: "" }));
    const counts = { "": base.length };

    base.forEach(t => {
        const key = t.priority || "Normal";
        counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
}

function paginate(tickets) {
    const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    return {
        totalPages,
        pageTickets: tickets.slice(start, end)
    };
}

function renderTicketList(container) {
    const normalizedTickets = getNormalizedTickets();
    const filteredTickets = filterTickets();
    const uniqueStatuses = Array.from(
        new Set(normalizedTickets.map(t => t.status))
    ).filter(Boolean);
    const uniquePriorities = Array.from(
        new Set(normalizedTickets.map(t => t.priority))
    ).filter(Boolean);

    const statusCounts = buildStatusCounts(normalizedTickets);
    const priorityCounts = buildPriorityCounts(normalizedTickets);

    const { totalPages, pageTickets } = paginate(filteredTickets);

    const resultsHtml = currentView === "table"
        ? renderTableRows(pageTickets)
        : renderCardRows(pageTickets);

    renderFilterChips(uniqueStatuses, uniquePriorities, statusCounts, priorityCounts);

    container.innerHTML = `
        ${buildFilterBar(uniqueStatuses)}
        <div id="ticket-results">${resultsHtml}</div>
        <div class="ticket-pagination">
            <button class="pagination-btn" data-direction="prev" ${currentPage === 1 ? "disabled" : ""}>Forrige</button>
            <span class="pagination-info">Side ${currentPage} af ${totalPages}</span>
            <button class="pagination-btn" data-direction="next" ${currentPage >= totalPages ? "disabled" : ""}>Næste</button>
        </div>
    `;

    wireUpInteractions(container, totalPages);
    attachFlagButtonHandlers(container);
}

function wireUpInteractions(container, totalPages) {
    const searchInput = container.querySelector("#ticketSearchInput");
    const statusSelect = container.querySelector("#ticketStatusFilter");
    const routingSelect = container.querySelector("#ticketRoutingFilter");
    const paginationButtons = container.querySelectorAll(".pagination-btn");
    const viewButtons = container.querySelectorAll(".view-toggle-btn");

    if (searchInput) {
        searchInput.addEventListener("input", event => {
            filters.search = event.target.value;
            currentPage = 1;
            persistFilters();
            renderTicketList(container);
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener("change", event => {
            filters.status = event.target.value;
            currentPage = 1;
            persistFilters();
            renderTicketList(container);
        });
    }

    if (routingSelect) {
        routingSelect.addEventListener("change", event => {
            filters.routing = event.target.value;
            currentPage = 1;
            persistFilters();
            renderTicketList(container);
        });
    }

    paginationButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const dir = btn.dataset.direction;
            if (dir === "prev" && currentPage > 1) {
                currentPage -= 1;
            } else if (dir === "next" && currentPage < totalPages) {
                currentPage += 1;
            }
            persistFilters();
            renderTicketList(container);
        });
    });

    viewButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            if (view && view !== currentView) {
                currentView = view;
                persistFilters();
                renderTicketList(container);
            }
        });
    });
}

function attachFlagButtonHandlers(container) {
    const buttons = container.querySelectorAll(".ticket-flag-button");
    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const ticketId = btn.dataset.ticketId;
            if (!ticketId) return;

            const confirmed = window.confirm(
                `Er du sikker på, at ticket #${ticketId} er routet forkert?\n` +
                `Den bliver markeret som FAILURE, og statistikken opdateres.`
            );
            if (!confirmed) return;

            try {
                btn.disabled = true;
                btn.textContent = "Opdaterer...";

                await markTicketAsMisrouted(ticketId);

                window.location.reload();
            } catch (e) {
                console.error("Kunne ikke markere ticket som forkert:", e);
                btn.disabled = false;
                btn.textContent = "Marker som forkert routing";
                alert("Der opstod en fejl ved opdatering af ticketen.");
            }
        });
    });
}
