import React, { Component } from "react";

const STORAGE_KEY = "sustainability_streak_v1";

function todayKey(d = new Date()) {
  // Use local date (not UTC) so “day” matches the user’s day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

class Checklist extends Component {
  state = {
    streak: 0,
    lastCheckInDay: null, // "YYYY-MM-DD"
    checkedInToday: false,
    actions: [
      { id: "reusable_bottle", label: "Used a reusable bottle", doneToday: false },
      { id: "walk_transit", label: "Walked / biked / transit instead of driving", doneToday: false },
      { id: "meatless_meal", label: "Had a meatless meal", doneToday: false },
      { id: "no_single_use", label: "Avoided single-use plastic today", doneToday: false },
      { id: "lights_off", label: "Turned off unused lights / unplugged", doneToday: false },
    ],
    message: "",
  };

  componentDidMount() {
    this.load();
    this.rolloverIfNewDay();
  }

  save = () => {
    const { streak, lastCheckInDay, actions } = this.state;
    const payload = { streak, lastCheckInDay, actions };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  load = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      this.setState({
        streak: parsed.streak !== undefined ? parsed.streak : 0,
        lastCheckInDay:
            parsed.lastCheckInDay !== undefined ? parsed.lastCheckInDay : null,
        actions:
            parsed.actions !== undefined ? parsed.actions : this.state.actions,
        });

    } catch {
      // ignore corrupted storage
    }
  };

  rolloverIfNewDay = () => {
    const t = todayKey();
    // Clear "doneToday" flags each new day
    // (If you want multi-day history later, store an array per date.)
    if (this.state.lastCheckInDay !== t) {
      this.setState(
        (prev) => ({
          actions: prev.actions.map((a) => ({ ...a, doneToday: false })),
          checkedInToday: false,
          message: "",
        }),
        this.save
      );
    }
  };

  toggleAction = (id) => {
    this.setState(
      (prev) => ({
        actions: prev.actions.map((a) =>
          a.id === id ? { ...a, doneToday: !a.doneToday } : a
        ),
        message: "",
      }),
      this.save
    );
  };

  checkIn = () => {
    const t = todayKey();
    if (this.state.checkedInToday) {
      this.setState({ message: "You already checked in today ✅" });
      return;
    }

    const didSomething = this.state.actions.some((a) => a.doneToday);
    if (!didSomething) {
      this.setState({ message: "Pick at least one action to check in 🌱" });
      return;
    }

    const y = yesterdayKey();
    const last = this.state.lastCheckInDay;

    let newStreak = 1;
    if (last === y) newStreak = this.state.streak + 1;
    else if (last === t) newStreak = this.state.streak; // shouldn't happen due to checkedInToday check
    else newStreak = 1; // missed a day -> reset

    this.setState(
      {
        streak: newStreak,
        lastCheckInDay: t,
        checkedInToday: true,
        message: newStreak >= 3 ? "🔥 Nice! Your streak is growing!" : "✅ Check-in complete!",
      },
      this.save
    );
  };

  getProgress = () => {
    const total = this.state.actions.length;
    const done = this.state.actions.filter((a) => a.doneToday).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  render() {
    const { done, total, pct } = this.getProgress();

    return (
      <div style={{ maxWidth: 520, margin: "24px auto", padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>🌿 Sustainability Streak</h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 18 }}>
            <strong>Streak:</strong> {this.state.streak} day{this.state.streak === 1 ? "" : "s"} 🔥
          </div>
          <div style={{ marginLeft: "auto", fontSize: 14, opacity: 0.8 }}>
            Today: {done}/{total} ({pct}%)
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          {this.state.actions.map((a) => (
            <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0" }}>
              <input
                type="checkbox"
                checked={a.doneToday}
                onChange={() => this.toggleAction(a.id)}
                disabled={this.state.checkedInToday} // lock actions after check-in (Duolingo-ish)
              />
              <span>{a.label}</span>
            </label>
          ))}
        </div>

        <button
          onClick={this.checkIn}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {this.state.checkedInToday ? "Checked in ✅" : "Check in for today"}
        </button>

        {this.state.message && (
          <div style={{ marginTop: 10, fontSize: 14 }}>
            {this.state.message}
          </div>
        )}

        {!this.state.checkedInToday && (
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>
            Tip: doing <strong>one</strong> small thing daily beats perfection. Keep the streak alive 🌱
          </div>
        )}
      </div>
    );
  }
}

export default Checklist;
