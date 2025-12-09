// Use a configurable API base. In most deployments the frontend is hosted by the backend
// so the relative path works. Prefer the relative path to avoid CORS issues when the
// backend is exposed via a reverse proxy on the same origin, and only use a custom base
// when it is explicitly provided via `window.TICKET_SERVICE_API_BASE`.
const API_BASE_PATH = "/api/ticketservice";

function readQueryOverride() {
    if (typeof window === "undefined" || !window.location || !window.location.search) {
        return null;
    }

    const params = new URLSearchParams(window.location.search);
    return (
        params.get("apiBase") ||
        params.get("ticketServiceApiBase") ||
        params.get("ticket_service_api_base")
    );
}

function resolveApiBaseUrl() {
    if (typeof window === "undefined") {
        return API_BASE_PATH;
    }

    if (window.TICKET_SERVICE_API_BASE) {
        return window.TICKET_SERVICE_API_BASE;
    }

    const queryOverride = readQueryOverride();
    if (queryOverride) {
        return queryOverride;
    }

    // When running the static files from e.g. JetBrains' built-in web server (port 63342),
    // the backend still listens on localhost:8080. Use that as a fallback to avoid the
    // guaranteed 404s you'd see from the static file server.
    if (window.location && window.location.hostname === "localhost") {
        const port = window.location.port;
        if (port && port !== "8080") {
            return `http://localhost:8080${API_BASE_PATH}`;
        }
    }

    return API_BASE_PATH;
}

const API_BASE_URL = resolveApiBaseUrl();

export async function getDepartments() {
    const r = await fetch(`${API_BASE_URL}/departments`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente departments (status ${r.status})`);
    }
    return await r.json();
}

export async function createDepartment(payload) {
    const r = await fetch(`${API_BASE_URL}/departments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!r.ok) {
        let msg = `Kunne ikke oprette department (status ${r.status})`;
        try {
            const errBody = await r.json();
            if (errBody && errBody.message) {
                msg += `: ${errBody.message}`;
            }
        } catch (_) {}
        throw new Error(msg);
    }

    return await r.json();
}

export async function updateDepartment(id, payload) {
    const r = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!r.ok) {
        let msg = `Kunne ikke opdatere department (id ${id}, status ${r.status})`;
        try {
            const errBody = await r.json();
            if (errBody && errBody.message) {
                msg += `: ${errBody.message}`;
            }
        } catch (_) {}
        throw new Error(msg);
    }

    return await r.json();
}

export async function deleteDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: "DELETE"
    });

    if (!r.ok) {
        let msg = `Kunne ikke slette department (id ${id}, status ${r.status})`;
        try {
            const errBody = await r.json();
            if (errBody && errBody.message) {
                msg += `: ${errBody.message}`;
            }
        } catch (_) {}
        throw new Error(msg);
    }

    return true;
}

export async function getTicketsForDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/metrics/departments/${id}`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente metrics/tickets for department ${id} (status ${r.status})`);
    }
    return await r.json();
}

export async function getDepartmentTicketList(id) {
    const r = await fetch(`${API_BASE_URL}/departments/tickets/${id}`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente metrics/tickets for department ${id} (status ${r.status})`);
    }
    return await r.json();
}

export async function getRoutingStats() {
    const r = await fetch(`${API_BASE_URL}/stats`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente stats (status ${r.status})`);
    }
    return await r.json();
}

export async function getRoutingStatsForDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/stats/${id}`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente stats for department ${id} (status ${r.status})`);
    }
    return await r.json();
}

export async function markTicketAsMisrouted(ticketId) {
    const r = await fetch(`${API_BASE_URL}/tickets/${ticketId}/misrouted`, {
        method: "POST"
    });

    if (!r.ok) {
        let msg = `Kunne ikke markere ticket ${ticketId} som forkert routet (status ${r.status})`;
        try {
            const errBody = await r.json();
            if (errBody && errBody.message) {
                msg += `: ${errBody.message}`;
            }
        } catch (_) {}
        throw new Error(msg);
    }

    try {
        return await r.json();
    } catch (_) {
        return null;
    }
}

export async function updateTicketPriority(ticketId, priority) {
    const r = await fetch(`${API_BASE_URL}/tickets/${ticketId}/priority`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ priority })
    });

    if (!r.ok) {
        let msg = `Kunne ikke opdatere prioritet for ticket ${ticketId} (status ${r.status})`;
        try {
            const errBody = await r.json();
            if (errBody && errBody.message) {
                msg += `: ${errBody.message}`;
            }
        } catch (_) {}
        throw new Error(msg);
    }

    try {
        return await r.json();
    } catch (_) {
        return null;
    }
}
