// timeUtils.js
// Tid, formatering og hentning af alle tickets / metrics

import { getDepartments, getTicketsForDepartment } from "./api.js";

let liveUpdatedInterval = null;

export function startLiveUpdatedLabel(element, timestamp) {
    if (!element || !timestamp) return;

    if (liveUpdatedInterval) {
        clearInterval(liveUpdatedInterval);
        liveUpdatedInterval = null;
    }

    function render() {
        const now = Date.now();
        const diffMs = now - timestamp.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        let relativeText;
        if (diffSec < 5) {
            relativeText = "lige nu";
        } else if (diffSec < 60) {
            relativeText = `for ${diffSec} sek. siden`;
        } else if (diffMin < 60) {
            relativeText = `for ${diffMin} min. siden`;
        } else if (diffHours < 24) {
            relativeText = `for ${diffHours} timer siden`;
        } else {
            relativeText = `for ${diffDays} dage siden`;
        }

        const timeText = timestamp.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
        element.textContent = `kl. ${timeText} (${relativeText})`;
    }

    render();
    liveUpdatedInterval = setInterval(render, 1000);
}

export function formatDateTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString("da-DK");
}

/**
 * Henter metrics/tickets pr. department og flader resultatet ud til rene tickets
 * med department-id/-navn påført, så de kan bruges i grafer og tabeller.
 */
export async function loadAllTicketsFromBackend() {
    try {
        const departments = await getDepartments();
        if (!Array.isArray(departments) || departments.length === 0) {
            console.warn("Ingen departments fundet");
            return [];
        }

        const departmentNames = new Map(
            departments
                .map(d => [
                    d.departmentID ?? d.id,
                    d.departmentName ?? d.name ?? ""
                ])
                .filter(([id]) => id != null)
        );

        const ids = departments
            .map(d => d.departmentID ?? d.id)
            .filter(id => id != null);

        const allTickets = [];

        await Promise.all(
            ids.map(async id => {
                try {
                    const data = await getTicketsForDepartment(id);

                    const parsedTickets = parseTicketPayload(data);
                    if (!parsedTickets.length) {
                        console.warn(
                            "Tomt svar fra getTicketsForDepartment:",
                            id,
                            data
                        );
                        return;
                    }

                    for (const ticket of parsedTickets) {
                        if (!ticket || typeof ticket !== "object") continue;

                        const enriched = { ...ticket };

                        // Sørg for at vi kan spore department på hver ticket
                        if (
                            enriched.metricsDepartmentID == null &&
                            enriched.departmentID == null &&
                            enriched.departmentId == null
                        ) {
                            enriched.metricsDepartmentID = id;
                        }

                        if (!enriched.departmentName && departmentNames.has(id)) {
                            enriched.departmentName = departmentNames.get(id);
                        }

                        allTickets.push(enriched);
                    }
                } catch (e) {
                    console.warn("Kunne ikke hente tickets for department", id, e);
                }
            })
        );

        return allTickets;

    } catch (e) {
        console.error("Fejl ved hentning af alle tickets:", e);
        return [];
    }
}

function parseTicketPayload(payload) {
    if (!payload) return [];

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload.tickets)) {
        return payload.tickets;
    }

    if (Array.isArray(payload.ticketList)) {
        return payload.ticketList;
    }

    return [];
}

/**
 * (EKSTRA) Alternativ helper der returnerer samme resultat som ovenfor.
 */
export async function loadAllTicketsFlattened() {
    return loadAllTicketsFromBackend();
}
