import React, { useState } from 'react';
import '../styles/Dice.css';

const DicePage = () => {
  const [lobbies, setLobbies] = useState([
    { id: 1, host: 'Player1', betAmount: 10 },
    { id: 2, host: 'Player2', betAmount: 20 },
    { id: 3, host: 'Player3', betAmount: 50 },
    { id: 1, host: 'Player1', betAmount: 10 },
    { id: 2, host: 'Player2', betAmount: 20 },
    { id: 3, host: 'Player3', betAmount: 50 },
    { id: 1, host: 'Player1', betAmount: 10 },
    { id: 2, host: 'Player2', betAmount: 20 },
    { id: 3, host: 'Player3', betAmount: 50 },
    { id: 1, host: 'Player1', betAmount: 10 },
    { id: 2, host: 'Player2', betAmount: 20 },
    { id: 3, host: 'Player3', betAmount: 50 },
    { id: 1, host: 'Player1', betAmount: 10 },
    { id: 2, host: 'Player2', betAmount: 20 },
    { id: 3, host: 'Player3', betAmount: 50 },
  ]);

  const [selectedLobby, setSelectedLobby] = useState(null);

  return (
    <div className="dice-page">
      <h1>Dice Lobbies</h1>
      <div className = "stats-container">

      </div>
      <div className = "sub-header">
        <p>Select a lobby to join or create your own!</p>
        <button className = "create-button">Create</button>
      </div>
      <div className="lobby-list">
        {lobbies.map((lobby) => (
          <div key={lobby.id} className="lobby-item">
            <p><strong>Host:</strong> {lobby.host}</p>
            <p><strong>Bet Amount:</strong> ${lobby.betAmount}</p>
            <button className="join-button">
              Join
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default DicePage;
