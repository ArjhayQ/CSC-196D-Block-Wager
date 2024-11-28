// src/Blackjack.js

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [gameResult, setGameResult] = useState(null);
  const [gameComplete, setGameComplete] = useState(false); 

  const contractAddress = "0x362098dF189233ca464b8B578fd6e653F8bB1CD3";
  const listenersInitialized = useRef(false);
  const [processedEvents] = useState(new Set());


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
    if (!contract || listenersInitialized.current) return;
  
    // Create a map to store our subscriptions
    const subscriptions = new Map();
  
    const setupEventSubscription = (eventName, handler) => {
      // If we already have this subscription, clean it up first
      if (subscriptions.has(eventName)) {
        const existingSub = subscriptions.get(eventName);
        if (existingSub && typeof existingSub.unsubscribe === 'function') {
          existingSub.unsubscribe();
        }
      }
  
      console.log(`Setting up subscription for event: ${eventName}`);
      try {
        if (!contract.events[eventName]) {
          console.error(`Event ${eventName} not found in contract`);
          return null;
        }
  
        const subscription = contract.events[eventName]({
          fromBlock: 'latest' // Only listen to new events
        });
  
        subscription.on('data', (event) => {
          console.log(`Event received: ${eventName}`, event);
          // Create unique event identifier
          const eventId = `${event.blockHash}-${event.logIndex}-${eventName}`;
          
          // Only process if we haven't seen this exact event before
          if (!processedEvents.has(eventId)) {
            processedEvents.add(eventId);
            try {
              handler(event);
            } catch (error) {
              console.error(`Error handling ${eventName} event:`, error);
            }
          } else {
            console.log(`Skipping duplicate event: ${eventId}`);
          }
        });
  
        subscription.on('error', (error) => {
          console.error(`Error in ${eventName} subscription:`, error);
          // Remove the errored subscription from our map
          subscriptions.delete(eventName);
          // Attempt to resubscribe after a delay
          setTimeout(() => {
            const newSub = setupEventSubscription(eventName, handler);
            if (newSub) subscriptions.set(eventName, newSub);
          }, 5000);
        });
  
        // Store the subscription
        subscriptions.set(eventName, subscription);
        return subscription;
      } catch (error) {
        console.error(`Failed to setup ${eventName} subscription:`, error);
        return null;
      }
    };
  
    // Set up all event subscriptions
    setupEventSubscription('GameCreated', async (event) => {
      const gameId = event.returnValues.gameId;
      const player = event.returnValues.player;
      const dealer = event.returnValues.dealer;
      console.log(`GameCreated event received for gameId: ${gameId}`);
      setGameComplete(false);
      setGameResult(null);
      updateGameState(gameId.toString());
      setPlayerAddress(player.toString());
      setDealerAddress(dealer.toString());
      setActiveGame(gameId.toString());
    });
  
    setupEventSubscription('CardDealt', (event) => {
      console.log(`CardDealt event:`, event);
      const { value, suit, isDealer } = event.returnValues;
      const newCard = {
        value: Number(value),
        suit: Number(suit),
        // Add unique identifier for the card
        eventId: `${event.blockHash}-${event.logIndex}`
      };
    
      if (isDealer === true || isDealer === 'true') {
        setDealerCards(prev => {
          // Check for duplicate using eventId
          const isDuplicate = prev.some(card => card.eventId === newCard.eventId);
          return isDuplicate ? prev : [...prev, newCard];
        });
      } else {
        setPlayerCards(prev => {
          const isDuplicate = prev.some(card => card.eventId === newCard.eventId);
          return isDuplicate ? prev : [...prev, newCard];
        });
      }
      updateGameState(event.returnValues.gameId.toString());
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

const gameCompleteSub = setupEventSubscription('GameComplete', (event) => {
  console.log(`GameComplete event:`, event);
  setGameResult({
    result: event.returnValues.result,
    playerPayout: web3.utils.fromWei(event.returnValues.playerPayout, 'ether'),
    dealerPayout: web3.utils.fromWei(event.returnValues.dealerPayout, 'ether'),
    playerScore: event.returnValues.playerScore.toString(),
    dealerScore: event.returnValues.dealerScore.toString()
  });
  setGameComplete(true);
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
    console.log('Cleaning up event subscriptions');
    subscriptions.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    subscriptions.clear();
    listenersInitialized.current = false;
  };
}, [contract, updateGameState]);

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
    // Empty card arrays
    setPlayerCards([]);
    setDealerCards([]);
    setSplitCards([]);    
    setGameComplete(false);
    setGameResult(null);
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
      // Update active game and force transition
      setActiveGame(lobby.gameId.toString());
      setPlayerAddress(account); // Assuming the current account is the player
      setDealerAddress(lobby.dealer); // Update dealer address
      fetchLobbies(); // Refresh lobbies after joining
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
  const stand = () => {
    console.log("Stand action triggered.");
    gameAction('stand');
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

  const dealerGameAction = async (action) => {
    if (!activeGame) {
      console.warn("No active game to perform dealer actions on.");
      return;
    }
    setLoading(true);
    setError(null);
  
    try {
      console.log(`Attempting to execute dealer action: ${action}`);
      const tx = contract.methods[`dealer${action}`](activeGame);
      const gas = await tx.estimateGas({
        from: account
      });
      console.log(`Estimated gas for dealer${action}: ${gas}`);
  
      await tx.send({
        from: account,
        gas: Math.ceil(Number(gas) * 1.2)
      });
  
      console.log(`Dealer action ${action} executed successfully.`);
    } catch (error) {
      console.error(`Error executing dealer ${action}:`, error);
      setError(handleTransactionError(error));
    } finally {
      setLoading(false);
    }
  };
  
  const dealerHit = () => {
    console.log("Dealer Hit action triggered.");
    dealerGameAction('Hit');
  };
  
  const dealerStand = () => {
    console.log("Dealer Stand action triggered.");
    dealerGameAction('Stand');
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

  const returnToLobby = () => {
    setActiveGame(null);
    setPlayerCards([]);
    setDealerCards([]);
    setSplitCards([]);
    setGameState(null);
    setGameResult(null);
    setGameComplete(false);
    fetchLobbies();
  };
  
  return (
    <div className="blackjack-page">
      {renderError()}
      
      {!activeGame ? (
        <>
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
        </>
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
        dealerHit={dealerHit}
        dealerStand={dealerStand}
        account={account}
        playerAddress={playerAddress}
        dealerAddress={dealerAddress}
        gameResult={gameResult}
        gameComplete={gameComplete}
        onReturnToLobby={returnToLobby}
      />
      )}
    </div>
  );
};

export default BlackjackPage;