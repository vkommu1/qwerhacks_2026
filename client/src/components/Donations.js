import React, { Component } from "react";

class Donations extends Component {
  render() {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "32px auto",
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 14,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          💸 Donations (for the planet… eventually)
        </h2>

        <p style={{ fontSize: 16, lineHeight: 1.5 }}>
          Welcome to the donations page.
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.5 }}>
          <em>
            In the future, this will link to vetted climate and sustainability
            organizations. 
          </em>
        </p>

        <div style={{ margin: "20px 0" }}>
          <a
            href="https://venmo.com/Ryan-Chu-12"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              borderRadius: 12,
              background: "#3D95CE",
              color: "white",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Donate via Venmo
          </a>
        </div>

        <p style={{ fontSize: 13, opacity: 0.8 }}>
          Disclaimer: the Lorax is watching
        </p>
      </div>
    );
  }
}

export default Donations;
