// timeUtils.js


import {
    getDepartments,
    getTicketsForDepartment,
    getMetricsHistoryForAllDepartments
} from "./api.js";

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


export async function loadAllTicketsFromBackend() {
    try {
        const history = await getMetricsHistoryForAllDepartments();

        if (Array.isArray(history)) {
            return history;
        }

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

                    if (data && typeof data === "object") {
                        return {
                            departmentId: id,
                            ...data
                        };
                    }

                    console.warn("Tomt svar fra getTicketsForDepartment:", id, data);
                    return null;
                } catch (e) {
                    console.warn("Kunne ikke hente tickets for department", id, e);
                    return null;
                }
            })
        );

        const cleaned = results.filter(Boolean);

        const flattened = [];

        for (const entry of cleaned) {
            if (!entry) continue;

            if (Array.isArray(entry)) {
                flattened.push(...entry);
                continue;
            }

            if (Array.isArray(entry.tickets)) {
                flattened.push(...entry.tickets);
                continue;
            }

            flattened.push(entry);
        }

        return flattened;
    } catch (e) {
        console.error("Fejl ved hentning af alle tickets:", e);
        return [];
    }
}


export async function loadAllTicketsFlattened() {
    const perDepartment = await loadAllTicketsFromBackend();
    const flattened = [];

    for (const dep of perDepartment) {
        if (!dep) continue;

        if (Array.isArray(dep.tickets)) {
            for (const t of dep.tickets) {
                flattened.push(t);
            }
        }
    }

    return flattened;
}
