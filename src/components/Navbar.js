import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/" className = "logo-main-link">
            <span className = "logo-main">Block Wager</span>
            <span className = "logo-sub">Decentralized Casino</span>
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/dice" className="navbar-link">Dice</Link>
        <Link to="/blackjack" className="navbar-link">Blackjack</Link>
      </div>
      <div className="navbar-auth">
        <button className="auth-button">Login</button>
        <button className="auth-button">Signup</button>
      </div>
    </nav>
  );
};

export default Navbar;
