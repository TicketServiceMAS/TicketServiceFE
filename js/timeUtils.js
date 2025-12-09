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
 * Version der matcher jeres oprindelige index.js:
 * - henter metrics/tickets pr. department
 * - returnerer en liste af objekter { departmentId, ...data }
 * - vi forsøger IKKE at flade om til rene tickets her
 */
export async function loadAllTicketsFromBackend() {
    try {
        const departments = await getDepartments();
        if (!Array.isArray(departments) || departments.length === 0) {
            console.warn("Ingen departments fundet");
            return [];
        }

        const ids = departments
            .map(d => d.departmentID ?? d.id)
            .filter(id => id != null);

        const results = await Promise.all(
            ids.map(async id => {
                try {
                    const data = await getTicketsForDepartment(id);

                    // Acceptér hvad end backend sender, så længe det er et objekt/array.
                    if (data && typeof data === "object") {
                        return {
                            departmentId: id,
                            ...data
                        };
                    }

                    // Hvis data er null/undefined, spring det over.
                    console.warn("Tomt svar fra getTicketsForDepartment:", id, data);
                    return null;
                } catch (e) {
                    console.warn("Kunne ikke hente tickets for department", id, e);
                    return null;
                }
            })
        );

        // fjern nulls
        return results.filter(Boolean);

    } catch (e) {
        console.error("Fejl ved hentning af alle tickets:", e);
        return [];
    }
}

/**
 * (EKSTRA) Alternativ helper der flader alt ud til rene tickets.
 * Bruger vi ikke lige nu, men den ligger her hvis backend senere
 * returnerer arrays med tickets i en `tickets`-property.
 */
export async function loadAllTicketsFlattened() {
    const perDepartment = await loadAllTicketsFromBackend();
    const flattened = [];

    for (const dep of perDepartment) {
        if (!dep) continue;

        // hvis backend har en tickets-liste
        if (Array.isArray(dep.tickets)) {
            for (const t of dep.tickets) {
                flattened.push(t);
            }
        }
    }

    return flattened;
}
