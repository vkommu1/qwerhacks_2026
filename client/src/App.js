import React, { Component } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Home from "./components/Home";
import Checklist from './components/Checklist';
import Resources from './components/Resources';


class App extends Component {
  render() {
    return (
      <div className="App">
	      <Router>
		      <div>
			      <Route exact path="/" component={Home} />
		      </div>
	      </Router>
        <Router>
		      <div>
			      <Route exact path="/checklist" component={Checklist} />
		      </div>
	      </Router>
        <Router>
		      <div>
			      <Route exact path="/resources" component={Resources} />
		      </div>
	      </Router>
      </div>
    );
  }
}

export default App;
