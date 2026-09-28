/* =========================================================
   EDUVORA — FINAL APPLICATION
   One clean JavaScript file. No external libraries.
========================================================= */

const Eduvora = {
    STORAGE_KEY: "eduvora-data",
    THEME_KEY: "eduvora-theme",
    focusInterval: null,

    state: {
        currentPage: "dashboard",
        theme: localStorage.getItem("eduvora-theme") || "light",
        tasks: [],
        goals: [],
        plannerSessions: [],
        focusMinutes: 0,
        studyStreak: 0,
        focusHistory: [],
        profile: {
            name: "Virat",
            className: "Class 10",
            school: "",
            bio: "Student • Web Developer • Lifelong Learner",
            subjects: "Mathematics, Science, Computer Science",
            email: ""
        },
        settings: {
            notifications: true,
            autoStartBreaks: false,
            studyTarget: 120,
            defaultFocus: 25
        }
    },

    plannerSelectedDate: null,
    plannerCurrentMonth: null,
    currentTaskFilter: "all",
    focus: {
        mode: "ready",
        duration: 25 * 60,
        remaining: 25 * 60,
        running: false
    },

    init() {
        this.loadData();
        this.ensureState();
        this.applyTheme();
        this.setupGlobalEvents();
        this.renderPage(this.state.currentPage);
        this.updateDateEverywhere();
        this.updateProfileButton();
        console.log("EduVora initialized successfully 🚀");
    },

    /* -------------------- STORAGE -------------------- */

    loadData() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return;

        try {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === "object") {
                this.state = this.deepMerge(this.state, saved);
            }
        } catch (error) {
            console.error("EduVora data could not be loaded:", error);
            this.toast("Saved data was invalid, so EduVora started safely.", "error");
        }
    },

    deepMerge(base, incoming) {
        const result = { ...base };
        Object.keys(incoming || {}).forEach((key) => {
            if (
                incoming[key] &&
                typeof incoming[key] === "object" &&
                !Array.isArray(incoming[key]) &&
                base[key] &&
                typeof base[key] === "object" &&
                !Array.isArray(base[key])
            ) {
                result[key] = this.deepMerge(base[key], incoming[key]);
            } else {
                result[key] = incoming[key];
            }
        });
        return result;
    },

    saveData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (error) {
            console.error("EduVora could not save data:", error);
            this.toast("EduVora could not save this change.", "error");
        }
    },

    safeSave() {
        this.ensureState();
        this.saveData();
    },

    ensureState() {
        if (!Array.isArray(this.state.tasks)) this.state.tasks = [];
        if (!Array.isArray(this.state.goals)) this.state.goals = [];
        if (!Array.isArray(this.state.plannerSessions)) this.state.plannerSessions = [];
        if (!Array.isArray(this.state.focusHistory)) this.state.focusHistory = [];
        if (typeof this.state.focusMinutes !== "number") this.state.focusMinutes = 0;
        if (typeof this.state.studyStreak !== "number") this.state.studyStreak = 0;

        const profileDefaults = {
            name: "Virat",
            className: "Class 10",
            school: "",
            bio: "Student • Web Developer • Lifelong Learner",
            subjects: "Mathematics, Science, Computer Science",
            email: ""
        };
        this.state.profile = this.deepMerge(profileDefaults, this.state.profile || {});

        const settingDefaults = {
            notifications: true,
            autoStartBreaks: false,
            studyTarget: 120,
            defaultFocus: 25
        };
        this.state.settings = this.deepMerge(settingDefaults, this.state.settings || {});

        if (!["light", "dark"].includes(this.state.theme)) {
            this.state.theme = "light";
        }
    },

    /* -------------------- GLOBAL EVENTS -------------------- */

    setupGlobalEvents() {
        document.addEventListener("click", (event) => {
            const pageButton = event.target.closest("[data-page]");
            if (pageButton) {
                event.preventDefault();
                const page = pageButton.dataset.page;
                if (page) this.navigate(page);
                return;
            }

            const taskAction = event.target.closest("[data-task-action]");
            if (taskAction) {
                this.handleTaskAction(taskAction);
                return;
            }

            const goalAction = event.target.closest("[data-goal-action]");
            if (goalAction) {
                this.handleGoalAction(goalAction);
                return;
            }

            const sessionAction = event.target.closest("[data-session-action]");
            if (sessionAction) {
                this.handleSessionAction(sessionAction);
                return;
            }

            const focusPreset = event.target.closest("[data-focus-preset]");
            if (focusPreset) {
                this.setFocusPreset(Number(focusPreset.dataset.focusPreset));
                return;
            }

            const action = event.target.closest("[data-action]");
            if (action) {
                this.handleGenericAction(action);
            }
        });

        document.addEventListener("submit", (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;

            if (form.id === "taskForm") {
                event.preventDefault();
                this.submitTaskForm(form);
            } else if (form.id === "goalForm") {
                event.preventDefault();
                this.submitGoalForm(form);
            } else if (form.id === "plannerForm") {
                event.preventDefault();
                this.submitPlannerForm(form);
            } else if (form.id === "profileForm") {
                event.preventDefault();
                this.submitProfileForm(form);
            }
        });

        document.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            if (target.matches("[data-setting]")) {
                this.updateSetting(target.dataset.setting, target);
            }
        });

        document.getElementById("themeButton")?.addEventListener("click", () => {
            this.toggleTheme();
        });

        document.getElementById("profileButton")?.addEventListener("click", () => {
            this.navigate("profile");
        });

        document.getElementById("menuButton")?.addEventListener("click", () => {
            this.toggleMobileMenu();
        });

        document.getElementById("overlay")?.addEventListener("click", () => {
            this.closeMobileMenu();
            this.closeModal();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.closeModal();
                this.closeMobileMenu();
            }
        });
    },

    navigate(page) {
        const validPages = [
            "dashboard",
            "tasks",
            "planner",
            "goals",
            "focus",
            "analytics",
            "achievements",
            "profile",
            "settings"
        ];

        if (!validPages.includes(page)) page = "dashboard";

        this.state.currentPage = page;
        this.currentTaskFilter = page === "tasks" ? this.currentTaskFilter : "all";

        this.updateActiveNavigation(page);
        const label = document.getElementById("pageLabel");
        if (label) label.textContent = this.formatPageName(page);

        this.closeMobileMenu();
        this.renderPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    },

    updateActiveNavigation(page) {
        document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
            item.classList.toggle("active", item.dataset.page === page);
        });
    },

    formatPageName(page) {
        return page.charAt(0).toUpperCase() + page.slice(1);
    },

    toggleMobileMenu() {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("overlay");
        sidebar?.classList.toggle("mobile-open");
        const open = sidebar?.classList.contains("mobile-open");
        overlay?.classList.toggle("visible", Boolean(open));
        overlay?.setAttribute("aria-hidden", open ? "false" : "true");
    },

    closeMobileMenu() {
        document.getElementById("sidebar")?.classList.remove("mobile-open");
        document.getElementById("overlay")?.classList.remove("visible");
        document.getElementById("overlay")?.setAttribute("aria-hidden", "true");
    },

    /* -------------------- THEME -------------------- */

    toggleTheme() {
        this.state.theme = this.state.theme === "dark" ? "light" : "dark";
        this.applyTheme();
        this.safeSave();
        this.toast(`${this.state.theme === "dark" ? "Dark" : "Light"} mode enabled.`);
    },

    applyTheme() {
        const isDark = this.state.theme === "dark";
        document.body.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.dataset.theme = isDark ? "dark" : "light";

        const button = document.getElementById("themeButton");
        if (button) {
            button.textContent = isDark ? "☀" : "☾";
            button.title = isDark ? "Switch to light mode" : "Switch to dark mode";
            button.setAttribute("aria-label", button.title);
        }
        localStorage.setItem(this.THEME_KEY, this.state.theme);
    },

    /* -------------------- RENDER ROUTER -------------------- */

    renderPage(page) {
        const content = document.getElementById("pageContent");
        if (!content) return;

        switch (page) {
            case "dashboard":
                this.renderDashboard(content);
                break;
            case "tasks":
                this.renderTasks(content);
                break;
            case "planner":
                this.renderPlanner(content);
                break;
            case "goals":
                this.renderGoals(content);
                break;
            case "focus":
                this.renderFocus(content);
                break;
            case "analytics":
                this.renderAnalytics(content);
                break;
            case "achievements":
                this.renderAchievements(content);
                break;
            case "profile":
                this.renderProfile(content);
                break;
            case "settings":
                this.renderSettings(content);
                break;
            default:
                this.renderDashboard(content);
        }

        this.updateActiveNavigation(page);
        this.updateProfileButton();
    },

    /* -------------------- DASHBOARD -------------------- */

    renderDashboard(content) {
        const pending = this.state.tasks.filter((task) => !task.completed);
        const completedCount = this.getCompletedTasksCount();
        const activeGoals = this.state.goals.filter((goal) => Number(goal.progress) < 100);
        const todaySessions = this.getSessionsForDate(this.todayKey());
        const weeklyFocus = this.getWeeklyFocusMinutes();

        content.innerHTML = `
            <section class="welcome-section">
                <div class="welcome-copy">
                    <p class="eyebrow">YOUR STUDY SPACE</p>
                    <h2>Hi from ${this.escapeHTML(this.state.profile.name)} 👋</h2>
                    <p class="welcome-text">Plan your day, stay focused and keep moving toward your goals.</p>
                </div>
                <div class="date-card">
                    <span id="currentDate">${this.getLongDate()}</span>
                </div>
            </section>

            <section class="stats-grid">
                ${this.statCard("Tasks completed", completedCount, "Keep building momentum", "✓")}
                ${this.statCard("Active goals", activeGoals.length, "Goals you're working toward", "◎")}
                ${this.statCard("Focus time", this.state.focusMinutes, "Minutes of focused study", "◷", "min")}
                ${this.statCard("Study streak", this.state.studyStreak, "Keep your streak alive", "🔥", "days")}
            </section>

            <section class="dashboard-grid">
                <article class="panel tasks-panel">
                    <div class="panel-header">
                        <div>
                            <p class="eyebrow">TODAY</p>
                            <h3>Today's tasks</h3>
                        </div>
                        <button class="text-button" type="button" data-page="tasks">View all →</button>
                    </div>
                    <div class="task-preview">
                        ${
                            pending.length
                                ? `<div class="task-items">${pending.slice(0, 5).map((task) => this.taskHTML(task)).join("")}</div>`
                                : `
                                    <div class="empty-state">
                                        <div class="empty-icon">✓</div>
                                        <h4>No tasks yet</h4>
                                        <p>Your planned tasks will appear here. Start by adding your first task.</p>
                                        <button class="primary-button" type="button" data-action="new-task">Add your first task</button>
                                    </div>
                                `
                        }
                    </div>
                </article>

                <article class="panel quick-panel">
                    <div class="panel-header">
                        <div>
                            <p class="eyebrow">QUICK START</p>
                            <h3>What do you want to do?</h3>
                        </div>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-action" type="button" data-action="new-task">
                            <span>✓</span>
                            <div><strong>Add task</strong><small>Plan something you need to finish</small></div>
                        </button>
                        <button class="quick-action" type="button" data-page="focus">
                            <span>◷</span>
                            <div><strong>Start focus</strong><small>Begin a distraction-free session</small></div>
                        </button>
                        <button class="quick-action" type="button" data-action="new-goal">
                            <span>◎</span>
                            <div><strong>Create goal</strong><small>Set something meaningful to achieve</small></div>
                        </button>
                        <button class="quick-action" type="button" data-action="new-session">
                            <span>▦</span>
                            <div><strong>Plan session</strong><small>Put a study block on your calendar</small></div>
                        </button>
                    </div>
                </article>

                <article class="panel goal-panel">
                    <div class="panel-header">
                        <div>
                            <p class="eyebrow">YOUR JOURNEY</p>
                            <h3>Goal progress</h3>
                        </div>
                        <button class="text-button" type="button" data-page="goals">Goals →</button>
                    </div>
                    ${
                        activeGoals.length
                            ? this.goalProgressPreview(activeGoals)
                            : `
                                <div class="goal-empty">
                                    <div class="goal-ring"><span>0%</span></div>
                                    <div>
                                        <h4>No active goals</h4>
                                        <p>Create a goal and watch your progress grow here.</p>
                                    </div>
                                </div>
                            `
                    }
                </article>

                <article class="panel progress-panel">
                    <div class="panel-header">
                        <div>
                            <p class="eyebrow">THIS WEEK</p>
                            <h3>Study progress</h3>
                        </div>
                        <button class="text-button" type="button" data-page="analytics">Analytics →</button>
                    </div>
                    ${this.weekProgressBars()}
                    <p class="small-note">${weeklyFocus} focus minutes logged this week • ${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"} today</p>
                </article>
            </section>
        `;
    },

    statCard(label, value, helper, icon, suffix = "") {
        return `
            <article class="stat-card">
                <div class="stat-card-top">
                    <span class="stat-label">${this.escapeHTML(label)}</span>
                    <span class="stat-icon">${icon}</span>
                </div>
                <strong>${this.escapeHTML(String(value))}${suffix ? `<small class="inline-unit">${this.escapeHTML(suffix)}</small>` : ""}</strong>
                <small>${this.escapeHTML(helper)}</small>
            </article>
        `;
    },

    goalProgressPreview(goals) {
        const goal = [...goals].sort((a, b) => Number(b.progress) - Number(a.progress))[0];
        const progress = this.clamp(Number(goal.progress) || 0, 0, 100);
        return `
            <div class="goal-empty">
                <div class="goal-ring" style="background: conic-gradient(var(--primary) ${progress * 3.6}deg, var(--primary-soft) 0deg);">
                    <span>${progress}%</span>
                </div>
                <div>
                    <h4>${this.escapeHTML(goal.title)}</h4>
                    <p>${this.escapeHTML(goal.description || "Keep moving — every focused session counts.")}</p>
                </div>
            </div>
        `;
    },

    weekProgressBars() {
        const days = this.getLastSevenDays();
        const max = Math.max(...days.map((d) => d.minutes), 30);

        return `
            <div class="progress-placeholder">
                <div class="progress-bars">
                    ${days.map((day) => {
                        const height = Math.max(10, Math.round((day.minutes / max) * 100));
                        return `<span title="${day.label}: ${day.minutes} min" style="height:${height}%"></span>`;
                    }).join("")}
                </div>
                <div class="progress-days">
                    ${days.map((day) => `<span>${day.short}</span>`).join("")}
                </div>
            </div>
        `;
    },

    /* -------------------- TASKS -------------------- */

    renderTasks(content) {
        const tasks = this.getFilteredTasks(this.currentTaskFilter);

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">WORKSPACE</p>
                    <h2>Your tasks</h2>
                    <p>Capture what needs to be done and keep your study day under control.</p>
                </div>
                <button class="primary-button" type="button" data-action="new-task">+ Add task</button>
            </section>

            <section class="panel">
                <div class="panel-header">
                    <div>
                        <p class="eyebrow">TASK LIST</p>
                        <h3>Upcoming work</h3>
                    </div>
                    <div class="task-filters">
                        ${this.filterButton("all", "All")}
                        ${this.filterButton("pending", "Pending")}
                        ${this.filterButton("completed", "Completed")}
                    </div>
                </div>

                ${
                    tasks.length
                        ? `<div class="task-items">${tasks.map((task) => this.taskHTML(task, true)).join("")}</div>`
                        : `
                            <div class="empty-state">
                                <div class="empty-icon">✓</div>
                                <h4>Nothing here yet</h4>
                                <p>Add a task and it will appear here.</p>
                                <button class="primary-button" type="button" data-action="new-task">Add task</button>
                            </div>
                        `
                }
            </section>
        `;
    },

    filterButton(value, label) {
        return `
            <button class="filter-button ${this.currentTaskFilter === value ? "active" : ""}" type="button" data-action="set-task-filter" data-filter="${value}">
                ${label}
            </button>
        `;
    },

    getFilteredTasks(filter) {
        const tasks = [...this.state.tasks];

        if (filter === "pending") {
            return tasks.filter((task) => !task.completed).sort(this.taskSorter.bind(this));
        }
        if (filter === "completed") {
            return tasks.filter((task) => task.completed).sort(this.taskSorter.bind(this));
        }
        return tasks.sort(this.taskSorter.bind(this));
    },

    taskSorter(a, b) {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityRank = { high: 0, medium: 1, low: 2 };
        const priorityDiff = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
        if (priorityDiff !== 0) return priorityDiff;
        return String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
    },

    taskHTML(task, showActions = false) {
        const priority = task.priority || "medium";
        return `
            <article class="task-item ${task.completed ? "completed" : ""}" data-task-id="${this.escapeHTML(task.id)}">
                <button class="task-check" type="button" data-task-action="toggle" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}">
                    ${task.completed ? "✓" : ""}
                </button>

                <div class="task-item-content">
                    <h4>${this.escapeHTML(task.title)}</h4>
                    <div class="task-meta">
                        <span class="priority-badge priority-${this.escapeHTML(priority)}">${this.capitalize(priority)}</span>
                        <span>${task.dueDate ? this.escapeHTML(this.formatTaskDate(task.dueDate)) : "No due date"}</span>
                    </div>
                </div>

                ${
                    showActions
                        ? `<div class="task-actions">
                            <button class="icon-action" type="button" data-task-action="edit" aria-label="Edit task">✏</button>
                            <button class="icon-action danger" type="button" data-task-action="delete" aria-label="Delete task">×</button>
                          </div>`
                        : ""
                }
            </article>
        `;
    },

    handleTaskAction(button) {
        const item = button.closest("[data-task-id]");
        const id = item?.dataset.taskId;
        const action = button.dataset.taskAction;

        if (!id || !action) return;

        if (action === "toggle") {
            this.toggleTask(id);
        } else if (action === "delete") {
            this.deleteTask(id);
        } else if (action === "edit") {
            this.openTaskModal(this.state.tasks.find((task) => task.id === id));
        }
    },

    toggleTask(id) {
        const task = this.state.tasks.find((item) => item.id === id);
        if (!task) return;

        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();

        if (task.completed) {
            this.bumpStreak();
            this.toast("Task completed. Nice work!", "success");
        }

        this.safeSave();
        this.renderPage(this.state.currentPage);
    },

    deleteTask(id) {
        const task = this.state.tasks.find((item) => item.id === id);
        if (!task) return;

        if (!window.confirm(`Delete "${task.title}"?`)) return;

        this.state.tasks = this.state.tasks.filter((item) => item.id !== id);
        this.safeSave();
        this.renderPage(this.state.currentPage);
        this.updateDashboardData();
        this.toast("Task deleted.");
    },

    submitTaskForm(form) {
        const id = form.elements.taskId.value;
        const title = form.elements.taskTitle.value.trim();
        const priority = form.elements.taskPriority.value;
        const dueDate = form.elements.taskDueDate.value;

        if (!title) {
            this.toast("Please enter a task title.", "error");
            return;
        }

        if (id) {
            const task = this.state.tasks.find((item) => item.id === id);
            if (task) {
                task.title = title;
                task.priority = priority;
                task.dueDate = dueDate;
                task.updatedAt = new Date().toISOString();
            }
            this.toast("Task updated.", "success");
        } else {
            this.state.tasks.push({
                id: this.generateId("task"),
                title,
                priority,
                dueDate,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            this.toast("Task created.", "success");
        }

        this.safeSave();
        this.closeModal();
        this.renderPage(this.state.currentPage);
        this.updateDashboardData();
    },

    openTaskModal(task = null) {
        const isEdit = Boolean(task);

        this.openModal(
            "taskModal",
            `${isEdit ? "Edit" : "Create"} a task`,
            "Keep your next action clear and manageable.",
            `
                <form id="taskForm">
                    <input type="hidden" name="taskId" value="${this.escapeHTML(task?.id || "")}">
                    <div class="form-grid">
                        <div class="form-group full">
                            <label for="taskTitle">Task title</label>
                            <input id="taskTitle" name="taskTitle" type="text" maxlength="120" required value="${this.escapeHTML(task?.title || "")}" placeholder="e.g. Complete physics revision">
                        </div>

                        <div class="form-group">
                            <label for="taskPriority">Priority</label>
                            <select id="taskPriority" name="taskPriority">
                                <option value="high" ${task?.priority === "high" ? "selected" : ""}>High</option>
                                <option value="medium" ${!task || task.priority === "medium" ? "selected" : ""}>Medium</option>
                                <option value="low" ${task?.priority === "low" ? "selected" : ""}>Low</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="taskDueDate">Due date</label>
                            <input id="taskDueDate" name="taskDueDate" type="date" value="${this.escapeHTML(task?.dueDate || "")}">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
                        <button class="primary-button" type="submit">${isEdit ? "Save changes" : "Create task"}</button>
                    </div>
                </form>
            `
        );

        document.getElementById("taskTitle")?.focus();
    },

    /* -------------------- PLANNER -------------------- */

    renderPlanner(content) {
        this.initializePlannerState();

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">PLANNER</p>
                    <h2>Plan your study day</h2>
                    <p>Organize study sessions, manage your time and stay consistent.</p>
                </div>
                <button class="primary-button" type="button" data-action="new-session">+ Add session</button>
            </section>

            <section class="planner-layout">
                <article class="panel planner-calendar-wrap">
                    <div class="planner-calendar-head">
                        <div class="planner-calendar-title">${this.formatPlannerMonth(this.plannerCurrentMonth)}</div>
                        <div class="planner-controls">
                            <button class="planner-nav-button" type="button" data-action="planner-prev" aria-label="Previous month">‹</button>
                            <button class="planner-today-button" type="button" data-action="planner-today">Today</button>
                            <button class="planner-nav-button" type="button" data-action="planner-next" aria-label="Next month">›</button>
                        </div>
                    </div>
                    ${this.renderPlannerCalendar()}
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div>
                            <p class="eyebrow">SELECTED DAY</p>
                            <h3>${this.formatPlannerDate(this.plannerSelectedDate)}</h3>
                        </div>
                        <span class="status-badge" style="background:var(--primary-soft);color:var(--primary);">${this.getSessionsForDate(this.plannerSelectedDate).length}</span>
                    </div>
                    <div class="planner-session-list">
                        ${this.renderPlannerSessions()}
                    </div>
                </article>
            </section>
        `;
    },

    initializePlannerState() {
        if (!this.plannerSelectedDate) this.plannerSelectedDate = this.todayKey();
        if (!this.plannerCurrentMonth) {
            const now = new Date();
            this.plannerCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        }
    },

    renderPlannerCalendar() {
        const year = this.plannerCurrentMonth.getFullYear();
        const month = this.plannerCurrentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = this.todayKey();

        let cells = "";

        for (let i = 0; i < firstDay; i++) {
            cells += `<div class="planner-day empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const key = this.toDateKey(date);
            const count = this.getSessionsForDate(key).length;
            const classes = [
                "planner-day",
                key === today ? "today" : "",
                key === this.plannerSelectedDate ? "selected" : ""
            ].join(" ");

            cells += `
                <button class="${classes}" type="button" data-action="select-date" data-date="${key}">
                    <span class="planner-day-number">${day}</span>
                    ${count ? `<span class="planner-day-dot">${count}</span>` : ""}
                </button>
            `;
        }

        return `
            <div class="planner-weekdays">
                ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}
            </div>
            <div class="planner-calendar-grid">${cells}</div>
        `;
    },

    renderPlannerSessions() {
        const sessions = this.getSessionsForDate(this.plannerSelectedDate);

        if (!sessions.length) {
            return `
                <div class="empty-state planner-empty">
                    <div class="empty-icon">◷</div>
                    <h4>No study sessions</h4>
                    <p>Plan a study session for this day and make your time count.</p>
                    <button class="primary-button" type="button" data-action="new-session">Add session</button>
                </div>
            `;
        }

        return sessions.map((session) => `
            <article class="planner-session ${session.completed ? "completed" : ""}" data-session-id="${this.escapeHTML(session.id)}">
                <button class="session-check" type="button" data-session-action="toggle" aria-label="Toggle session">
                    ${session.completed ? "✓" : ""}
                </button>
                <div class="session-time">${this.escapeHTML(this.formatTime(session.startTime))}</div>
                <div class="session-topic">
                    <h4>${this.escapeHTML(session.topic)}</h4>
                    <p>${this.escapeHTML(session.subject || "Study")}</p>
                </div>
                <span class="session-duration">${Number(session.duration)} min</span>
                <button class="icon-action danger" type="button" data-session-action="delete" aria-label="Delete session">×</button>
            </article>
        `).join("");
    },

    handleSessionAction(button) {
        const item = button.closest("[data-session-id]");
        const id = item?.dataset.sessionId;
        const action = button.dataset.sessionAction;
        if (!id || !action) return;

        const session = this.state.plannerSessions.find((entry) => entry.id === id);
        if (!session) return;

        if (action === "toggle") {
            session.completed = !session.completed;
            session.updatedAt = new Date().toISOString();
            if (session.completed) this.bumpStreak();
            this.safeSave();
            this.renderPage("planner");
            this.toast(session.completed ? "Session completed." : "Session reopened.");
        } else if (action === "delete") {
            if (!window.confirm(`Delete "${session.topic}"?`)) return;
            this.state.plannerSessions = this.state.plannerSessions.filter((entry) => entry.id !== id);
            this.safeSave();
            this.renderPage("planner");
            this.toast("Session deleted.");
        }
    },

    openPlannerModal() {
        this.initializePlannerState();

        this.openModal(
            "plannerModal",
            "Add study session",
            "Turn a block of time into a clear plan.",
            `
                <form id="plannerForm">
                    <div class="form-grid">
                        <div class="form-group full">
                            <label for="sessionTopic">Topic</label>
                            <input id="sessionTopic" name="sessionTopic" type="text" maxlength="120" required placeholder="e.g. Laws of Motion">
                        </div>

                        <div class="form-group">
                            <label for="sessionSubject">Subject</label>
                            <input id="sessionSubject" name="sessionSubject" type="text" maxlength="80" placeholder="e.g. Physics">
                        </div>

                        <div class="form-group">
                            <label for="sessionDate">Date</label>
                            <input id="sessionDate" name="sessionDate" type="date" required value="${this.escapeHTML(this.plannerSelectedDate)}">
                        </div>

                        <div class="form-group">
                            <label for="sessionTime">Start time</label>
                            <input id="sessionTime" name="sessionTime" type="time" required value="17:00">
                        </div>

                        <div class="form-group">
                            <label for="sessionDuration">Duration</label>
                            <select id="sessionDuration" name="sessionDuration">
                                <option value="25">25 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60" selected>60 minutes</option>
                                <option value="90">90 minutes</option>
                                <option value="120">120 minutes</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
                        <button class="primary-button" type="submit">Add session</button>
                    </div>
                </form>
            `
        );

        document.getElementById("sessionTopic")?.focus();
    },

    submitPlannerForm(form) {
        const topic = form.elements.sessionTopic.value.trim();
        const subject = form.elements.sessionSubject.value.trim();
        const date = form.elements.sessionDate.value;
        const startTime = form.elements.sessionTime.value;
        const duration = Number(form.elements.sessionDuration.value);

        if (!topic || !date || !startTime || !duration) {
            this.toast("Please complete the session details.", "error");
            return;
        }

        this.state.plannerSessions.push({
            id: this.generateId("session"),
            topic,
            subject: subject || "Study",
            date,
            startTime,
            duration,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        this.plannerSelectedDate = date;
        this.safeSave();
        this.closeModal();
        this.renderPage("planner");
        this.toast("Study session added.", "success");
    },

    /* -------------------- GOALS -------------------- */

    renderGoals(content) {
        const goals = [...this.state.goals];

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">YOUR JOURNEY</p>
                    <h2>Study goals</h2>
                    <p>Choose a direction, track progress and celebrate momentum.</p>
                </div>
                <button class="primary-button" type="button" data-action="new-goal">+ Add goal</button>
            </section>

            <section class="goals-grid">
                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">ACTIVE GOALS</p>
                            <h3>${goals.length} goal${goals.length === 1 ? "" : "s"}</h3>
                        </div>
                    </div>

                    ${
                        goals.length
                            ? `<div class="goal-list">${goals.map((goal) => this.goalHTML(goal)).join("")}</div>`
                            : `
                                <div class="empty-state goal-empty-card">
                                    <div class="empty-icon">◎</div>
                                    <h4>No goals yet</h4>
                                    <p>Set a target that gives your study sessions a purpose.</p>
                                    <button class="primary-button" type="button" data-action="new-goal">Create goal</button>
                                </div>
                            `
                    }
                </article>

                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">GOAL INSIGHT</p>
                            <h3>Keep your next step visible</h3>
                        </div>
                    </div>

                    <div class="empty-state" style="min-height:250px;">
                        <div class="empty-icon">✦</div>
                        <h4>${goals.length ? "Small progress compounds" : "Start with one clear goal"}</h4>
                        <p>${goals.length ? "Update your progress after meaningful study sessions and let EduVora turn effort into a visible trend." : "A focused target is easier to act on than a vague intention. Give yourself something measurable to move toward."}</p>
                    </div>
                </article>
            </section>
        `;
    },

    goalHTML(goal) {
        const progress = this.clamp(Number(goal.progress) || 0, 0, 100);

        return `
            <article class="goal-card" data-goal-id="${this.escapeHTML(goal.id)}">
                <div class="goal-card-top">
                    <div>
                        <h4>${this.escapeHTML(goal.title)}</h4>
                        <p class="goal-description">${this.escapeHTML(goal.description || "No description added.")}</p>
                    </div>
                    <div class="task-actions">
                        <button class="icon-action" type="button" data-goal-action="edit" aria-label="Edit goal">✏</button>
                        <button class="icon-action danger" type="button" data-goal-action="delete" aria-label="Delete goal">×</button>
                    </div>
                </div>

                <div class="goal-progress">
                    <span style="width:${progress}%"></span>
                </div>

                <div class="goal-stats">
                    <span>${progress}% complete</span>
                    <div class="task-actions">
                        <button class="secondary-button" type="button" data-goal-action="minus">−5%</button>
                        <button class="secondary-button" type="button" data-goal-action="plus">+5%</button>
                    </div>
                </div>
            </article>
        `;
    },

    handleGoalAction(button) {
        const card = button.closest("[data-goal-id]");
        const id = card?.dataset.goalId;
        const action = button.dataset.goalAction;
        const goal = this.state.goals.find((item) => item.id === id);
        if (!id || !goal || !action) return;

        if (action === "edit") {
            this.openGoalModal(goal);
        } else if (action === "delete") {
            if (!window.confirm(`Delete "${goal.title}"?`)) return;
            this.state.goals = this.state.goals.filter((item) => item.id !== id);
            this.safeSave();
            this.renderPage("goals");
            this.toast("Goal deleted.");
        } else if (action === "plus" || action === "minus") {
            const delta = action === "plus" ? 5 : -5;
            goal.progress = this.clamp(Number(goal.progress || 0) + delta, 0, 100);
            goal.updatedAt = new Date().toISOString();
            this.safeSave();
            this.renderPage(this.state.currentPage);
        }
    },

    openGoalModal(goal = null) {
        const isEdit = Boolean(goal);

        this.openModal(
            "goalModal",
            `${isEdit ? "Edit" : "Create"} a goal`,
            "Give yourself a target that feels meaningful.",
            `
                <form id="goalForm">
                    <input type="hidden" name="goalId" value="${this.escapeHTML(goal?.id || "")}">
                    <div class="form-grid">
                        <div class="form-group full">
                            <label for="goalTitle">Goal title</label>
                            <input id="goalTitle" name="goalTitle" type="text" maxlength="120" required value="${this.escapeHTML(goal?.title || "")}" placeholder="e.g. Score 95%+ in boards">
                        </div>

                        <div class="form-group full">
                            <label for="goalDescription">Description</label>
                            <textarea id="goalDescription" name="goalDescription" maxlength="500" placeholder="Why does this goal matter?">${this.escapeHTML(goal?.description || "")}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="goalProgress">Progress</label>
                            <input id="goalProgress" name="goalProgress" type="number" min="0" max="100" value="${this.escapeHTML(String(goal?.progress ?? 0))}">
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
                        <button class="primary-button" type="submit">${isEdit ? "Save changes" : "Create goal"}</button>
                    </div>
                </form>
            `
        );

        document.getElementById("goalTitle")?.focus();
    },

    submitGoalForm(form) {
        const id = form.elements.goalId.value;
        const title = form.elements.goalTitle.value.trim();
        const description = form.elements.goalDescription.value.trim();
        const progress = this.clamp(Number(form.elements.goalProgress.value) || 0, 0, 100);

        if (!title) {
            this.toast("Please enter a goal title.", "error");
            return;
        }

        if (id) {
            const goal = this.state.goals.find((item) => item.id === id);
            if (goal) {
                goal.title = title;
                goal.description = description;
                goal.progress = progress;
                goal.updatedAt = new Date().toISOString();
            }
            this.toast("Goal updated.", "success");
        } else {
            this.state.goals.push({
                id: this.generateId("goal"),
                title,
                description,
                progress,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            this.toast("Goal created.", "success");
        }

        this.safeSave();
        this.closeModal();
        this.renderPage("goals");
    },

    /* -------------------- FOCUS -------------------- */

    renderFocus(content) {
        const durationMinutes = Math.round(this.focus.duration / 60);
        const minutes = Math.floor(this.focus.remaining / 60).toString().padStart(2, "0");
        const seconds = (this.focus.remaining % 60).toString().padStart(2, "0");
        const history = this.state.focusHistory.slice(0, 7);

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">FOCUS</p>
                    <h2>Distraction-free study</h2>
                    <p>Give one block of time to one clear piece of work.</p>
                </div>
            </section>

            <section class="focus-shell">
                <article class="panel focus-card">
                    <div class="focus-mode">${this.focus.mode === "running" ? "FOCUSING" : "READY TO FOCUS"}</div>
                    <div class="focus-timer">${minutes}:${seconds}</div>
                    <div class="focus-status">
                        ${this.focus.mode === "running" ? "Stay with the task." : `${durationMinutes}-minute focus block`}
                    </div>

                    <div class="focus-controls">
                        <button class="primary-button" type="button" data-action="focus-toggle">
                            ${this.focus.running ? "Pause" : "Start focus"}
                        </button>
                        <button class="secondary-button" type="button" data-action="focus-reset">Reset</button>
                    </div>

                    <div class="focus-presets">
                        ${[25, 45, 60, 90].map((minutesValue) => `
                            <button class="preset-button ${durationMinutes === minutesValue ? "active" : ""}" type="button" data-focus-preset="${minutesValue}">
                                ${minutesValue} min
                            </button>
                        `).join("")}
                    </div>
                </article>

                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">RECENT SESSIONS</p>
                            <h3>Your focus history</h3>
                        </div>
                    </div>

                    ${
                        history.length
                            ? `<div class="focus-history">
                                ${history.map((entry) => `
                                    <div class="focus-history-item">
                                        <strong>${entry.minutes} min focus</strong>
                                        <span>${this.escapeHTML(entry.date)}</span>
                                    </div>
                                `).join("")}
                               </div>`
                            : `
                                <div class="empty-state">
                                    <div class="empty-icon">◷</div>
                                    <h4>No sessions yet</h4>
                                    <p>Your completed focus blocks will appear here.</p>
                                </div>
                            `
                    }
                </article>
            </section>
        `;
    },

    toggleFocus() {
        if (this.focus.running) {
            this.pauseFocus();
        } else {
            this.startFocus();
        }
    },

    startFocus() {
        if (this.focus.remaining <= 0) this.resetFocus();

        this.focus.running = true;
        this.focus.mode = "running";
        this.clearFocusInterval();

        this.focusInterval = window.setInterval(() => {
            this.focus.remaining -= 1;

            if (this.focus.remaining <= 0) {
                this.focus.remaining = 0;
                this.focus.running = false;
                this.focus.mode = "ready";
                this.clearFocusInterval();

                const completedMinutes = Math.round(this.focus.duration / 60);
                this.state.focusMinutes += completedMinutes;
                this.state.focusHistory.unshift({
                    id: this.generateId("focus"),
                    minutes: completedMinutes,
                    createdAt: new Date().toISOString(),
                    date: new Date().toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    })
                });
                this.state.focusHistory = this.state.focusHistory.slice(0, 30);
                this.bumpStreak();
                this.safeSave();
                this.toast(`Focus block complete — ${completedMinutes} minutes logged.`, "success");
            }

            this.renderPage("focus");
        }, 1000);

        this.renderPage("focus");
    },

    pauseFocus() {
        this.focus.running = false;
        this.focus.mode = "ready";
        this.clearFocusInterval();
        this.renderPage("focus");
        this.toast("Focus paused.");
    },

    resetFocus() {
        this.clearFocusInterval();
        this.focus.running = false;
        this.focus.mode = "ready";
        this.focus.remaining = this.focus.duration;
        this.renderPage("focus");
    },

    setFocusPreset(minutes) {
        if (!Number.isFinite(minutes) || minutes <= 0) return;

        this.clearFocusInterval();
        this.focus.running = false;
        this.focus.mode = "ready";
        this.focus.duration = minutes * 60;
        this.focus.remaining = minutes * 60;
        this.state.settings.defaultFocus = minutes;
        this.safeSave();
        this.renderPage("focus");
    },

    clearFocusInterval() {
        if (this.focusInterval) {
            window.clearInterval(this.focusInterval);
            this.focusInterval = null;
        }
    },

    /* -------------------- ANALYTICS -------------------- */

    renderAnalytics(content) {
        const totalTasks = this.state.tasks.length;
        const completed = this.getCompletedTasksCount();
        const completionRate = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
        const weeklyFocus = this.getWeeklyFocusMinutes();
        const sessions = this.state.plannerSessions.length;
        const priorityCounts = {
            high: this.state.tasks.filter((task) => task.priority === "high").length,
            medium: this.state.tasks.filter((task) => task.priority === "medium").length,
            low: this.state.tasks.filter((task) => task.priority === "low").length
        };

        const days = this.getLastSevenDays();
        const max = Math.max(...days.map((d) => d.minutes), 30);

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">INSIGHTS</p>
                    <h2>Study analytics</h2>
                    <p>Turn your activity into a simple picture of how you're studying.</p>
                </div>
            </section>

            <section class="analytics-grid">
                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">OVERVIEW</p>
                            <h3>Your current numbers</h3>
                        </div>
                    </div>
                    <div class="analytics-stat-grid">
                        <div class="analytics-mini"><span>Task completion</span><strong>${completionRate}%</strong></div>
                        <div class="analytics-mini"><span>Focus minutes</span><strong>${weeklyFocus}</strong></div>
                        <div class="analytics-mini"><span>Planned sessions</span><strong>${sessions}</strong></div>
                    </div>
                </article>

                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">TASK MIX</p>
                            <h3>Priority distribution</h3>
                        </div>
                    </div>
                    <div class="distribution-list">
                        ${this.distributionRow("High", priorityCounts.high, Math.max(totalTasks, 1))}
                        ${this.distributionRow("Medium", priorityCounts.medium, Math.max(totalTasks, 1))}
                        ${this.distributionRow("Low", priorityCounts.low, Math.max(totalTasks, 1))}
                    </div>
                </article>

                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">FOCUS TREND</p>
                            <h3>Last seven days</h3>
                        </div>
                    </div>
                    <div class="bar-chart">
                        ${days.map((day) => `
                            <div class="bar-column">
                                <div class="bar" style="height:${Math.max(5, Math.round((day.minutes / max) * 100))}%"></div>
                                <span class="bar-label">${day.short}</span>
                            </div>
                        `).join("")}
                    </div>
                </article>

                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">READ THIS</p>
                            <h3>What your data says</h3>
                        </div>
                    </div>
                    <div class="empty-state" style="min-height:210px;">
                        <div class="empty-icon">▥</div>
                        <h4>${completionRate >= 80 ? "Strong task follow-through" : completionRate >= 50 ? "Good momentum, keep refining" : "Start by making the next task obvious"}</h4>
                        <p>${weeklyFocus > 180 ? "Your recent focus volume is building a solid rhythm." : "A few consistent focus blocks each day can create a stronger study rhythm over time."}</p>
                    </div>
                </article>
            </section>
        `;
    },

    distributionRow(label, count, total) {
        const percent = Math.round((count / total) * 100);
        return `
            <div class="distribution-row">
                <span>${label}</span>
                <div class="distribution-track"><span style="width:${percent}%"></span></div>
                <span>${count}</span>
            </div>
        `;
    },

    /* -------------------- ACHIEVEMENTS -------------------- */

    renderAchievements(content) {
        const stats = {
            tasks: this.state.tasks.filter((task) => task.completed).length,
            focus: this.state.focusMinutes,
            goals: this.state.goals.filter((goal) => Number(goal.progress) >= 100).length,
            sessions: this.state.plannerSessions.filter((session) => session.completed).length,
            streak: this.state.studyStreak
        };

        const achievements = [
            { icon: "✓", title: "First step", description: "Complete your first task.", unlocked: stats.tasks >= 1 },
            { icon: "◷", title: "Deep work", description: "Log 60 focused minutes.", unlocked: stats.focus >= 60 },
            { icon: "◎", title: "Goal getter", description: "Complete one study goal.", unlocked: stats.goals >= 1 },
            { icon: "▦", title: "Planner in motion", description: "Complete three planned sessions.", unlocked: stats.sessions >= 3 },
            { icon: "🔥", title: "Consistency", description: "Build a 3-day study streak.", unlocked: stats.streak >= 3 },
            { icon: "★", title: "Momentum", description: "Complete 10 tasks.", unlocked: stats.tasks >= 10 }
        ];

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">MILESTONES</p>
                    <h2>Achievements</h2>
                    <p>Small wins are evidence that your study system is working.</p>
                </div>
            </section>

            <section class="achievement-grid">
                ${achievements.map((item) => `
                    <article class="achievement-card ${item.unlocked ? "" : "locked"}">
                        <div class="achievement-icon">${item.icon}</div>
                        ${item.unlocked ? '<span class="achievement-badge">Unlocked</span>' : ""}
                        <h4>${this.escapeHTML(item.title)}</h4>
                        <p>${this.escapeHTML(item.description)}</p>
                    </article>
                `).join("")}
            </section>
        `;
    },

    /* -------------------- PROFILE -------------------- */

    renderProfile(content) {
        const profile = this.state.profile;

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">ACCOUNT</p>
                    <h2>Your profile</h2>
                    <p>A simple home for your study identity and EduVora snapshot.</p>
                </div>
                <button class="primary-button" type="button" data-action="edit-profile">Edit profile</button>
            </section>

            <section class="profile-layout">
                <article class="panel profile-main-card">
                    <div class="profile-hero">
                        <div class="profile-avatar">${this.escapeHTML(this.getInitials(profile.name))}</div>
                        <div>
                            <h3>${this.escapeHTML(profile.name)}</h3>
                            <p>${this.escapeHTML(profile.bio)}</p>
                        </div>
                    </div>

                    <div class="profile-details">
                        ${this.profileDetail("Class", profile.className || "Not set")}
                        ${this.profileDetail("School", profile.school || "Not set")}
                        ${this.profileDetail("Subjects", profile.subjects || "Not set")}
                        ${this.profileDetail("Email", profile.email || "Not set")}
                    </div>

                    <div class="profile-about panel" style="margin-top:14px; padding:16px;">
                        <p class="eyebrow">ABOUT YOU</p>
                        <p>${this.escapeHTML(profile.bio || "Add a short introduction from Edit profile.")}</p>
                    </div>
                </article>

                <article class="panel">
                    <div class="section-header">
                        <div>
                            <p class="eyebrow">STUDY SNAPSHOT</p>
                            <h3>EduVora at a glance</h3>
                        </div>
                    </div>

                    <div class="profile-stats-list">
                        ${this.profileStat("Tasks", String(this.state.tasks.length))}
                        ${this.profileStat("Goals", String(this.state.goals.length))}
                        ${this.profileStat("Focus", `${this.state.focusMinutes} min`)}
                        ${this.profileStat("Sessions", String(this.state.plannerSessions.length))}
                        ${this.profileStat("Streak", `${this.state.studyStreak} days`)}
                    </div>
                </article>
            </section>
        `;
    },

    profileDetail(label, value) {
        return `
            <div class="profile-detail">
                <span>${this.escapeHTML(label)}</span>
                <strong>${this.escapeHTML(value)}</strong>
            </div>
        `;
    },

    profileStat(label, value) {
        return `
            <div class="profile-stat-row">
                <span>${this.escapeHTML(label)}</span>
                <strong>${this.escapeHTML(value)}</strong>
            </div>
        `;
    },

    openProfileModal() {
        const profile = this.state.profile;

        this.openModal(
            "profileModal",
            "Edit your profile",
            "Keep the details that make your EduVora workspace feel like yours.",
            `
                <form id="profileForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="profileName">Name</label>
                            <input id="profileName" name="profileName" type="text" maxlength="80" required value="${this.escapeHTML(profile.name)}">
                        </div>
                        <div class="form-group">
                            <label for="profileClass">Class</label>
                            <input id="profileClass" name="profileClass" type="text" maxlength="40" value="${this.escapeHTML(profile.className)}">
                        </div>
                        <div class="form-group">
                            <label for="profileSchool">School</label>
                            <input id="profileSchool" name="profileSchool" type="text" maxlength="120" value="${this.escapeHTML(profile.school)}">
                        </div>
                        <div class="form-group">
                            <label for="profileEmail">Email</label>
                            <input id="profileEmail" name="profileEmail" type="email" maxlength="160" value="${this.escapeHTML(profile.email)}">
                        </div>
                        <div class="form-group full">
                            <label for="profileSubjects">Subjects</label>
                            <input id="profileSubjects" name="profileSubjects" type="text" maxlength="200" value="${this.escapeHTML(profile.subjects)}">
                        </div>
                        <div class="form-group full">
                            <label for="profileBio">Bio</label>
                            <textarea id="profileBio" name="profileBio" maxlength="500">${this.escapeHTML(profile.bio)}</textarea>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
                        <button class="primary-button" type="submit">Save profile</button>
                    </div>
                </form>
            `
        );

        document.getElementById("profileName")?.focus();
    },

    submitProfileForm(form) {
        const name = form.elements.profileName.value.trim();

        if (!name) {
            this.toast("Your name cannot be empty.", "error");
            return;
        }

        this.state.profile = {
            name,
            className: form.elements.profileClass.value.trim(),
            school: form.elements.profileSchool.value.trim(),
            email: form.elements.profileEmail.value.trim(),
            subjects: form.elements.profileSubjects.value.trim(),
            bio: form.elements.profileBio.value.trim()
        };

        this.safeSave();
        this.updateProfileButton();
        this.closeModal();
        this.renderPage("profile");
        this.toast("Profile saved.", "success");
    },

    updateProfileButton() {
        const button = document.getElementById("profileButton");
        if (!button) return;
        button.textContent = this.getInitials(this.state.profile.name);
        button.title = "Open profile";
    },

    /* -------------------- SETTINGS -------------------- */

    renderSettings(content) {
        const settings = this.state.settings;

        content.innerHTML = `
            <section class="page-intro">
                <div>
                    <p class="eyebrow">ACCOUNT</p>
                    <h2>Settings</h2>
                    <p>Customize your EduVora workspace without disturbing your study data.</p>
                </div>
            </section>

            <section class="settings-layout">
                <article class="settings-section">
                    <div class="settings-section-head">
                        <h3>Appearance</h3>
                        <p>Choose how EduVora should look on your screen.</p>
                    </div>
                    <div class="setting-row">
                        <div class="setting-copy">
                            <strong>Theme</strong>
                            <span>Switch between the light and dark interface.</span>
                        </div>
                        <div class="setting-control">
                            <select data-setting="theme">
                                <option value="light" ${this.state.theme === "light" ? "selected" : ""}>Light</option>
                                <option value="dark" ${this.state.theme === "dark" ? "selected" : ""}>Dark</option>
                            </select>
                        </div>
                    </div>
                </article>

                <article class="settings-section">
                    <div class="settings-section-head">
                        <h3>Notifications</h3>
                        <p>Control small reminders inside your study workspace.</p>
                    </div>
                    <div class="setting-row">
                        <div class="setting-copy">
                            <strong>Study reminders</strong>
                            <span>Allow EduVora to keep reminder preferences enabled.</span>
                        </div>
                        <div class="setting-control">${this.toggleHTML("notifications", settings.notifications)}</div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-copy">
                            <strong>Auto-start break preference</strong>
                            <span>Remember that you prefer an automatic break after a focus block.</span>
                        </div>
                        <div class="setting-control">${this.toggleHTML("autoStartBreaks", settings.autoStartBreaks)}</div>
                    </div>
                </article>

                <article class="settings-section">
                    <div class="settings-section-head">
                        <h3>Study preferences</h3>
                        <p>Set the defaults that fit the way you study.</p>
                    </div>
                    <div class="setting-row">
                        <div class="setting-copy">
                            <strong>Daily focus target</strong>
                            <span>Minutes of focus you would like to reach each day.</span>
                        </div>
                        <div class="setting-control">
                            <input data-setting="studyTarget" type="number" min="15" max="720" step="5" value="${Number(settings.studyTarget) || 120}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-copy">
                            <strong>Default focus block</strong>
                            <span>The focus length used when you start the timer.</span>
                        </div>
                        <div class="setting-control">
                            <select data-setting="defaultFocus">
                                ${[25, 45, 60, 90].map((value) => `<option value="${value}" ${Number(settings.defaultFocus) === value ? "selected" : ""}>${value} minutes</option>`).join("")}
                            </select>
                        </div>
                    </div>
                </article>

                <article class="settings-section">
                    <div class="settings-section-head">
                        <h3>Data management</h3>
                        <p>Your data stays in this browser through local storage. You can keep a backup as a JSON file.</p>
                    </div>
                    <div class="data-actions">
                        <button class="secondary-button" type="button" data-action="export-data">Export data</button>
                        <button class="secondary-button" type="button" data-action="import-data">Import data</button>
                        <button class="danger-button" type="button" data-action="reset-data">Reset EduVora data</button>
                    </div>
                </article>

                <article class="settings-section">
                    <div class="settings-section-head">
                        <h3>About EduVora</h3>
                        <p>EduVora is a student-focused productivity website designed to feel like a calm study app.</p>
                    </div>
                    <div class="setting-row">
                        <div class="setting-copy">
                            <strong>Version</strong>
                            <span>Clean consolidated build</span>
                        </div>
                        <div class="setting-control settings-version">1.0.0</div>
                    </div>
                </article>
            </section>
        `;
    },

    toggleHTML(setting, checked) {
        return `
            <label class="toggle">
                <input type="checkbox" data-setting="${setting}" ${checked ? "checked" : ""}>
                <span class="toggle-slider"></span>
            </label>
        `;
    },

    updateSetting(key, target) {
        if (key === "theme") {
            this.state.theme = target.value;
            this.applyTheme();
        } else if (key === "notifications" || key === "autoStartBreaks") {
            this.state.settings[key] = target.checked;
        } else if (key === "studyTarget") {
            this.state.settings[key] = this.clamp(Number(target.value) || 120, 15, 720);
        } else if (key === "defaultFocus") {
            this.state.settings[key] = Number(target.value) || 25;
            if (this.state.currentPage === "focus" && !this.focus.running) {
                this.focus.duration = this.state.settings[key] * 60;
                this.focus.remaining = this.focus.duration;
            }
        }

        this.safeSave();

        if (this.state.currentPage === "settings") {
            this.renderPage("settings");
        }
    },

    exportData() {
        const payload = JSON.stringify(this.state, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "eduvora-backup.json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        this.toast("EduVora data exported.", "success");
    },

    importData() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";

        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result || ""));
                    this.state = this.deepMerge(this.state, parsed);
                    this.ensureState();
                    this.safeSave();
                    this.applyTheme();
                    this.renderPage(this.state.currentPage);
                    this.updateProfileButton();
                    this.toast("EduVora data imported.", "success");
                } catch (error) {
                    console.error(error);
                    this.toast("That backup file is not valid.", "error");
                }
            };

            reader.readAsText(file);
        });

        input.click();
    },

    resetData() {
        if (!window.confirm("This will remove your EduVora tasks, goals, planner sessions, focus history and profile settings from this browser. Continue?")) {
            return;
        }

        const keepTheme = this.state.theme;

        this.state = {
            currentPage: "dashboard",
            theme: keepTheme,
            tasks: [],
            goals: [],
            plannerSessions: [],
            focusMinutes: 0,
            studyStreak: 0,
            focusHistory: [],
            profile: {
                name: "Virat",
                className: "Class 10",
                school: "",
                bio: "Student • Web Developer • Lifelong Learner",
                subjects: "Mathematics, Science, Computer Science",
                email: ""
            },
            settings: {
                notifications: true,
                autoStartBreaks: false,
                studyTarget: 120,
                defaultFocus: 25
            }
        };

        this.resetFocusState();
        this.safeSave();
        this.applyTheme();
        this.renderPage("dashboard");
        this.updateProfileButton();
        this.toast("EduVora has been reset.", "success");
    },

    /* -------------------- GENERIC ACTIONS -------------------- */

    handleGenericAction(button) {
        const action = button.dataset.action;

        switch (action) {
            case "new-task":
                this.openTaskModal();
                break;
            case "new-goal":
                this.openGoalModal();
                break;
            case "new-session":
                this.openPlannerModal();
                break;
            case "edit-profile":
                this.openProfileModal();
                break;
            case "close-modal":
                this.closeModal();
                break;
            case "set-task-filter":
                this.currentTaskFilter = button.dataset.filter || "all";
                this.renderPage("tasks");
                break;
            case "select-date":
                this.plannerSelectedDate = button.dataset.date;
                this.renderPage("planner");
                break;
            case "planner-prev":
                this.shiftPlannerMonth(-1);
                break;
            case "planner-next":
                this.shiftPlannerMonth(1);
                break;
            case "planner-today":
                this.plannerSelectedDate = this.todayKey();
                this.plannerCurrentMonth = new Date();
                this.plannerCurrentMonth = new Date(
                    this.plannerCurrentMonth.getFullYear(),
                    this.plannerCurrentMonth.getMonth(),
                    1
                );
                this.renderPage("planner");
                break;
            case "focus-toggle":
                this.toggleFocus();
                break;
            case "focus-reset":
                this.resetFocus();
                break;
            case "export-data":
                this.exportData();
                break;
            case "import-data":
                this.importData();
                break;
            case "reset-data":
                this.resetData();
                break;
            default:
                break;
        }
    },

    /* -------------------- MODAL -------------------- */

    openModal(id, title, description, body) {
        this.closeModal();

        const root = document.getElementById("modalRoot");
        if (!root) return;

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.id = id;
        overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}Title">
                <div class="modal-header">
                    <div>
                        <h3 id="${id}Title">${this.escapeHTML(title)}</h3>
                        <p>${this.escapeHTML(description)}</p>
                    </div>
                    <button class="modal-close" type="button" data-action="close-modal" aria-label="Close">×</button>
                </div>
                ${body}
            </div>
        `;

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) this.closeModal();
        });

        root.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add("visible");
        });
    },

    closeModal() {
        const root = document.getElementById("modalRoot");
        if (!root) return;

        const modal = root.firstElementChild;
        if (!modal) return;

        modal.classList.remove("visible");

        window.setTimeout(() => {
            modal.remove();
        }, 180);
    },

    /* -------------------- HELPERS -------------------- */

    updateDateEverywhere() {
        const date = this.getLongDate();
        const element = document.getElementById("currentDate");
        if (element) element.textContent = date;
    },

    updateDashboardData() {
        if (this.state.currentPage === "dashboard") {
            this.renderDashboard(document.getElementById("pageContent"));
        }
        this.updateProfileButton();
    },

    getCompletedTasksCount() {
        return this.state.tasks.filter((task) => task.completed).length;
    },

    getSessionsForDate(dateKey) {
        return this.state.plannerSessions
            .filter((session) => session.date === dateKey)
            .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    },

    getWeeklyFocusMinutes() {
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - 6);

        return this.state.focusHistory.reduce((total, entry) => {
            const date = new Date(entry.createdAt || entry.date);
            return date >= cutoff ? total + Number(entry.minutes || 0) : total;
        }, 0);
    },

    getLastSevenDays() {
        const days = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - i);

            const key = this.toDateKey(date);
            const minutes = this.state.focusHistory
                .filter((entry) => entry.createdAt && this.toDateKey(new Date(entry.createdAt)) === key)
                .reduce((sum, entry) => sum + Number(entry.minutes || 0), 0);

            days.push({
                key,
                minutes,
                short: date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 1),
                label: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
            });
        }

        return days;
    },

    shiftPlannerMonth(delta) {
        this.initializePlannerState();

        this.plannerCurrentMonth = new Date(
            this.plannerCurrentMonth.getFullYear(),
            this.plannerCurrentMonth.getMonth() + delta,
            1
        );

        this.renderPage("planner");
    },

    formatPlannerMonth(date) {
        return date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });
    },

    formatPlannerDate(key) {
        const date = new Date(`${key}T00:00:00`);
        return date.toLocaleDateString("en-IN", {
            weekday: "long",
            month: "long",
            day: "numeric"
        });
    },

    formatTaskDate(key) {
        const date = new Date(`${key}T00:00:00`);
        if (Number.isNaN(date.getTime())) return "No due date";
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    },

    formatTime(value) {
        if (!value) return "";
        const [hours, minutes] = String(value).split(":").map(Number);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit"
        });
    },

    getLongDate() {
        return new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            month: "long",
            day: "numeric"
        });
    },

    todayKey() {
        return this.toDateKey(new Date());
    },

    toDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    },

    getInitials(name) {
        const parts = String(name || "V").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "V";
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    capitalize(value) {
        const text = String(value || "");
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    generateId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    },

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    bumpStreak() {
        this.state.studyStreak = Math.max(1, Number(this.state.studyStreak) || 0);
    },

    resetFocusState() {
        this.clearFocusInterval();
        const minutes = Number(this.state.settings.defaultFocus) || 25;
        this.focus = {
            mode: "ready",
            duration: minutes * 60,
            remaining: minutes * 60,
            running: false
        };
    },

    escapeHTML(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    },

    toast(message, type = "success") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        window.setTimeout(() => {
            toast.remove();
        }, 2600);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    Eduvora.init();
});
