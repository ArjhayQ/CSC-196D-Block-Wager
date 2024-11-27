// src/components/Card.js

import React from 'react';
import '../styles/Card.css';

const Card = React.memo(({ value, suit, hidden }) => {
  //console.log(`Rendering Card: value=${value}, suit=${suit}, hidden=${hidden}`);

  if (hidden) {
    return <div className="card hidden-card">?</div>;
  }

  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 1: return '♥';
      case 2: return '♦';
      case 3: return '♣';
      case 4: return '♠';
      default: return '';
    }
  };

  const getCardValue = (value) => {
    switch (value) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return value.toString();
    }
  };

  const isRed = suit === 1 || suit === 2;
  const suitSymbol = getSuitSymbol(suit);
  const displayValue = getCardValue(value);

  return (
    <div className={`card ${isRed ? 'red' : 'black'}`}>
      <div className="card-value">{displayValue}</div>
      <div className="card-suit">{suitSymbol}</div>
    </div>
  );
});

export default Card;
