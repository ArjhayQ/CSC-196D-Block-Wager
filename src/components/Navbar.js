import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
      <NavLink to = "/" className = "logo-main-link">
				<span className = "logo-main">Block Wager</span>
				<span className = "logo-sub">Decentralized Casino</span>
			</NavLink>
      </div>
      <div className="navbar-links">
        <NavLink to = "/coinflip" className = {({isActive}) => isActive ? "navbar-link active-link" : "navbar-link"}>CoinFlip</NavLink>
        <NavLink to = "/blackjack" className = {({isActive}) => isActive ? "navbar-link active-link" : "navbar-link"}>Blackjack</NavLink>
	  	</div>
    </nav>
  );
};

export default Navbar;
