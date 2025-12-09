const API_BASE_URL = "http://localhost:8080/api/ticketservice";

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

export async function getMetricsHistoryForAllDepartments() {
    const r = await fetch(`${API_BASE_URL}/metrics/departments`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente historiske metrics (status ${r.status})`);
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
