import React, { Component } from "react";
import {
  getCurrentUser,
  getTodayChecklist,
  setChecklistItem,
  checkInToday,
  getChecklistTasks,
  addChecklistTask,
  deleteChecklistTask,
} from "../services/api";

// If your images are physically located in src/components/
import sadLorax from "../components/sadlorax.png";
import regularLorax from "../components/regularlorax.png";
import happyLorax from "../components/happylorax.png";

const DEFAULT_ACTIONS = [
  { id: "reusable_bottle", label: "Used a reusable bottle" },
  { id: "walk_transit", label: "Walked / biked / transit instead of driving" },
  { id: "meatless_meal", label: "Had a meatless meal" },
  { id: "no_single_use", label: "Avoided single-use plastic today" },
  { id: "lights_off", label: "Turned off unused lights / unplugged" },
];

class Checklist extends Component {
  state = {
    user: null,
    loading: true,
    saving: false,

    // DB-backed
    day: null,
    streak: 0,
    checkedInToday: false,

    // merged actions (defaults + custom)
    actions: [],

    // custom tasks
    customTasks: [],

    // add task form
    newTaskLabel: "",

    message: "",
    error: "",
  };

  componentDidMount() {
    const user = getCurrentUser();
    this.setState({ user }, () => {
      if (!user) this.setState({ loading: false });
      else this.refreshFromServer();
    });
  }

  refreshFromServer = async () => {
    this.setState({ loading: true, error: "", message: "" });

    try {
      // Fetch today's checklist state + streak
      const checklist = await getTodayChecklist();
      // Fetch custom tasks
      const customTasks = await getChecklistTasks(); // [{action_id, label}]

      // Build done map from server items
      const doneMap = {};
      if (Array.isArray(checklist.items)) {
        checklist.items.forEach((it) => {
          doneMap[it.action_id] = it.done === 1;
        });
      }

      // Merge default + custom into one list (in order)
      const merged = [
        ...DEFAULT_ACTIONS.map((a) => ({
          id: a.id,
          label: a.label,
          isCustom: false,
          doneToday: doneMap[a.id] === true,
        })),
        ...customTasks.map((t) => ({
          id: t.action_id,
          label: t.label,
          isCustom: true,
          doneToday: doneMap[t.action_id] === true,
        })),
      ];

      this.setState({
        day: checklist.day || null,
        streak: typeof checklist.streak === "number" ? checklist.streak : 0,
        checkedInToday: !!checklist.checkedInToday,
        customTasks,
        actions: merged,
        loading: false,
      });
    } catch (e) {
      this.setState({
        loading: false,
        error: e.message || "Failed to load checklist.",
      });
    }
  };

  toggleAction = async (id) => {
    if (!this.state.user) return;

    const current = this.state.actions.find((a) => a.id === id);
    const nextDone = !(current && current.doneToday);

    // optimistic
    this.setState((prev) => ({
      actions: prev.actions.map((a) =>
        a.id === id ? { ...a, doneToday: nextDone } : a
      ),
      error: "",
      message: prev.checkedInToday ? "Updated today's checklist ✅" : "",
      saving: true,
    }));

    try {
      await setChecklistItem(id, nextDone);
      this.setState({ saving: false });
    } catch (e) {
      // rollback
      this.setState((prev) => ({
        actions: prev.actions.map((a) =>
          a.id === id ? { ...a, doneToday: !nextDone } : a
        ),
        saving: false,
        error: e.message || "Failed to save your change.",
        message: "",
      }));
    }
  };

  checkIn = async () => {
    if (!this.state.user) return;

    if (this.state.checkedInToday) {
      this.setState({ message: "You already checked in today ✅", error: "" });
      return;
    }

    const didSomething = this.state.actions.some((a) => a.doneToday);
    if (!didSomething) {
      this.setState({
        message: "Pick at least one action to check in 🌱",
        error: "",
      });
      return;
    }

    this.setState({ saving: true, error: "", message: "" });

    try {
      const result = await checkInToday();
      const newStreak =
        typeof result.streak === "number" ? result.streak : this.state.streak;

      this.setState({
        saving: false,
        checkedInToday: true,
        day: result.day || this.state.day,
        streak: newStreak,
        message:
          newStreak >= 3
            ? "🔥 Nice! Your streak is growing!"
            : "✅ Check-in complete!",
      });
    } catch (e) {
      this.setState({
        saving: false,
        error: e.message || "Check-in failed.",
      });
    }
  };

  getProgress = () => {
    const total = this.state.actions.length;
    const done = this.state.actions.filter((a) => a.doneToday).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  // ---------------- custom task UI ----------------
  onChangeNewTask = (e) => this.setState({ newTaskLabel: e.target.value });

  addTask = async () => {
    const label = (this.state.newTaskLabel || "").trim();
    if (!label) {
      this.setState({ error: "Task label can't be empty." });
      return;
    }

    this.setState({ saving: true, error: "", message: "" });

    try {
      await addChecklistTask(label);
      this.setState({ newTaskLabel: "", saving: false, message: "Task added ✅" });
      await this.refreshFromServer();
    } catch (e) {
      this.setState({ saving: false, error: e.message || "Failed to add task." });
    }
  };

  removeTask = async (actionId) => {
    this.setState({ saving: true, error: "", message: "" });

    try {
      await deleteChecklistTask(actionId);
      this.setState({ saving: false, message: "Task removed ✅" });
      await this.refreshFromServer();
    } catch (e) {
      this.setState({
        saving: false,
        error: e.message || "Failed to remove task.",
      });
    }
  };

  renderLoginGate() {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "24px auto",
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          <span role="img" aria-label="leaf">
            🌿
          </span>{" "}
          Sustainability Streak
        </h2>
        <div style={{ fontSize: 14, marginTop: 8 }}>
          You need to <strong>log in</strong> to track your checklist + streak.
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
          Guests can still browse resources — but streak tracking is saved per
          account.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <a
            href="/login"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#111",
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Log in
          </a>
          <a
            href="/register"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              color: "#111",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Register
          </a>
        </div>
      </div>
    );
  }

  render() {
    if (!this.state.user) return this.renderLoginGate();

    const { done, total, pct } = this.getProgress();
    const { loading, saving, error, message, checkedInToday, streak, user, day } =
      this.state;

    // ✅ Lorax logic: sad if < 50%
    //const isSad = pct < 50;
    //const loraxImg = isSad ? sadLorax : regularLorax;
    //const loraxAlt = isSad ? "Sad Lorax" : "Happy Lorax";
let loraxImg;
let loraxAlt;
let loraxMessage;
    if (pct < 50) {
  loraxImg = sadLorax;
  loraxAlt = "Sad Lorax";
  loraxMessage = "The Lorax is disappointed in you...";
} else if (pct < 100) {
  loraxImg = regularLorax;
  loraxAlt = "Regular Lorax";
  loraxMessage = "The Lorax approves! Keep it up.";
} else {
  loraxImg = happyLorax;
  loraxAlt = "Happy Lorax";
  loraxMessage = "Perfect! You made the Lorax proud.";
}

    return (
      <div
        style={{
          maxWidth: 520,
          margin: "24px auto",
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          <span role="img" aria-label="leaf">
            🌿
          </span>{" "}
          Sustainability Streak
        </h2>

        <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Logged in as: {user.username || user.email || user.id}
          {day ? ` • Day: ${day}` : ""}
        </div>

        {loading ? (
          <div style={{ padding: "10px 0", fontSize: 14 }}>Loading...</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 18 }}>
                <strong>Streak:</strong> {streak} day{streak === 1 ? "" : "s"}
              </div>
              <div style={{ marginLeft: "auto", fontSize: 14, opacity: 0.8 }}>
                Today: {done}/{total} ({pct}%)
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                margin: "10px 0 14px",
              }}
            >
              <img
                src={loraxImg}
                alt={loraxAlt}
                style={{
                  width: 220,
                  maxWidth: "90%",
                  height: "auto",
                  borderRadius: 12,
                  border: "1px solid #eee",
                }}
              />
            </div>
            
            <div style={{ textAlign: "center", fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
                {loraxMessage}
            </div>


            {error && (
              <div
                style={{
                  padding: "10px",
                  marginBottom: 10,
                  backgroundColor: "#fee",
                  color: "#900",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div style={{ marginBottom: 10, fontSize: 14 }}>{message}</div>
            )}

            {/* ADD CUSTOM TASK */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <input
                value={this.state.newTaskLabel}
                onChange={this.onChangeNewTask}
                placeholder="Add your own task (e.g., composted today)"
                style={{
                  flex: 1,
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
              <button
                onClick={this.addTask}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Add
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              {this.state.actions.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 0",
                    opacity: checkedInToday ? 0.9 : 1,
                  }}
                >
                  <label style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={a.doneToday}
                      onChange={() => this.toggleAction(a.id)}
                    />
                    <span>
                      {a.label}{" "}
                      {a.isCustom ? (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>(custom)</span>
                      ) : null}
                    </span>
                  </label>

                  {/* Only allow deleting custom tasks */}
                  {a.isCustom && (
                    <button
                      onClick={() => this.removeTask(a.id)}
                      disabled={saving}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 10,
                        padding: "6px 10px",
                        cursor: saving ? "not-allowed" : "pointer",
                        background: "white",
                      }}
                      aria-label={`Delete custom task ${a.label}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={this.checkIn}
              disabled={saving}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {checkedInToday
                ? "Checked in (edits allowed)"
                : saving
                ? "Saving..."
                : "Check in for today"}
            </button>

            {!checkedInToday && (
              <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>
                Tip: doing <strong>one</strong> small thing daily beats perfection. Keep the
                streak alive{" "}
                <span role="img" aria-label="seedling">
                  🌱
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default Checklist;
