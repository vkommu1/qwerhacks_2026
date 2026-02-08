import React, { Component } from 'react';
import loraxImage from './lorax.png';

class Resources extends Component {
  render() {
    const styles = {
      page: {
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ffbf69, #b2f6a6)',
        padding: '60px 20px',
        fontFamily: "'Comic Sans MS', 'Trebuchet MS', cursive",
        color: '#3a2f1c',
        textAlign: 'center'
      },

      title: {
        fontSize: '3rem',
        marginBottom: '10px'
      },

      subtitle: {
        fontSize: '1.2rem',
        maxWidth: '600px',
        margin: '0 auto 40px'
      },

      list: {
        listStyle: 'none',
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '30px',
        maxWidth: '1000px',
        margin: '0 auto 80px'
      },

      card: {
        background: '#fff7e6',
        borderRadius: '25px',
        padding: '25px',
        boxShadow: '0 8px 0 #fcd0aa'
      },

      link: {
        display: 'block',
        fontSize: '1.3rem',
        fontWeight: '700',
        color: '#2f7d32',
        textDecoration: 'none',
        marginBottom: '10px'
      },

      text: {
        fontSize: '1rem',
        lineHeight: '1.5'
      },

      loraxContainer: {
        position: 'relative',
        marginTop: '40px'
      },

      loraxImage: {
        width: '420px',
        maxWidth: '95%',
        display: 'block',
        margin: '0 auto'
      },

      speechBubble: {
        position: 'absolute',
        top: '-40px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#ffffff',
        padding: '18px 25px',
        borderRadius: '25px',
        fontSize: '1.2rem',
        fontWeight: '700',
        boxShadow: '0 6px 0 #cefcaa'
      },

      speechTail: {
        position: 'absolute',
        bottom: '-12px',
        left: '40%',
        width: 0,
        height: 0,
        borderLeft: '12px solid transparent',
        borderRight: '12px solid transparent',
        borderTop: '12px solid #ffffff'
      }
    };

    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Sustainability Resources 🌱</h1>

        <p style={styles.subtitle}>
          “Unless someone like you cares a whole awful lot, nothing is going to get better. It's not."
        </p>

        <ul style={styles.list}>
          <li style={styles.card}>
            <a
              style={styles.link}
              href="https://www.un.org/sustainabledevelopment/"
              target="_blank"
              rel="noopener noreferrer"
            >
              UN Sustainable Development Goals
            </a>
            <p style={styles.text}>
              Global goals focused on ending poverty, protecting the planet, and ensuring prosperity.
            </p>
          </li>

          <li style={styles.card}>
            <a
              style={styles.link}
              href="https://www.epa.gov/sustainability"
              target="_blank"
              rel="noopener noreferrer"
            >
              US EPA Sustainability
            </a>
            <p style={styles.text}>
              Resources on sustainable practices, energy efficiency, and environmental protection.
            </p>
          </li>

          <li style={styles.card}>
            <a
              style={styles.link}
              href="https://www.worldwildlife.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              World Wildlife Fund (WWF)
            </a>
            <p style={styles.text}>
              Learn about conservation efforts and how to reduce your environmental impact.
            </p>
          </li>

          <li style={styles.card}>
            <a
              style={styles.link}
              href="https://www.drawdown.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Project Drawdown
            </a>
            <p style={styles.text}>
              Research-backed climate solutions to reduce greenhouse gas emissions.
            </p>
          </li>
        </ul>

        {/* Lorax + Speech Bubble */}
        <div style={styles.loraxContainer}>
          <div style={styles.speechBubble}>
            Find resources here!
            <div style={styles.speechTail}></div>
          </div>

          <img
            src={loraxImage}
            alt="The Lorax"
            style={styles.loraxImage}
          />
        </div>
      </div>
    );
  }
}

export default Resources;
