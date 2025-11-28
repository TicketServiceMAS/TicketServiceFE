const API_BASE_URL = "http://localhost:8080";

export async function getRoutingStats() {
    const response = await fetch(`${API_BASE_URL}/api/ticketservice/stats`);

    if (!response.ok) {
        throw new Error("Kunne ikke hente routing statistics");
    }

    return await response.json();
}
