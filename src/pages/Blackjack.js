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
  
      if (game.Id === 0) {
        setMessage('No active game. Please start a new game.');
        setGameState(null);
        return;
      }
  
      // Check if the game has started (cards dealt)
      if (game.PlayerCardTotal === 0 && game.DealerCardTotal === 0) {
        setMessage('Your game is initialized but hasn’t started yet. Place a bet to begin.');
      } else {
        setMessage('Welcome back to your game!');
      }
  
      // Update UI state
      setPlayerHand(game.PlayerCardTotal > 0 ? [game.PlayerCard1, game.PlayerCard2].map(formatCard) : []);
      setDealerHand(game.DealerCardTotal > 0 ? [game.DealerCard1].map(formatCard) : []);
      setGameStatus(game.DealerMsg || 'Awaiting next action...');
      setGameState(game);
    } catch (error) {
      console.error('Error fetching game state:', error);
      setMessage('Unable to fetch game state. Please try again.');
    }
  };
  
  
  

  // Function to start a new game
  const [depositAmount, setDepositAmount] = useState('0.1'); // Default to minimum deposit

  const startNewGame = async () => {
    try {
      const depositInWei = ethers.utils.parseEther(depositAmount || '0.000001'); // Use default or user-provided deposit
      const tx = await blackjackContract.StartNewGame({ value: depositInWei });
      await tx.wait();
      setMessage('New game started!');
      fetchGameState();
    } catch (error) {
      console.error('Error starting new game:', error);
      const errorMessage = error.data?.message || error.message || 'Error starting new game.';
      setMessage(errorMessage);
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
    const ranks = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  
    if (!cardNumber || cardNumber < 1 || cardNumber > 52) {
      return 'Unknown Card'; // Handle invalid card numbers gracefully
    }
  
    const suit = suits[Math.floor((cardNumber - 1) / 13)];
    const rank = ranks[(cardNumber - 1) % 13];
  
    return `${rank} of ${suit}`;
  };
  

  useEffect(() => {
    const checkExistingGame = async () => {
      if (blackjackContract) {
        try {
          const game = await blackjackContract.GetGame();
          if (game.Id !== 0) {
            setMessage('Welcome back to your game!');
            fetchGameState(); // Fetch game details if it exists
          } else {
            setMessage('No active game. Please start a new game.');
          }
        } catch (error) {
          console.error('Error checking existing game:', error);
          setMessage('Unable to fetch game state. Please check your connection.');
        }
      }
    };
  
    checkExistingGame();
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
