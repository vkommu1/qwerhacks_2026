import React, { Component } from 'react';

class Resources extends Component {

	render() {
		return(
			<div>
				<h1>Sustainability Resources 🌱</h1>

				<p>
					Explore tools, organizations, and guides that support environmental
					sustainability and climate action.
				</p>

				<ul>
					<li>
						<a href="https://www.un.org/sustainabledevelopment/" target="_blank" rel="noopener noreferrer">
							UN Sustainable Development Goals
						</a>
						<p>Global goals focused on ending poverty, protecting the planet, and ensuring prosperity.</p>
					</li>

					<li>
						<a href="https://www.epa.gov/sustainability" target="_blank" rel="noopener noreferrer">
							US EPA Sustainability
						</a>
						<p>Resources on sustainable practices, energy efficiency, and environmental protection.</p>
					</li>

					<li>
						<a href="https://www.worldwildlife.org/" target="_blank" rel="noopener noreferrer">
							World Wildlife Fund (WWF)
						</a>
						<p>Learn about conservation efforts and how to reduce your environmental impact.</p>
					</li>

					<li>
						<a href="https://www.drawdown.org/" target="_blank" rel="noopener noreferrer">
							Project Drawdown
						</a>
						<p>Research-backed climate solutions to reduce greenhouse gas emissions.</p>
					</li>
				</ul>
			</div>
		);
	}
}

export default Resources;
