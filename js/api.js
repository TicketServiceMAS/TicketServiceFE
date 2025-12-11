const API_BASE_URL = "http://localhost:8080/api/ticketservice";

function getAuthHeaders(isJson = true) {
    const token = sessionStorage.getItem("token");
    const headers = {};
    if (isJson) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

export async function getDepartments() {
    const res = await fetch(`${API_BASE_URL}/departments`, {
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Kunne ikke hente departments (status ${res.status})`);
    return await res.json();
}

export async function createDepartment(payload) {
    const res = await fetch(`${API_BASE_URL}/departments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        let msg = `Kunne ikke oprette department (status ${res.status})`;
        try {
            const errBody = await res.json();
            if (errBody?.message) msg += `: ${errBody.message}`;
        } catch (_) {}
        throw new Error(msg);
    }

    return await res.json();
}

export async function updateDepartment(id, payload) {
    const res = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        let msg = `Kunne ikke opdatere department (id ${id}, status ${res.status})`;
        try {
            const errBody = await res.json();
            if (errBody?.message) msg += `: ${errBody.message}`;
        } catch (_) {}
        throw new Error(msg);
    }

    return await res.json();
}

export async function deleteDepartment(id) {
    const res = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(false)
    });

    if (!res.ok) {
        let msg = `Kunne ikke slette department (id ${id}, status ${res.status})`;
        try {
            const errBody = await res.json();
            if (errBody?.message) msg += `: ${errBody.message}`;
        } catch (_) {}
        throw new Error(msg);
    }

    return true;
}

export async function getTicketsForDepartment(id) {
    const res = await fetch(`${API_BASE_URL}/metrics/departments/${id}`, {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error(`Kunne ikke hente metrics/tickets for department ${id} (status ${res.status})`);
    return await res.json();
}

export async function getDepartmentTicketList(id) {
    const res = await fetch(`${API_BASE_URL}/departments/tickets/${id}`, {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error(`Kunne ikke hente metrics/tickets for department ${id} (status ${res.status})`);
    return await res.json();
}

export async function getRoutingStats() {
    const res = await fetch(`${API_BASE_URL}/stats`, {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error(`Kunne ikke hente stats (status ${res.status})`);
    return await res.json();
}

export async function getRoutingStatsForDepartment(id) {
    const res = await fetch(`${API_BASE_URL}/stats/${id}`, {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error(`Kunne ikke hente stats for department ${id} (status ${res.status})`);
    return await res.json();
}

export async function getMetricsHistoryForAllDepartments() {
    const res = await fetch(`${API_BASE_URL}/metrics/departments`, {
        headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error(`Kunne ikke hente historiske metrics (status ${res.status})`);
    return await res.json();
}

export async function markTicketAsMisrouted(ticketId) {
    const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/misrouted`, {
        method: "POST",
        headers: getAuthHeaders(false)
    });

    if (!res.ok) {
        let msg = `Kunne ikke markere ticket ${ticketId} som forkert routet (status ${res.status})`;
        try {
            const errBody = await res.json();
            if (errBody?.message) msg += `: ${errBody.message}`;
        } catch (_) {}
        throw new Error(msg);
    }

    try {
        return await res.json();
    } catch (_) {
        return null;
    }
}

export async function markTicketAsCorrect(ticketId) {
    const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/correct`, {
        method: "POST",
        headers: getAuthHeaders(false)
    });

    if (!res.ok) {
        let msg = `Fejl ved markering som korrekt routing (status ${res.status})`;
        try {
            const errBody = await res.text();
            msg += `: ${errBody}`;
        } catch (_) {}
        throw new Error(msg);
    }

    try {
        return await res.json();
    } catch (_) {
        return null;
    }
}

