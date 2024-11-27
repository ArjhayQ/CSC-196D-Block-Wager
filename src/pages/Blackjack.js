// src/Blackjack.js

import React, { useState, useEffect, useCallback } from "react";
import Web3 from "web3";
import BlackjackABI from "../abis/Blackjack.json";
import "../styles/Blackjack.css";
import BlackjackLobby from '../components/BlackjackLobby';
import BlackjackGame from '../components/BlackjackGame';

const BlackjackPage = () => {
  // State management
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [lobbies, setLobbies] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [betAmount, setBetAmount] = useState("");
  const [activeGame, setActiveGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [splitCards, setSplitCards] = useState([]);
  const [playerAddress, setPlayerAddress] = useState(null);
  const [dealerAddress, setDealerAddress] = useState(null);
  const [isReviewPhase, setIsReviewPhase] = useState(false);
  
  const contractAddress = "0x878207d557E5299EA419793d6A710f6794546577";

  const updateGameState = useCallback(async (gameId) => {
    if (!gameId || !contract) return;
    setLoading(true);
    try {
      const fullGameState = await contract.methods.getGameState(gameId).call();
      console.log("Full game state from contract:", fullGameState);
      
      // Explicitly convert values to correct types
      const gameState = {
        playerScore: Number(fullGameState.playerScore) || 0,
        dealerScore: Number(fullGameState.dealerScore) || 0,
        isPlayerTurn: Boolean(fullGameState.isPlayerTurn),
        betAmount: fullGameState.betAmount,
        canSplit: Boolean(fullGameState.canSplit),
        canDouble: Boolean(fullGameState.canDouble),
        isSplit: Boolean(fullGameState.isSplit)
      };
      
      console.log("Processed game state:", gameState);
      setGameState(gameState);
      
    } catch (error) {
      console.error("Error updating game state:", error);
      setError("Failed to update game state. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Initialize Web3 with proper error handling and network validation
  useEffect(() => {
    const initWeb3 = async () => {
      console.log("Initializing Web3...");
      if (!window.ethereum) {
        setError("Please install MetaMask to play!");
        return;
      }

      try {
        const web3Instance = new Web3(window.ethereum);
        
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: "eth_requestAccounts" 
        });
        console.log("Accounts retrieved:", accounts);
        
        // Verify network connection using v4 syntax
        const chainId = await web3Instance.eth.getChainId();
        console.log(`Connected to chain ID: ${chainId}`);
        
        // Verify contract exists
        const code = await web3Instance.eth.getCode(contractAddress);
        if (code === '0x') {
          throw new Error(`Contract not found at ${contractAddress} on chain ${chainId}`);
        }
        console.log("Contract found:", contractAddress);
        
        // Create contract instance
        const blackjackContract = new web3Instance.eth.Contract(
          BlackjackABI.abi,
          contractAddress
        );
        console.log("Contract instance created:", blackjackContract);

        // Verify contract interface
        const minBet = await blackjackContract.methods.minBet().call();
        console.log('Contract minimum bet:', web3Instance.utils.fromWei(minBet, 'ether'), 'ETH');

        setWeb3(web3Instance);
        setAccount(accounts[0]);
        setContract(blackjackContract);
        setError(null);

        // Setup network change listener
        window.ethereum.on('chainChanged', () => {
          console.log("Chain changed. Reloading...");
          window.location.reload();
        });

        // Setup account change listener
        window.ethereum.on('accountsChanged', (newAccounts) => {
          console.log("Accounts changed:", newAccounts);
          setAccount(newAccounts[0]);
        });

      } catch (error) {
        console.error("Error initializing Web3:", error);
        setError(`Failed to initialize: ${error.message}`);
      }
    };

    initWeb3();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', () => {});
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Setup contract event listeners with proper cleanup
  useEffect(() => {
    if (!contract) return;

    const setupEventSubscription = (eventName, handler) => {
      console.log(`Setting up subscription for event: ${eventName}`);
      try {
        if (!contract.events[eventName]) {
          console.error(`Event ${eventName} not found in contract`);
          return null;
        }

        const subscription = contract.events[eventName]();

        subscription.on('data', (event) => {
          console.log(`Event received: ${eventName}`, event);
          try {
            handler(event);
          } catch (error) {
            console.error(`Error handling ${eventName} event:`, error);
          }
        });

        subscription.on('error', (error) => {
          console.error(`Error in ${eventName} subscription:`, error);
          // Attempt to resubscribe on error after 5 seconds
          setTimeout(() => setupEventSubscription(eventName, handler), 5000);
        });

        return subscription;
      } catch (error) {
        console.error(`Failed to setup ${eventName} subscription:`, error);
        return null;
      }
    };

  // Existing subscriptions
  const gameCreatedSub = setupEventSubscription('GameCreated', async (event) => {
    const gameId = event.returnValues.gameId;
    const player = event.returnValues.player;
    const host = event.returnValues.host; // Adjust according to your contract
    console.log(`GameCreated event received for gameId: ${gameId}`);
    setActiveGame(gameId);
    setPlayerAddress(player);
    setDealerAddress(host);
    updateGameState(gameId);
  });
  

  const cardDealtSub = setupEventSubscription('CardDealt', (event) => {
    console.log(`CardDealt event received:`, event);
  
    const { recipient, value, suit, isDealer } = event.returnValues;
    const newCard = {
      value: Number(value),
      suit: Number(suit),
    };
  
    if (isDealer === true || isDealer === 'true') {
      setDealerCards(prev => {
        if (prev.some(card => card.value === newCard.value && card.suit === newCard.suit)) {
          console.log("Duplicate dealer card detected, ignoring:", newCard);
          return prev;
        }
        return [...prev, newCard];
      });
    } else {
      setPlayerCards(prev => {
        if (prev.some(card => card.value === newCard.value && card.suit === newCard.suit)) {
          console.log("Duplicate player card detected, ignoring:", newCard);
          return prev;
        }
        return [...prev, newCard];
      });
    }
  });

  const playerActionSub = setupEventSubscription('PlayerAction', (event) => {
    console.log(`PlayerAction event:`, event);
    // Handle specific actions if necessary
    updateGameState(event.returnValues.gameId.toString());
  });

  const dealerActionSub = setupEventSubscription('DealerAction', (event) => {
    console.log(`DealerAction event:`, event);
    updateGameState(event.returnValues.gameId.toString());
  });

  const decodeCard = (card) => ({
    value: card % 13 === 0 ? 13 : card % 13, // Card value (1-13)
    suit: Math.floor((card - 1) / 13) + 1,  // Card suit (1-4)
  });
  
  const gameCompleteSub = setupEventSubscription('GameComplete', (event) => {
    console.log(`GameComplete event received:`, event);
  
    // Decode player and dealer cards
    const finalDealerCards = event.returnValues.dealerCards.map(decodeCard) || [];
    const finalPlayerCards = event.returnValues.playerCards.map(decodeCard) || [];
    
    const result = event.returnValues.result; // Result: "Player Wins", "Dealer Wins", "Push"
    const payout = web3.utils.fromWei(event.returnValues.payout, 'ether'); // Payout in ETH
  
    // Update state with final hands and result
    setDealerCards(finalDealerCards);
    setPlayerCards(finalPlayerCards);
  
    setGameState((prevState) => ({
      ...prevState,
      result,
      payout,
    }));
  
    // Transition to review phase
    setIsReviewPhase(true);
  
    alert(
      `Game Over!\n${result}\nPayout: ${payout} ETH`
    );
  });

  const playerTurnSub = setupEventSubscription('PlayerTurn', (event) => {
    console.log(`PlayerTurn event:`, event);
    setGameState(prevState => ({
      ...prevState,
      isPlayerTurn: true
    }));
  });

  const dealerTurnSub = setupEventSubscription('DealerTurn', (event) => {
    console.log(`DealerTurn event:`, event);
    setGameState(prevState => ({
      ...prevState,
      isPlayerTurn: false
    }));
  });

  const splitHandStartedSub = setupEventSubscription('SplitHandStarted', (event) => {
    console.log(`SplitHandStarted event:`, event);
    setSplitCards([]);
    updateGameState(event.returnValues.gameId.toString());
  });

  const handBustedSub = setupEventSubscription('HandBusted', (event) => {
    console.log(`HandBusted event:`, event);
    // Optionally handle UI updates
    updateGameState(event.returnValues.gameId.toString());
  });

  return () => {
    [
      gameCreatedSub,
      cardDealtSub,
      playerActionSub,
      dealerActionSub,
      gameCompleteSub,
      playerTurnSub,
      dealerTurnSub,
      splitHandStartedSub,
      handBustedSub
    ].forEach(sub => {
      if (sub?.unsubscribe) {
        sub.unsubscribe();
        console.log(`Unsubscribed from event`);
      } else if (sub?.off) {
        sub.off('data');
        sub.off('error');
        console.log(`Removed 'data' and 'error' listeners`);
      }
    });
  };
}, [contract]);

  // Fetch lobbies
  const fetchLobbies = useCallback(async () => {
    if (!contract) return;

    try {
        //console.log("Fetching open lobbies...");
        const openLobbies = await contract.methods.getOpenLobbies().call();
        //console.log("Open lobbies:", openLobbies);

        const processedLobbies = openLobbies.map((lobby) => ({
            id: lobby.lobbyId.toString(),
            host: lobby.host,
            betAmount: lobby.betAmount.toString(),
            gameId: lobby.gameId.toString(),
            status: lobby.status.toString(),
            creationTime: lobby.creationTime.toString()
        }));

        console.log("Final processed lobbies:", processedLobbies);
        setLobbies(processedLobbies);
        setError(null);
    } catch (error) {
        console.error("Error fetching lobbies:", error);
        setError("Failed to fetch open games. Please try again.");
    }
  }, [contract]);

  // Refresh lobbies periodically
  useEffect(() => {
    if (contract) {
      fetchLobbies();
      const interval = setInterval(fetchLobbies, 5000);
      console.log("Set interval to fetch lobbies every 5 seconds");
      return () => clearInterval(interval);
    }
  }, [contract, fetchLobbies]);

  const createLobby = async (requiredStake) => {
    if (!requiredStake) {
      setError("Missing required stake");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`Creating lobby with requiredStake: ${requiredStake}`);
      const tx = contract.methods.createLobby();
      const gasEstimate = await tx.estimateGas({
        from: account,
        value: requiredStake
      });
      console.log(`Estimated gas for createLobby: ${gasEstimate}`);

      const gas = Math.ceil(Number(gasEstimate) * 1.2).toString();
      console.log(`Sending transaction with gas limit: ${gas}`);

      await tx.send({ 
        from: account, 
        value: requiredStake,
        gas: gas
      });

      console.log("Lobby created successfully");
      setShowCreateModal(false);
      setBetAmount("");
      fetchLobbies();
    } catch (error) {
      console.error("Error creating lobby:", error);
      setError(handleTransactionError(error));
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async (lobbyId, betAmount) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!web3 || !contract) {
        throw new Error("Web3 or contract not initialized");
      }
  
      // Debug: Log detailed information before joining
      console.log("Join attempt details:", {
        lobbyId,
        betAmount: web3.utils.fromWei(betAmount, 'ether'),
        accountJoining: account
      });
      
      // Check minimum and maximum bet limits
      const minBet = await contract.methods.minBet().call();
      const maxBet = await contract.methods.maxBet().call();
      console.log("Bet limits:", {
        min: web3.utils.fromWei(minBet, 'ether'),
        max: web3.utils.fromWei(maxBet, 'ether'),
        attempting: web3.utils.fromWei(betAmount, 'ether')
      });
  
      // Get and log the lobby details
      const lobby = await contract.methods.lobbies(lobbyId).call();
      console.log("Lobby details:", {
        host: lobby.host,
        betAmount: lobby.betAmount,
        status: lobby.status,
        gameId: lobby.gameId,
        creationTime: lobby.creationTime
      });
  
      // Status check with type conversion
      if (Number(lobby.status) !== 0) { // Convert status to number
        throw new Error(`Lobby is not open. Status: ${lobby.status}`);
      }
  
      // Proceed to join the lobby
      const tx = contract.methods.joinLobby(lobbyId);
      const gasEstimate = await tx.estimateGas({
        from: account,
        value: betAmount
      });
      console.log(`Estimated gas for joinLobby: ${gasEstimate}`);

      const gas = Math.ceil(Number(gasEstimate) * 1.2).toString();
      console.log(`Sending transaction with gas limit: ${gas}`);

      await tx.send({ 
        from: account, 
        value: betAmount,
        gas: gas
      });

      console.log("Joined lobby successfully");
      fetchLobbies(); // Refresh lobbies after joining
  
    } catch (error) {
      console.error("Error joining lobby:", error);
      setError(handleTransactionError(error));
    } finally {
      setLoading(false);
    }
  };  

  // Helper function to handle transaction errors
  const handleTransactionError = (error) => {
    console.error("Handling transaction error:", error);
    if (error.message.includes("gas")) {
      return "Transaction failed: Gas estimation error. Please try again with a different bet amount.";
    } else if (error.message.includes("rejected")) {
      return "Transaction was rejected. Please try again.";
    } else if (error.message.includes("insufficient funds")) {
      return "Insufficient funds to complete the transaction.";
    } else {
      return `Transaction failed: ${error.message}`;
    }
  };

  // Game action handlers with proper error handling
  const gameAction = async (action, params = {}) => {
    if (!activeGame) {
      console.warn("No active game to perform actions on.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      console.log(`Attempting to execute action: ${action}`, params);
      const tx = contract.methods[action](activeGame);
      const gas = await tx.estimateGas({
        from: account,
        ...params
      });
      console.log(`Estimated gas for ${action}: ${gas}`);

      await tx.send({
        from: account,
        gas: Math.ceil(Number(gas) * 1.2),
        ...params
      });

      console.log(`Action ${action} executed successfully.`);
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      setError(handleTransactionError(error));
    } finally {
      setLoading(false);
    }
  };

  // Game action handlers
  const hit = () => {
    console.log("Hit action triggered.");
    gameAction('hit');
  };
  const stand = async () => {
    console.log("Stand action triggered.");
    setLoading(true);
    try {
      // Execute the "stand" action in the contract
      await gameAction('stand');
  
      // Update game state after the dealer finishes their turn
      setTimeout(() => {
        setIsReviewPhase(true); // Transition to the review phase
      }, 1000); // Small delay for UI responsiveness
    } catch (error) {
      console.error("Error during stand action:", error);
      setError(handleTransactionError(error));
    } finally {
      setLoading(false);
    }
  };
  const doubleDown = () => {
    if (!gameState) return;
    const value = web3.utils.toWei((Number(gameState.betAmount) * 2).toString(), "ether");
    console.log("Double Down action triggered with value:", value);
    gameAction('doubleDown', { value });
  };
  const split = () => {
    if (!gameState) return;
    const value = web3.utils.toWei((gameState.betAmount / 2).toString(), "ether");
    console.log("Split action triggered with value:", value);
    gameAction('split', { value });
  };

  // Render error message if present
  const renderError = () => {
    if (!error) return null;
    return (
      <div className="error-message">
        <p>{error}</p>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  };

  const resetGame = () => {
    setActiveGame(null);
    setPlayerCards([]);
    setDealerCards([]);
    setSplitCards([]);
    setGameState(null);
    setIsReviewPhase(false);
  };

  return (
    <div className="blackjack-page">
      {renderError()}
  
      {isReviewPhase ? (
  <div className="game-container">
    <h2>Game Over</h2>

    <div className="dealer-area">
      <h3>Dealer's Final Hand</h3>
      <div className="hand">
        {dealerCards.map((card, index) => (
          <div
            key={index}
            className={`card ${card.suit === 1 || card.suit === 3 ? 'black' : 'red'}`}
          >
            <div className="card-value">{card.value}</div>
            <div className="card-suit">
              {card.suit === 1 && '♠'} {/* Spades */}
              {card.suit === 2 && '♥'} {/* Hearts */}
              {card.suit === 3 && '♣'} {/* Clubs */}
              {card.suit === 4 && '♦'} {/* Diamonds */}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="player-area">
      <h3>Player's Final Hand</h3>
      <div className="hand">
        {playerCards.map((card, index) => (
          <div
            key={index}
            className={`card ${card.suit === 1 || card.suit === 3 ? 'black' : 'red'}`}
          >
            <div className="card-value">{card.value}</div>
            <div className="card-suit">
              {card.suit === 1 && '♠'} {/* Spades */}
              {card.suit === 2 && '♥'} {/* Hearts */}
              {card.suit === 3 && '♣'} {/* Clubs */}
              {card.suit === 4 && '♦'} {/* Diamonds */}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="scores">
      <div>
        <strong>Dealer's Score:</strong> {gameState?.dealerScore || 0}
      </div>
      <div>
        <strong>Player's Score:</strong> {gameState?.playerScore || 0}
      </div>
    </div>

    <div className="results">
      <p>
        <strong>Result:</strong> {gameState?.result || "Unknown"}
      </p>
      <p>
        <strong>Payout:</strong> {gameState?.payout || 0} ETH
      </p>
    </div>

    <div className="actions">
      <button onClick={() => resetGame()} className="create-lobby-btn">
        Confirm and Return
      </button>
    </div>
  </div>
) : (
        !activeGame ? (
          <BlackjackLobby 
            lobbies={lobbies}
            account={account}
            loading={loading}
            onJoinLobby={joinLobby}
            onCreateLobby={createLobby}
            web3={web3}
            contract={contract}
            onLobbyUpdate={fetchLobbies}
          />
        ) : (
          <BlackjackGame 
            dealerCards={dealerCards}
            playerCards={playerCards}
            splitCards={splitCards}
            dealerScore={gameState?.dealerScore}
            playerScore={gameState?.playerScore}
            canDouble={gameState?.canDouble}
            canSplit={gameState?.canSplit}
            isPlayerTurn={gameState?.isPlayerTurn}
            loading={loading}
            hit={hit}
            stand={stand}
            doubleDown={doubleDown}
            split={split}
            account={account}
            playerAddress={playerAddress}
            dealerAddress={dealerAddress}
          />
        )
      )}
    </div>
  );
};

export default BlackjackPage;