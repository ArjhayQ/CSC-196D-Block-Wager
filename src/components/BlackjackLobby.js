// In BlackjackLobby.js

import React, { useState } from 'react';
import { Clock, Users, Wallet, X } from 'lucide-react';
import CreateLobbyModal from './CreateLobbyModal';

const BlackjackLobby = ({ 
  lobbies, 
  account, 
  loading, 
  onJoinLobby, 
  onCreateLobby, 
  web3,
  contract,
  onLobbyUpdate 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [betAmount, setBetAmount] = useState("");
  const [cancellingLobbyId, setCancellingLobbyId] = useState(null);
  const [error, setError] = useState(null);
  
  // Filter lobbies to find all hosted by current account
  const myHostedLobbies = lobbies.filter(lobby => 
    lobby.dealer.toLowerCase() === account.toLowerCase()
  );

  // Error handling
  if (error) {
    console.error("Error:", error);
    alert('Error: ' + error);
  }

  const handleCreateLobby = async () => {
    try {
      if (!betAmount || !web3) {
        setError("Please enter a valid bet amount.");
        return;
      }
      
      // Optional: Validate betAmount format
      if (isNaN(betAmount) || Number(betAmount) <= 0) {
        setError("Bet amount must be a positive number.");
        return;
      }
      
      console.log("Creating lobby with betAmount:", betAmount);
      
      // Call onCreateLobby with betAmount
      await onCreateLobby(betAmount);
      
      setShowCreateModal(false);
      setBetAmount("");
      
    } catch (error) {
      console.error("Error creating lobby:", error);
      alert('Failed to create lobby: ' + error.message);
    }
  };

  const handleJoinLobby = async (lobby) => {
    try {
      if (!web3) return;
      
      // The bet amount in the lobby is already adjusted (2/3 of what dealer sent)
      const betAmountWei = lobby.betAmount;
      
      console.log("Joining lobby with:", {
        lobbyId: lobby.id,
        betAmount: web3.utils.fromWei(betAmountWei, 'ether'),
        betAmountWei: betAmountWei
      });
      
      await onJoinLobby(lobby.id, betAmountWei);
      
    } catch (error) {
      console.error("Error joining lobby:", error);
      alert('Failed to join lobby: ' + error.message);
    }
  };

  const handleCancelLobby = async (lobbyId) => {
    if (cancellingLobbyId) return;
    
    try {
      setCancellingLobbyId(lobbyId);
      const tx = await contract.methods.cancelLobby(lobbyId);
      const gasEstimate = await tx.estimateGas({ from: account });
      const gas = Math.ceil(Number(gasEstimate) * 1.2).toString();

      await tx.send({
        from: account,
        gas: gas
      });

      if (onLobbyUpdate) {
        onLobbyUpdate();
      }
    } catch (error) {
      console.error('Error canceling lobby:', error);
      alert('Failed to cancel lobby: ' + error.message);
    } finally {
      setCancellingLobbyId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Blackjack Lobby</h1>
      
      {myHostedLobbies.length > 0 ? (
        <div className="mb-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Your Active Lobbies</h2>
          {myHostedLobbies.map((lobby) => (
            <div 
              key={lobby.id} 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Lobby #{lobby.id}</h3>
                <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2">
                  <Clock className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Waiting for players...</span>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">
                      Required Bet: {web3?.utils.fromWei(lobby.betAmount, "ether")} ETH
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">Status: Waiting for opponent</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelLobby(lobby.id)}
                  disabled={cancellingLobbyId === lobby.id}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 
                           text-white font-medium py-2 px-4 rounded transition-colors 
                           duration-200 ease-in-out shadow-sm flex items-center justify-center gap-2"
                >
                  {cancellingLobbyId === lobby.id ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Cancel Lobby</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
          className="w-full mb-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 
                   text-white font-bold py-4 px-6 rounded-lg transition-colors 
                   duration-200 ease-in-out flex items-center justify-center gap-2 shadow-md"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Users className="w-5 h-5" />
              <span>Create New Game</span>
            </>
          )}
        </button>
      )}

      <div className="space-y-4 bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Open Games</h2>
        {lobbies.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">No open games available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="bg-gray-50 rounded-lg shadow-sm p-4 border border-gray-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Dealer:</span>
                    <span className="text-gray-900 font-medium truncate" title={lobby.dealer}>
                      {lobby.dealer.slice(0, 6)}...{lobby.dealer.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Required Bet:</span>
                    <span className="text-gray-900 font-medium">
                      {web3?.utils.fromWei(lobby.betAmount, "ether")} ETH
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoinLobby(lobby)}
                    disabled={loading || lobby.dealer.toLowerCase() === account.toLowerCase()}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 
                             text-white font-medium py-2 px-4 rounded transition-colors 
                             duration-200 ease-in-out shadow-sm"
                  >
                    {lobby.dealer.toLowerCase() === account.toLowerCase() 
                      ? "Your Lobby" 
                      : "Join Game"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateLobbyModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setBetAmount("");
        }}
        betAmount={betAmount}
        onBetAmountChange={(e) => setBetAmount(e.target.value)}
        onCreateLobby={handleCreateLobby}
        loading={loading}
      />
    </div>
  );
};

export default BlackjackLobby;