export type CoverageStatus = "open" | "covered" | "completed";

export type CoverageSummary = {
    required: number | null;
    claimed: number;
    remaining: number | null;
    status: CoverageStatus;
};

export function calculateCoverage(
    quantityRequired: number | null,
    assignmentQuantities: readonly number[]
): CoverageSummary {
    const claimed = assignmentQuantities.reduce((total, quantity) => total + quantity, 0);

    if (quantityRequired === null) {
        return {
            required: null,
            claimed,
            remaining: null,
            status: claimed > 0 ? "completed" : "open",
        };
    }

    const remaining = Math.max(quantityRequired - claimed, 0);

    return {
        required: quantityRequired,
        claimed,
        remaining,
        status: remaining === 0 ? "covered" : "open",
    };
}