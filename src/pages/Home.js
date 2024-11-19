import React from 'react';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <h1>Welcome to Block Wager!</h1>
      <p>Place your bets and enjoy a decentralized gambling experience.</p>
      <div className="home-buttons">
        <button className="home-button">Get Started</button>
        <button className="home-button">Learn More</button>
      </div>
    </div>
  );
};

export default Home;