// 🔥 CPM ENGINE: Abstracted from the UI for clean separation of concerns
export const calculateLiveForecast = (tasks) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return [];

    let live = tasks.map(t => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        const duration = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
        return {
            ...t,
            plannedDuration: duration,
            forecastStart: t.actualStart || t.startDate,
            forecastEnd: t.actualEnd || null
        };
    });

    live = live.map(t => {
        if (!t.forecastEnd) {
            const fs = new Date(t.forecastStart);
            if (t.type !== 'Milestone') fs.setDate(fs.getDate() + t.plannedDuration - 1);
            t.forecastEnd = fs.toISOString().split('T')[0];
        }
        return t;
    });

    let changed = true;
    let iters = 0;
    while (changed && iters < 20) {
        changed = false;
        iters++;
        live = live.map(task => {
            let newStart = new Date(task.forecastStart);
            if (!task.actualStart && task.dependency && task.dependency.taskId) {
                const pred = live.find(t => t.id === task.dependency.taskId);
                if (pred && pred.forecastEnd) {
                    const predStart = new Date(pred.forecastStart);
                    const predEnd = new Date(pred.forecastEnd);
                    const lag = Number(task.dependency.lag) || 0;
                    const isMilestone = task.type === 'Milestone';

                    if (task.dependency.type === 'FS') {
                        newStart = new Date(predEnd);
                        newStart.setDate(newStart.getDate() + (isMilestone ? 0 : 1) + lag);
                    } else if (task.dependency.type === 'SS') {
                        newStart = new Date(predStart);
                        newStart.setDate(newStart.getDate() + lag);
                    } else if (task.dependency.type === 'FF') {
                        const tempEnd = new Date(predEnd);
                        tempEnd.setDate(tempEnd.getDate() + lag);
                        newStart = new Date(tempEnd);
                        if (!isMilestone) newStart.setDate(newStart.getDate() - task.plannedDuration + 1);
                    } else if (task.dependency.type === 'SF') {
                        const tempEnd = new Date(predStart);
                        tempEnd.setDate(tempEnd.getDate() + lag);
                        newStart = new Date(tempEnd);
                        if (!isMilestone) newStart.setDate(newStart.getDate() - task.plannedDuration + 1);
                    }
                }
            }

            let newEnd = task.actualEnd ? new Date(task.actualEnd) : new Date(newStart);
            if (!task.actualEnd && task.type !== 'Milestone') {
                newEnd.setDate(newStart.getDate() + task.plannedDuration - 1);
            }

            const startStr = newStart.toISOString().split('T')[0];
            const endStr = newEnd.toISOString().split('T')[0];

            if (task.forecastStart !== startStr || task.forecastEnd !== endStr) {
                changed = true;
                return { ...task, forecastStart: startStr, forecastEnd: endStr };
            }
            return task;
        });
    }
    return live;
};