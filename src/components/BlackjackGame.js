// src/components/BlackjackGame.js

import React from 'react';
import { Hand } from './Hand';
import '../styles/BlackjackGame.css';

const BlackjackGame = ({
  dealerCards,
  playerCards,
  splitCards,
  dealerScore,
  playerScore,
  canDouble,
  canSplit,
  isPlayerTurn,
  loading,
  hit,
  stand,
  doubleDown,
  split,
  account,
  playerAddress,
  dealerAddress
}) => {
  const normalizedAccount = account.toLowerCase();
  const normalizedPlayerAddress = playerAddress.toLowerCase();

  console.log("Normalized Account:", normalizedAccount);
  console.log("Normalized Player Address:", normalizedPlayerAddress);
  console.log("Is Player Turn:", isPlayerTurn);
  console.log("Should Show Controls:", isPlayerTurn && normalizedAccount === normalizedPlayerAddress);

  console.log("Rendering BlackjackGame with props:", {
    dealerCards,
    playerCards,
    splitCards,
    dealerScore,
    playerScore,
    canDouble,
    canSplit,
    isPlayerTurn,
    loading,
    account,
    playerAddress,
    dealerAddress
  });

  return (
    <div className="blackjack-game">
      <div className="dealer-area">
        <h3>Dealer's Hand</h3>
        <Hand 
          cards={dealerCards}
          isDealer={true}
          hideFirstCard={isPlayerTurn}
        />
        {dealerScore > 0 && !isPlayerTurn && (
          <p>Dealer Score: {dealerScore}</p>
        )}
      </div>

      <div className="player-area">
        <h3>Your Hand</h3>
        <Hand cards={playerCards} isDealer={false} />
        {splitCards.length > 0 && (
          <div className="split-hand">
            <h3>Split Hand</h3>
            <Hand cards={splitCards} isDealer={false} />
          </div>
        )}
        <p>Your Score: {playerScore}</p>

        {isPlayerTurn && normalizedAccount === normalizedPlayerAddress && (
        <div className="actions">
          <button onClick={hit} disabled={loading}>Hit</button>
          <button onClick={stand} disabled={loading}>Stand</button>
          {canDouble && (
            <button onClick={doubleDown} disabled={loading}>Double Down</button>
          )}
          {canSplit && (
            <button onClick={split} disabled={loading}>Split</button>
          )}
        </div>
      )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
};

export default BlackjackGame;