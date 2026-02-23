export class Serializer {
    static user(user: any) {
        if (!user) return null;
        const { password, ...safeUser } = user;
        return safeUser;
    }

    static collection(items: any[], serializer: (item: any) => any) {
        return items.map(serializer);
    }

    static project(project: any) {
        if (!project) return null;
        // Omit sensitive org details if needed, but usually IDs are fine.
        // Ensure we don't leak anything unintended.
        return project;
    }

    static task(task: any) {
        if (!task) return null;
        return task;
    }
}
