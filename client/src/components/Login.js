// src/components/Login.js
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { loginUser } from '../services/api';

class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            error: '',
            loading: false
        };
    }

    handleSubmit = async (e) => {
        e.preventDefault();
        this.setState({ error: '', loading: true });

        try {
            await loginUser(this.state.username, this.state.password);
            this.props.history.push('/'); // Redirect to home after successful login
            window.location.reload(); // Reload to update user context
        } catch (err) {
            this.setState({ 
                error: err.message || 'Login failed',
                loading: false 
            });
        }
    };

    render() {
        const { username, password, error, loading } = this.state;

        return (
            <div style={{ 
                maxWidth: '400px', 
                margin: '50px auto', 
                padding: '30px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Login</h2>
                
                {error && (
                    <div style={{
                        padding: '10px',
                        marginBottom: '20px',
                        backgroundColor: '#fee',
                        color: '#c00',
                        borderRadius: '4px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={this.handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => this.setState({ username: e.target.value })}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: '16px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => this.setState({ password: e.target.value })}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: '16px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            backgroundColor: loading ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '20px' }}>
                    Don't have an account?{' '}
                    <a href="/register" style={{ color: '#007bff', textDecoration: 'none' }}>
                        Register here
                    </a>
                </p>
            </div>
        );
    }
}

export default withRouter(Login);