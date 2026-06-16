class ZephyrAI {

    constructor(state) {
        this.state = state;
    }

    coach() {
        const total = this.state.tasks.length + this.state.completed.length;

        if (total === 0) return "System ready. Deploy first mission.";

        const ratio = this.state.completed.length / total;

        if (ratio > 0.8) return "Elite execution pattern detected.";
        if (ratio > 0.5) return "Stable growth trajectory.";
        if (ratio > 0.2) return "Warning: inconsistency detected.";

        return "Critical stagnation. Action required.";
    }

    shadow() {
        if (this.state.xp > 100) {
            return "You are ahead of your Shadow.";
        }
        return "Shadow is evolving alongside you.";
    }

    apply() {
        document.getElementById("coach").innerText = this.coach();
        document.getElementById("shadow").innerText = this.shadow();
    }
}