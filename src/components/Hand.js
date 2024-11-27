// src/components/Hand.js

import React from 'react';
import Card from './Card';
import '../styles/Hand.css';

export const Hand = ({ cards, isDealer, hideFirstCard }) => {
    //console.log("Rendering Hand:", { cards, isDealer, hideFirstCard });
    
    return (
      <div className="hand">
        {cards && cards.map((card, index) => (
          <Card 
            key={`${card.value}-${card.suit}-${index}`}
            value={card.value}
            suit={card.suit}
            hidden={isDealer && hideFirstCard && index === 0}
          />
        ))}
      </div>
    );
  };

export default Hand;