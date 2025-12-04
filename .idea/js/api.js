const API_BASE_URL = "http://localhost:8080/api/ticketservice";

// Hent alle departments
export async function getDepartments() {
    const r = await fetch(`${API_BASE_URL}/departments`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente departments (status ${r.status})`);
    }
    return await r.json();
}

// Opret nyt department
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
        } catch (_) {
            // ignore JSON parse fejl
        }
        throw new Error(msg);
    }

    return await r.json(); // Controller returnerer Department-entity
}

// Opdater et eksisterende department
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
        } catch (_) {
            // ignore JSON parse fejl
        }
        throw new Error(msg);
    }

    return await r.json(); // Controller returnerer det opdaterede Department
}

// Slet et department
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
        } catch (_) {
            // ignore JSON parse fejl
        }
        throw new Error(msg);
    }

    // Backend returnerer kun en tekst ("Department deleted"), vi behøver den ikke.
    return true;
}

// Hent alle metrics/tickets for et department
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


// Hent samlede routing stats (alle departments)
export async function getRoutingStats() {
    const r = await fetch(`${API_BASE_URL}/stats`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente stats (status ${r.status})`);
    }
    return await r.json();
}

// Hent routing stats for ét department
export async function getRoutingStatsForDepartment(id) {
    const r = await fetch(`${API_BASE_URL}/stats/${id}`);
    if (!r.ok) {
        throw new Error(`Kunne ikke hente stats for department ${id} (status ${r.status})`);
    }
    return await r.json();
}
