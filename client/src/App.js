import React, { Component } from "react";
import { BrowserRouter as Router, Route, Switch, Link } from "react-router-dom";
import Home from "./components/Home";
import Checklist from './components/Checklist';
import Resources from './components/Resources';


class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <nav style={{ padding: 12, display: "flex", gap: 12 }}>
            <Link to="/">
              <button>🏠 Home</button>
            </Link>

            <Link to="/checklist">
              <button>🌱 Checklist</button>
            </Link>

            <Link to="/donations">
              <button>💸 Donations</button>
            </Link>
          </nav>
          <Switch>
            <Route exact path="/" component={Home} />
            <Route path="/checklist" component={Checklist} />
            <Route path="/donations" component={Checklist} />
          </Switch>

        </div>
      </Router>
    );
  }
}

export default App;
