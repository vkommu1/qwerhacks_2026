import React, { Component } from "react";
import loraxImage from "./moneylorax.png";

class Donations extends Component {
  render() {
    return (
      // Outer page container
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #c8fbba, #51a32b)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center", // centers vertically on page
        }}
      >
        {/* Inner row container */}
        <div
          style={{
            display: "flex",
            alignItems: "center", // aligns Loraxes to box
            padding: "40px",
          }}
        >
          {/* Left Lorax */}
          <img
            src={loraxImage}
            alt="Money Lorax left"
            style={{
              width: "500px",
              maxWidth: "30vw",
            }}
          />

          {/* Main Donation Box */}
          <div
            style={{
              maxWidth: 600,
              padding: 20,
              margin: "0 40px",
              border: "1px solid #ddd",
              borderRadius: 14,
              background: "#fff7e6",
              boxShadow: "0 8px 0 #1fe069",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Donations (for the planet… eventually)
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

          {/* Right Lorax */}
          <img
            src={loraxImage}
            alt="Money Lorax right"
            style={{
              width: "500px",
              maxWidth: "30vw",
              transform: "scaleX(-1)",
            }}
          />
        </div>
      </div>
    );
  }
}

export default Donations;
