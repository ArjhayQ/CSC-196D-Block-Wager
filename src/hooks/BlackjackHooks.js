// src/hooks/BlackjackHooks.js
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../Web3Context';
import Logger from '../utils/logger';

export const useLobby = () => {
  const { contract, account } = useWeb3();
  const [lobbies, setLobbies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGameId, setActiveGameId] = useState(null);
  const [gameEvents, setGameEvents] = useState(new Map());

  const fetchLobbies = useCallback(async () => {
    if (!contract) {
      Logger.warn('useLobby', 'fetchLobbies called without contract');
      return;
    }
    
    try {
      Logger.log('useLobby', 'Fetching lobbies');
      setIsLoading(true);
      const openLobbies = await contract.getOpenLobbies();
      Logger.log('useLobby', 'Raw lobbies data:', openLobbies);
      
      const formattedLobbies = openLobbies.map(lobby => ({
        id: lobby.lobbyId.toString(),
        host: lobby.host,
        betAmount: ethers.formatEther(lobby.betAmount),
        status: lobby.status,
        gameId: lobby.gameId.toString()
      }));
      
      Logger.log('useLobby', 'Formatted lobbies:', formattedLobbies);
      setLobbies(formattedLobbies);

      // Check if any of these lobbies have an associated game for the current user
      formattedLobbies.forEach(lobby => {
        if (gameEvents.has(lobby.id)) {
          const gameEvent = gameEvents.get(lobby.id);
          if (isUserInvolvedInGame(gameEvent, account)) {
            setActiveGameId(gameEvent.gameId.toString());
          }
        }
      });
    } catch (error) {
      Logger.error('useLobby', 'Error fetching lobbies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contract, account, gameEvents]);

  const isUserInvolvedInGame = (gameEvent, userAccount) => {
    if (!gameEvent || !userAccount) return false;
    const player = gameEvent.player.toLowerCase();
    const dealer = gameEvent.dealer?.toLowerCase();
    const user = userAccount.toLowerCase();
    return user === player || user === dealer;
  };

  useEffect(() => {
    if (contract) {
      Logger.log('useLobby', 'Setting up event listeners');
      
      const handleGameCreated = (gameId, player, betAmount, event) => {
        Logger.log('useLobby', 'GameCreated event received:', {
          gameId: gameId.toString(),
          player,
          betAmount: betAmount.toString()
        });

        // Get the transaction receipt to find the lobby information
        event.getTransactionReceipt().then(receipt => {
          const lobbyJoinedEvent = receipt.logs
            .map(log => {
              try {
                return contract.interface.parseLog(log);
              } catch (e) {
                return null;
              }
            })
            .find(e => e && e.name === 'LobbyJoined');

          if (lobbyJoinedEvent) {
            const lobbyId = lobbyJoinedEvent.args[0].toString();
            const gameInfo = {
              gameId: gameId.toString(),
              player: player,
              dealer: event.log.address, // This should be the contract address where the dealer info is stored
              lobbyId: lobbyId
            };
            
            setGameEvents(prev => new Map(prev).set(lobbyId, gameInfo));
            
            if (isUserInvolvedInGame(gameInfo, account)) {
              setActiveGameId(gameId.toString());
            }
          }
        });
      };

      const handleLobbyEvent = () => {
        fetchLobbies();
      };

      contract.on('GameCreated', handleGameCreated);
      contract.on('LobbyCreated', handleLobbyEvent);
      contract.on('LobbyJoined', handleLobbyEvent);
      contract.on('LobbyCancelled', handleLobbyEvent);

      return () => {
        contract.off('GameCreated', handleGameCreated);
        contract.off('LobbyCreated', handleLobbyEvent);
        contract.off('LobbyJoined', handleLobbyEvent);
        contract.off('LobbyCancelled', handleLobbyEvent);
      };
    }
  }, [contract, account, fetchLobbies]);

  const createLobby = async (betAmount) => {
    if (!contract || !account) {
      Logger.error('useLobby', 'Cannot create lobby - missing contract or account');
      return;
    }
    
    try {
      Logger.log('useLobby', `Creating lobby with bet amount: ${betAmount}`);
      const dealerStake = ethers.parseEther((parseFloat(betAmount) * 1.5).toString());
      Logger.log('useLobby', `Dealer stake: ${dealerStake}`);
      
      const tx = await contract.createLobby({ value: dealerStake });
      Logger.log('useLobby', 'Create lobby transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      Logger.log('useLobby', 'Create lobby transaction confirmed:', receipt);
      
      await fetchLobbies();
      return true;
    } catch (error) {
      Logger.error('useLobby', 'Error creating lobby:', error);
      throw error;
    }
  };

  const joinLobby = async (lobbyId, betAmount) => {
    if (!contract || !account) {
      Logger.error('useLobby', 'Cannot join lobby - missing contract or account');
      return;
    }
    
    try {
      Logger.log('useLobby', `Joining lobby ${lobbyId} with bet amount: ${betAmount}`);
      const value = ethers.parseEther(betAmount.toString());
      
      // Get gas estimate
      const gasEstimate = await contract.joinLobby.estimateGas(lobbyId, { value });
      Logger.log('useLobby', `Gas estimate for join: ${gasEstimate}`);
      
      // Add 20% buffer
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      Logger.log('useLobby', `Using gas limit: ${gasLimit}`);
      
      const tx = await contract.joinLobby(lobbyId, { value, gasLimit });
      Logger.log('useLobby', 'Join lobby transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      Logger.log('useLobby', 'Join lobby transaction confirmed:', receipt);

      // Look for GameCreated event in the receipt
      const gameCreatedEvent = receipt.logs
        .map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'GameCreated');

      if (gameCreatedEvent) {
        const newGameId = gameCreatedEvent.args.gameId.toString();
        Logger.log('useLobby', `Game created with ID: ${newGameId}`);
        setActiveGameId(newGameId);
      } else {
        Logger.warn('useLobby', 'No GameCreated event found in receipt');
      }
      
      await fetchLobbies();
      return true;
    } catch (error) {
      Logger.error('useLobby', 'Error joining lobby:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchLobbies();
    
    if (contract) {
      Logger.log('useLobby', 'Setting up event listeners');
      
      const handleGameEvent = async (event) => {
        Logger.log('useLobby', 'Game event received:', event);
        await fetchLobbies();
      };

      const filters = [
        contract.filters.LobbyCreated(),
        contract.filters.LobbyJoined(),
        contract.filters.LobbyCancelled(),
        contract.filters.GameCreated()
      ];

      filters.forEach(filter => {
        contract.on(filter, handleGameEvent);
      });

      return () => {
        Logger.log('useLobby', 'Cleaning up event listeners');
        filters.forEach(filter => {
          contract.off(filter, handleGameEvent);
        });
      };
    }
  }, [contract, fetchLobbies]);

  return {
    lobbies,
    isLoading,
    createLobby,
    joinLobby,
    refreshLobbies: fetchLobbies,
    activeGameId
  };
};

export const useGame = (gameId) => {
  const { contract, account } = useWeb3();
  const [gameState, setGameState] = useState({
    playerHand: [],
    dealerHand: [],
    splitHand: [],
    playerScore: 0,
    dealerScore: 0,
    currentBet: 0,
    isPlayerTurn: false,
    canSplit: false,
    canDouble: false,
    isComplete: false,
    isSplit: false
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchGameState = useCallback(async () => {
    if (!contract || !gameId) {
      Logger.warn('useGame', 'fetchGameState called without contract or gameId');
      return;
    }
    
    try {
      Logger.log('useGame', `Fetching game state for game ${gameId}`);
      setIsLoading(true);
      
      const [playerHand, dealerHand, splitHand, state] = await Promise.all([
        contract.getPlayerHand(gameId),
        contract.getDealerHand(gameId),
        contract.getSplitHand(gameId),
        contract.getGameState(gameId)
      ]);

      Logger.log('useGame', 'Game state fetched:', {
        playerHand,
        dealerHand,
        splitHand,
        state
      });

      setGameState({
        playerHand,
        dealerHand,
        splitHand,
        playerScore: state.playerScore,
        dealerScore: state.dealerScore,
        currentBet: state.betAmount,
        isPlayerTurn: state.isPlayerTurn,
        canSplit: state.canSplit,
        canDouble: state.canDouble,
        isComplete: state.isComplete,
        isSplit: state.isSplit
      });
    } catch (error) {
      Logger.error('useGame', `Error fetching game state for game ${gameId}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [contract, gameId]);

  const gameActions = {
    hit: async () => {
      try {
        Logger.log('useGame', `Executing hit action for game ${gameId}`);
        const tx = await contract.hit(gameId);
        Logger.log('useGame', 'Hit transaction sent:', tx.hash);
        await tx.wait();
        Logger.log('useGame', 'Hit transaction confirmed');
        await fetchGameState();
      } catch (error) {
        Logger.error('useGame', 'Error executing hit:', error);
        throw error;
      }
    },

    stand: async () => {
      try {
        Logger.log('useGame', `Executing stand action for game ${gameId}`);
        const tx = await contract.stand(gameId);
        Logger.log('useGame', 'Stand transaction sent:', tx.hash);
        await tx.wait();
        Logger.log('useGame', 'Stand transaction confirmed');
        await fetchGameState();
      } catch (error) {
        Logger.error('useGame', 'Error executing stand:', error);
        throw error;
      }
    },

    doubleDown: async () => {
      try {
        Logger.log('useGame', `Executing double down for game ${gameId}`);
        const tx = await contract.doubleDown(gameId, {
          value: ethers.parseEther(gameState.currentBet.toString())
        });
        Logger.log('useGame', 'Double down transaction sent:', tx.hash);
        await tx.wait();
        Logger.log('useGame', 'Double down transaction confirmed');
        await fetchGameState();
      } catch (error) {
        Logger.error('useGame', 'Error executing double down:', error);
        throw error;
      }
    },

    split: async () => {
      try {
        Logger.log('useGame', `Executing split for game ${gameId}`);
        const tx = await contract.split(gameId, {
          value: ethers.parseEther(gameState.currentBet.toString())
        });
        Logger.log('useGame', 'Split transaction sent:', tx.hash);
        await tx.wait();
        Logger.log('useGame', 'Split transaction confirmed');
        await fetchGameState();
      } catch (error) {
        Logger.error('useGame', 'Error executing split:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    fetchGameState();

    if (contract && gameId) {
      Logger.log('useGame', `Setting up event listeners for game ${gameId}`);
      
      const handleGameEvent = async (event) => {
        Logger.log('useGame', 'Game event received:', event);
        await fetchGameState();
      };

      const filters = [
        contract.filters.CardDealt(gameId),
        contract.filters.PlayerAction(gameId),
        contract.filters.DealerAction(gameId),
        contract.filters.GameComplete(gameId)
      ];

      filters.forEach(filter => {
        contract.on(filter, handleGameEvent);
      });

      return () => {
        Logger.log('useGame', 'Cleaning up event listeners');
        filters.forEach(filter => {
          contract.off(filter, handleGameEvent);
        });
      };
    }
  }, [contract, gameId, fetchGameState]);

  return {
    gameState,
    isLoading,
    ...gameActions,
    refreshGameState: fetchGameState
  };
};