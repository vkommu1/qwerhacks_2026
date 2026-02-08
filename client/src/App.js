// src/App.js
import React, { Component } from "react";
import { BrowserRouter as Router, Route, Switch, Link, withRouter } from "react-router-dom";
import Home from "./components/Home";
import Checklist from './components/Checklist';
import Resources from './components/Resources';
import Login from './components/Login';
import Register from './components/Register';
import { UserProvider, useUser } from './contexts/UserContext';
import { trackPageView } from './services/api';
import Donations from "./components/Donations";


// Navigation component that has access to user context
// Navigation component that has access to user context
function Navigation() {
  const { user, logout } = useUser();

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    color: "black",
    border: "none",
    borderRadius: "50px", // Medium rounded
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600"
  };

  return (
    <nav style={{ 
      padding: 12, 
      display: "flex", 
      gap: 12, 
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "2px solid #eee"
    }}>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/">
          <button style={buttonStyle}>Home</button>
        </Link>

        <Link to="/checklist">
          <button style={buttonStyle}>Daily Check-in!</button>
        </Link>

        <Link to="/donations">
          <button style={buttonStyle}>Donations :)</button>
        </Link>

        <Link to="/resources">
          <button style={buttonStyle}>Resources</button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: "14px" }}>
              👋 Welcome, <strong>{user.username}</strong>
            </span>
            <button style={buttonStyle} onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">
              <button style={buttonStyle}>Login</button>
            </Link>
            <Link to="/register">
              <button style={buttonStyle}>Register</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

// Component to track route changes
class RouteTracker extends Component {
  componentDidMount() {
    trackPageView(this.props.location.pathname);
  }

  componentDidUpdate(prevProps) {
    if (this.props.location.pathname !== prevProps.location.pathname) {
      trackPageView(this.props.location.pathname);
    }
  }

  render() {
    return this.props.children;
  }
}

const RouteTrackerWithRouter = withRouter(RouteTracker);

// Main app content with routing
function AppContent() {
  return (
    <div className="App">
      <Navigation />
      <RouteTrackerWithRouter>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/checklist" component={Checklist} />
          <Route path="/donations" component={Donations} />
          <Route path="/resources" component={Resources} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
        </Switch>
      </RouteTrackerWithRouter>
    </div>
  );
}

// Main App component wrapped with providers
class App extends Component {
  render() {
    return (
      <UserProvider>
        <Router>
          <AppContent />
        </Router>
      </UserProvider>
    );
  }
}

export default App;