// src/pages/Blackjack.js

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import '../styles/Blackjack.css'; // Import the CSS file


function Blackjack({ provider, signer, blackjackContract }) {
  const [gameState, setGameState] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [message, setMessage] = useState('');
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameStatus, setGameStatus] = useState('');

  // Function to fetch game state from the contract
  const fetchGameState = async () => {
    try {
      const game = await blackjackContract.GetGame();
      // Assume 'game' is an object with 'playerHand', 'dealerHand', and 'status' properties
      setPlayerHand(game.playerHand.map(formatCard));
      setDealerHand(game.dealerHand.map(formatCard));
      setGameStatus(game.status); // Adjust according to your contract
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };

  // Function to start a new game
  const startNewGame = async () => {
    try {
      const tx = await blackjackContract.StartNewGame();
      await tx.wait();
      setMessage('New game started!');
      fetchGameState();
    } catch (error) {
      console.error('Error starting new game:', error);
      setMessage('Error starting new game.');
    }
  };

  // Function to place a bet
  const placeBet = async () => {
    try {
      if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
        setMessage('Please enter a valid bet amount.');
        return;
      }
  
      const betInWei = ethers.utils.parseEther(betAmount);
      const tx = await blackjackContract.PlaceBet(betInWei);
      await tx.wait();
      setMessage('Bet placed!');
      fetchGameState();
    } catch (error) {
      console.error('Error placing bet:', error);
      setMessage('Error placing bet.');
    }
  };
  

  // Function to hit
  const hit = async () => {
    try {
      const tx = await blackjackContract.Hit();
      await tx.wait();
      setMessage('You drew a card.');
      fetchGameState();
    } catch (error) {
      console.error('Error hitting:', error);
      setMessage('Error hitting.');
    }
  };

  // Function to stand
  const stand = async () => {
    try {
      const tx = await blackjackContract.Stand();
      await tx.wait();
      setMessage('You stood. Dealer\'s turn.');
      fetchGameState();
    } catch (error) {
      console.error('Error standing:', error);
      setMessage('Error standing.');
    }
  };

  // Helper function to format card numbers to readable strings
  const formatCard = (cardNumber) => {
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const ranks = [
      'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King',
    ];

    const suit = suits[Math.floor(cardNumber / 13)];
    const rank = ranks[cardNumber % 13];

    return `${rank} of ${suit}`;
  };

  useEffect(() => {
    const initializeGame = async () => {
      if (blackjackContract) {
        try {
          // Start a new game if one doesn't exist
          await blackjackContract.StartNewGame();
          fetchGameState();
        } catch (error) {
          console.error('Error initializing game:', error);
          setMessage('Error initializing game.');
        }
      }
    };
  
    initializeGame();
  }, [blackjackContract]);

  return (
    <div className="blackjack-container">
      <h1>Blackjack Game</h1>
      <p>{message}</p>
      {gameStatus && <h2>Game Status: {gameStatus}</h2>}
      {gameState ? (
        <div>
          <div className="hands">
            <div>
              <h3>Your Hand:</h3>
              <ul>
                {playerHand.map((card, index) => (
                  <li key={index}>{card}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Dealer's Hand:</h3>
              <ul>
                {dealerHand.map((card, index) => (
                  <li key={index}>{card}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="actions">
            <button onClick={hit}>Hit</button>
            <button onClick={stand}>Stand</button>
          </div>
        </div>
      ) : (
        <div className="start-game">
          <button onClick={startNewGame}>Start New Game</button>
          <div>
            <input
              type="text"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Bet amount in ETH"
            />
            <button onClick={placeBet}>Place Bet</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Blackjack;
