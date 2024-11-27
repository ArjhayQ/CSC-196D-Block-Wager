import React from 'react';
import { Card } from './Card';
import { User, UserCog } from 'lucide-react';
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
  dealerHit,
  dealerStand,
  account,
  playerAddress,
  dealerAddress,
  gameResult,
  gameComplete,
  onReturnToLobby
}) => {
  const normalizedAccount = account?.toLowerCase();
  const normalizedDealerAddress = dealerAddress?.toLowerCase();
  const normalizedPlayerAddress = playerAddress?.toLowerCase();
  
  const isDealer = normalizedAccount === normalizedDealerAddress;
  const isPlayer = normalizedAccount === normalizedPlayerAddress;
  const isSpectator = !isDealer && !isPlayer;

  // Fixed visibility logic - only first card is shown for dealer until game ends
  const isDealerCardVisible = (index) => {
    if (isDealer) return true; // Dealer sees all their cards
    return index === 0; // Others only see the first card until game ends
  };

  // Fixed player card visibility - only player can see their cards during their turn
  const isPlayerCardVisible = (index) => {
    if (isPlayer) return true; // Player always sees their cards
    if (!isPlayerTurn) return true; // After player turn, cards are revealed to all
    return false; // During player turn, others can't see their cards
  };

  const renderCard = (card, index, isHidden = false) => {
    if (isHidden) {
      return (
        <div key={index} className="w-24 h-32 bg-gray-300 rounded-lg flex items-center justify-center">
          <span className="text-gray-600">?</span>
        </div>
      );
    }
    
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const isRed = card.suit === 1 || card.suit === 2;
    
    return (
      <div 
        key={`${index}-${card.value}-${card.suit}`}
        className={`w-24 h-32 bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center ${
          isRed ? 'text-red-600' : 'text-black'
        }`}
      >
        <span className="text-xl font-bold">{values[card.value - 1]}</span>
        <span className="text-2xl">{suits[card.suit]}</span>
      </div>
    );
  };

  const renderDealerHand = () => (
    <div className="flex gap-2 flex-wrap">
      {dealerCards.map((card, index) => 
        renderCard(card, index, !isDealerCardVisible(index))
      )}
    </div>
  );

  const renderPlayerHand = () => (
    <div className="flex gap-2 flex-wrap">
      {playerCards.map((card, index) => 
        renderCard(card, index, !isPlayerCardVisible(index))
      )}
    </div>
  );

  const renderSplitHand = () => (
    <div className="flex gap-2 flex-wrap">
      {splitCards.map((card, index) => 
        renderCard(card, index, !isPlayerCardVisible(index))
      )}
    </div>
  );

  // Show scores based on visibility rules
  const showDealerScore = isDealer || !isPlayerTurn;
  const showPlayerScore = isPlayer || !isPlayerTurn;

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const GameResult = () => {
    if (!gameResult) return null;
    
    const resultClasses = {
      'WIN': 'bg-green-100 border-green-500 text-green-700',
      'LOSE': 'bg-red-100 border-red-500 text-red-700',
      'PUSH': 'bg-yellow-100 border-yellow-500 text-yellow-700'
    };
    
    return (
      <div className={`p-4 border-2 rounded-lg my-4 ${resultClasses[gameResult.result] || 'bg-gray-100 border-gray-500'}`}>
        <h3 className="text-lg font-bold mb-2">Game Complete</h3>
        <p className="mb-2">Result: {gameResult.result}</p>
        <p className="mb-4">Payout: {gameResult.payout} ETH</p>
        <button
          onClick={onReturnToLobby}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Lobby
        </button>
      </div>
    );
  };

  const renderGameStatus = () => {
    if (gameComplete) {
      return <GameResult />;
    }
    
    return (
      <div className="text-center text-lg font-medium">
        {isPlayerTurn ? (
          isPlayer ? "Your turn" : "Waiting for player's move..."
        ) : (
          isDealer ? "Your turn (Dealer)" : "Waiting for dealer's move..."
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl p-6 space-y-6 relative">
      {/* Role Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
        {isDealer && (
          <div className="flex items-center gap-1 text-blue-600">
            <UserCog size={20} />
            <span className="text-sm font-medium">Dealer</span>
          </div>
        )}
        {isPlayer && (
          <div className="flex items-center gap-1 text-green-600">
            <User size={20} />
            <span className="text-sm font-medium">Player</span>
          </div>
        )}
        {isSpectator && (
          <div className="flex items-center gap-1 text-gray-600">
            <User size={20} />
            <span className="text-sm font-medium">Spectator</span>
          </div>
        )}
      </div>

      {/* Dealer Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold">Dealer's Hand</h3>
          <span className="text-sm text-gray-500">
            ({truncateAddress(dealerAddress)})
          </span>
        </div>
        {renderDealerHand()}
        {showDealerScore && dealerScore > 0 && (
          <p className="text-lg">Score: {dealerScore}</p>
        )}
        
        {!isPlayerTurn && isDealer && (
          <div className="flex gap-2">
            <button 
              onClick={dealerHit} 
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Hit
            </button>
            <button 
              onClick={dealerStand} 
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Stand
            </button>
          </div>
        )}
      </div>

      {/* Player Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold">
            {isPlayer ? "Your Hand" : "Player's Hand"}
          </h3>
          <span className="text-sm text-gray-500">
            ({truncateAddress(playerAddress)})
          </span>
        </div>
        {renderPlayerHand()}
        {showPlayerScore && playerScore > 0 && (
          <p className="text-lg">Score: {playerScore}</p>
        )}

        {splitCards.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-bold">Split Hand</h3>
            {renderSplitHand()}
          </div>
        )}

        {isPlayerTurn && isPlayer && (
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={hit} 
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Hit
            </button>
            <button 
              onClick={stand} 
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Stand
            </button>
            {canDouble && (
              <button 
                onClick={doubleDown} 
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Double Down
              </button>
            )}
            {canSplit && (
              <button 
                onClick={split} 
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                Split
              </button>
            )}
          </div>
        )}
      </div>

      {renderGameStatus()}


      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="mt-2">Processing...</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default BlackjackGame;