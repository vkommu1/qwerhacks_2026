import React, { Component } from "react";
import {
  getCurrentUser,
  getTodayChecklist,
  setChecklistItem,
  checkInToday,
} from "../services/api";

// If your images are physically located in src/components/
import sadLorax from "../components/sadlorax.png";
import regularLorax from "../components/regularlorax.png";
import happyLorax from "../components/happylorax.png";

const DEFAULT_ACTIONS = [
  { id: "reusable_bottle", label: "Used a reusable bottle", doneToday: false },
  { id: "walk_transit", label: "Walked / biked / transit instead of driving", doneToday: false },
  { id: "meatless_meal", label: "Had a meatless meal", doneToday: false },
  { id: "no_single_use", label: "Avoided single-use plastic today", doneToday: false },
  { id: "lights_off", label: "Turned off unused lights / unplugged", doneToday: false },
];

class Checklist extends Component {
  state = {
    user: null,

    loading: true,
    saving: false,

    // DB-backed
    day: null, // "YYYY-MM-DD"
    streak: 0,
    checkedInToday: false,

    actions: DEFAULT_ACTIONS,
    message: "",
    error: "",
  };

  componentDidMount() {
    const user = getCurrentUser();
    this.setState({ user }, () => {
      if (!user) {
        this.setState({ loading: false });
      } else {
        this.refreshFromServer();
      }
    });
  }

  refreshFromServer = async () => {
    this.setState({ loading: true, error: "", message: "" });

    try {
      const data = await getTodayChecklist();
      // data: { day, checkedInToday, streak, items:[{action_id, done}] }

      const doneMap = {};
      if (Array.isArray(data.items)) {
        data.items.forEach((it) => {
          doneMap[it.action_id] = it.done === 1;
        });
      }

      const mergedActions = DEFAULT_ACTIONS.map((a) => ({
        ...a,
        doneToday: doneMap[a.id] === true,
      }));

      this.setState({
        day: data.day || null,
        streak: typeof data.streak === "number" ? data.streak : 0,
        checkedInToday: !!data.checkedInToday,
        actions: mergedActions,
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
      this.setState({ message: "Pick at least one action to check in 🌱", error: "" });
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
        message: newStreak >= 3 ? "🔥 Nice! Your streak is growing!" : "✅ Check-in complete!",
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
          <span role="img" aria-label="leaf">🌿</span> Sustainability Streak
        </h2>
        <div style={{ fontSize: 14, marginTop: 8 }}>
          You need to <strong>log in</strong> to track your checklist + streak.
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
          Guests can still browse resources — but streak tracking is saved per account.
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
    if (!this.state.user) {
      return this.renderLoginGate();
    }

    const { done, total, pct } = this.getProgress();
    const { loading, saving, error, message, checkedInToday, streak, user, day } = this.state;

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
          <span role="img" aria-label="leaf">🌿</span> Sustainability Streak
        </h2>

        <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          Logged in as: {user.username || user.email || user.id}
          {day ? ` • Day: ${day}` : ""}
        </div>

        {loading ? (
          <div style={{ padding: "10px 0", fontSize: 14 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 18 }}>
                <strong>Streak:</strong> {streak} day{streak === 1 ? "" : "s"}
              </div>
              <div style={{ marginLeft: "auto", fontSize: 14, opacity: 0.8 }}>
                Today: {done}/{total} ({pct}%)
              </div>
            </div>

            {/* ✅ Lorax image based on progress */}
            <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 14px" }}>
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

            <div style={{ marginBottom: 12 }}>
              {this.state.actions.map((a) => (
                <label
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 0",
                    opacity: checkedInToday ? 0.9 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={a.doneToday}
                    onChange={() => this.toggleAction(a.id)}
                  />
                  <span>{a.label}</span>
                </label>
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
              {checkedInToday ? "Checked in (edits allowed)" : saving ? "Saving..." : "Check in for today"}
            </button>

            {message && <div style={{ marginTop: 10, fontSize: 14 }}>{message}</div>}

            {!checkedInToday && (
              <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>
                Tip: doing <strong>one</strong> small thing daily beats perfection. Keep the streak alive{" "}
                <span role="img" aria-label="seedling">🌱</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default Checklist;
