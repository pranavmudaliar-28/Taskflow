
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove non-word chars (except spaces and dashes)
        .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with dashes
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
}
