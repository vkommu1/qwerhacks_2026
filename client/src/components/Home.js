import React, { Component } from "react";
import loraxImage from "./loraxmustache.jpg";

class Home extends Component {
  render() {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(180deg, #f7b600, #f7b600)",
          textAlign: "center",
          fontFamily: "'Baloo 2', cursive", // 👈 font applied here
		  paddingTop: "80px",
        }}
      >
        <h1
          style={{
            fontSize: "3.5rem",
            marginBottom: "10px",
            color: "#3a2f1c",
          }}
        >
          The Lorax Welcomes You!
        </h1>

        <p
          style={{
            fontSize: "1.3rem",
            marginBottom: "30px",
            color: "#3a2f1c",
            maxWidth: "600px",
          }}
        >
          The Lorax speaks for the trees. Save the trees one habit at a time!
        </p>

        <img
          src={loraxImage}
          alt="The Lorax"
          style={{
            width: "600px",
            maxWidth: "90vw",
            borderRadius: "20px",
            boxShadow: "0 12px 0 #e07a1f",
          }}
        />
      </div>
    );
  }
}

export default Home;
