// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./CardLib.sol";

contract Blackjack {
    using CardLib for CardLib.Card;

    // Enums
    enum LobbyStatus { Open, InProgress, Completed, Cancelled }
    enum GameState { Open, Dealing, PlayerTurn, DealerTurn, Complete }

    // Constants
    uint8 constant DEALER_MIN_STAND = 17;
    uint8 constant BLACKJACK = 21;
    uint8 constant ACE_HIGH = 11;
    uint8 constant ACE_LOW = 1;
    uint256 constant BLACKJACK_MULTIPLIER = 250; // 3:2 payout represented as 250 basis points
    uint256 constant MULTIPLIER_BASE = 100;      // Base for multiplier calculations
    uint256 constant LOBBY_TIMEOUT = 1 hours;
    uint256 constant GAME_TIMEOUT = 30 minutes;
    bytes32 constant SALT_BASE = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;

    // Using CardLib's Card struct
    using CardLib for CardLib.Card;

    // Scores struct to store player and dealer scores
    struct Scores {
        uint8 playerScore;
        uint8 dealerScore;
    }

    // Lobby struct to handle game creation and joining
    struct Lobby {
        uint256 lobbyId;
        address payable dealer; // Dealer's address
        uint256 betAmount;      // Player's bet amount
        LobbyStatus status;
        uint256 gameId;
        uint256 creationTime;
    }

    // Game struct to store all game-related data
    struct Game {
        address payable player; // Player's address
        address payable dealer; // Dealer's address
        uint256 betAmount;      // Player's bet
        uint256 dealerStake;    // Dealer's stake (1.5x bet)
        CardLib.Card[] playerHand;
        CardLib.Card[] dealerHand;
        uint256 gameId;
        GameState state;
        bool isBlackjack;
        bool playerBusted;
        bool dealerBusted;
        Scores scores;
        bool[] usedCards;
        uint256 lastActionTime;
        bytes32 randomnessCommit;
    }

    // State variables
    mapping(uint256 => Game) public games;
    mapping(uint256 => Lobby) public lobbies;
    uint256 public gameCounter;
    uint256 public lobbyCounter;
    uint256 public minBet;
    uint256 public maxBet;

    // Events
    event LobbyCreated(uint256 indexed lobbyId, address indexed dealer, uint256 betAmount);
    event LobbyJoined(uint256 indexed lobbyId, address indexed player);
    event LobbyCancelled(uint256 indexed lobbyId, address indexed dealer, uint256 refundAmount);
    event LobbyTimeout(uint256 indexed lobbyId);
    event GameCreated(uint256 indexed gameId, address indexed player, address indexed dealer, uint256 betAmount);
    event CardDealt(uint256 indexed gameId, address indexed recipient, uint8 value, uint8 suit, bool isDealer);
    event PlayerAction(uint256 indexed gameId, string action);
    event HandBusted(uint256 indexed gameId);
    event DealerAction(uint256 indexed gameId, string action);
    event GameComplete(uint256 indexed gameId, string result, uint256 playerPayout, uint256 dealerPayout, uint8 playerScore, uint8 dealerScore);
    event PlayerTurn(uint256 indexed gameId);
    event DealerTurn(uint256 indexed gameId);

    constructor(uint256 _minBet, uint256 _maxBet) {
        require(_minBet > 0 && _maxBet >= _minBet, "Invalid bet amounts");
        minBet = _minBet;
        maxBet = _maxBet;
    }

    // Get All Open Lobbies
    function getOpenLobbies() external view returns (Lobby[] memory) {
        Lobby[] memory openLobbies = new Lobby[](lobbyCounter);
        uint256 openLobbiesCount = 0;

        for (uint256 i = 0; i < lobbyCounter; i++) {
            if (lobbies[i].status == LobbyStatus.Open) {
                openLobbies[openLobbiesCount] = lobbies[i];
                openLobbiesCount++;
            }
        }

        // Trim the array to the actual number of open lobbies
        Lobby[] memory trimmedLobbies = new Lobby[](openLobbiesCount);
        for (uint256 i = 0; i < openLobbiesCount; i++) {
            trimmedLobbies[i] = openLobbies[i];
        }

        return trimmedLobbies;
    }

    // Create a new lobby as Dealer
    function createLobby(uint256 betAmount) external payable {
        require(betAmount >= minBet && betAmount <= maxBet, "Bet amount out of range");
        require(msg.value == (betAmount * 3) / 2, "Dealer must stake 1.5x the bet amount");

        lobbies[lobbyCounter] = Lobby({
            lobbyId: lobbyCounter,
            dealer: payable(msg.sender),
            betAmount: betAmount,
            status: LobbyStatus.Open,
            gameId: 0,
            creationTime: block.timestamp
        });

        emit LobbyCreated(lobbyCounter, msg.sender, betAmount);
        lobbyCounter++;
    }

    // Cancel lobby
    function cancelLobby(uint256 lobbyId) external {
        Lobby storage lobby = lobbies[lobbyId];
        require(msg.sender == lobby.dealer, "Only dealer can cancel");
        require(lobby.status == LobbyStatus.Open, "Lobby not open");

        lobby.status = LobbyStatus.Cancelled;
        uint256 refundAmount = (lobby.betAmount * 3) / 2;
        lobby.dealer.transfer(refundAmount);

        emit LobbyCancelled(lobbyId, msg.sender, refundAmount);
    }

    // Join an existing lobby as Player and start the game
    function joinLobby(uint256 lobbyId) external payable {
        Lobby storage lobby = lobbies[lobbyId];
        require(lobbyId < lobbyCounter, "Invalid lobby ID");
        require(lobby.status == LobbyStatus.Open, "Lobby not open");
        require(msg.sender != lobby.dealer, "Dealer cannot join their own lobby");
        require(msg.value == lobby.betAmount, "Incorrect bet amount");
        require(lobby.gameId == 0, "Game already started");
        require(block.timestamp <= lobby.creationTime + LOBBY_TIMEOUT, "Lobby has expired");

        // Start the game
        uint256 gameId = _startGame(lobby, msg.sender);

        // Update lobby status
        lobby.status = LobbyStatus.InProgress;
        lobby.gameId = gameId;

        emit LobbyJoined(lobbyId, msg.sender);
    }

    // Cleanup timed-out lobbies
    function cleanupTimedOutLobbies() external {
        for (uint256 i = 0; i < lobbyCounter; i++) {
            if (
                lobbies[i].status == LobbyStatus.Open &&
                block.timestamp > lobbies[i].creationTime + LOBBY_TIMEOUT
            ) {
                lobbies[i].status = LobbyStatus.Cancelled;
                uint256 refundAmount = (lobbies[i].betAmount * 3) / 2;
                lobbies[i].dealer.transfer(refundAmount);
                emit LobbyTimeout(i);
            }
        }
    }

    // Internal function to start a new game
    function _startGame(Lobby storage lobby, address player) internal returns (uint256) {
        uint256 currentGameId = gameCounter;

        // Initialize game
        Game storage newGame = games[currentGameId];
        newGame.player = payable(player);
        newGame.dealer = lobby.dealer;
        newGame.betAmount = lobby.betAmount;
        newGame.dealerStake = (lobby.betAmount * 3) / 2;
        newGame.gameId = currentGameId;
        newGame.state = GameState.Open;
        newGame.isBlackjack = false;
        newGame.playerBusted = false;
        newGame.dealerBusted = false;
        newGame.scores = Scores(0, 0);
        newGame.lastActionTime = block.timestamp;
        newGame.randomnessCommit = _generateCommit(currentGameId);

        // Initialize usedCards array with proper length
        delete newGame.usedCards;
        newGame.usedCards = new bool[](52);
        for (uint256 i = 0; i < 52; i++) {
            newGame.usedCards[i] = false;
        }

        emit GameCreated(currentGameId, player, lobby.dealer, lobby.betAmount);

        // Deal initial cards
        _dealInitialCards(currentGameId);

        gameCounter++;
        return currentGameId;
    }

    // Internal function to deal initial cards
    function _dealInitialCards(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.state == GameState.Open, "Game not in open state");

        game.state = GameState.Dealing;

        // Deal two cards each to player and dealer
        for (uint8 i = 0; i < 2; i++) {
            _dealCard(gameId, false); // To player
            _dealCard(gameId, true);  // To dealer
        }

        // Calculate initial scores
        game.scores.playerScore = CardLib.calculateHandValue(game.playerHand);
        game.scores.dealerScore = CardLib.calculateHandValue(game.dealerHand);

        // Check for blackjack
        if (game.scores.playerScore == BLACKJACK) {
            game.isBlackjack = true;
            _endGame(gameId);
        } else {
            game.state = GameState.PlayerTurn;
            emit PlayerTurn(gameId); // Emit PlayerTurn event
        }
    }

    // Internal function to deal a single card
    function _dealCard(uint256 gameId, bool toDealer) internal {
        Game storage game = games[gameId];
        require(game.usedCards.length == 52, "Card tracking not initialized");

        // Generate a unique seed for randomness
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            gameId,
            game.randomnessCommit,
            game.playerHand.length + game.dealerHand.length
        )));

        // Generate a random card that hasn't been used
        CardLib.Card memory newCard = CardLib.generateRandomCard(seed, game.usedCards);
        
        // Mark the card as used
        uint256 cardIndex = CardLib.getCardIndex(newCard);
        require(!game.usedCards[cardIndex], "Card already used");
        game.usedCards[cardIndex] = true;

        // Add card to appropriate hand
        if (toDealer) {
            game.dealerHand.push(newCard);
            emit CardDealt(gameId, game.dealer, newCard.value, newCard.suit, true);
        } else {
            game.playerHand.push(newCard);
            emit CardDealt(gameId, game.player, newCard.value, newCard.suit, false);
        }
    }

    // Player action: Hit
    function hit(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(game.state == GameState.PlayerTurn, "Not player's turn");
        require(!game.playerBusted, "Player already busted");

        // Deal card
        _dealCard(gameId, false);

        game.scores.playerScore = CardLib.calculateHandValue(game.playerHand);

        if (game.scores.playerScore > BLACKJACK) {
            game.playerBusted = true;
            emit HandBusted(gameId);
            _endGame(gameId);
        }

        game.lastActionTime = block.timestamp;
        emit PlayerAction(gameId, "Hit");
    }

    // Player action: Stand
    function stand(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(game.state == GameState.PlayerTurn, "Not player's turn");
        game.state = GameState.DealerTurn;
        _dealerTurn(gameId);

        game.lastActionTime = block.timestamp;
        emit PlayerAction(gameId, "Stand");
    }

    // Dealer action: Hit
    function dealerHit(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.dealer, "Only dealer can perform this action");
        require(game.state == GameState.DealerTurn, "Not dealer's turn");
        require(!game.dealerBusted, "Dealer already busted");

        _dealCard(gameId, true);
        game.scores.dealerScore = CardLib.calculateHandValue(game.dealerHand);

        if (game.scores.dealerScore > BLACKJACK) {
            game.dealerBusted = true;
            emit DealerAction(gameId, "Bust");
            _endGame(gameId);
        }

        game.lastActionTime = block.timestamp;
        emit DealerAction(gameId, "Hit");
    }

    // Dealer action: Stand
    function dealerStand(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.dealer, "Only dealer can perform this action");
        require(game.state == GameState.DealerTurn, "Not dealer's turn");

        emit DealerAction(gameId, "Stand");
        _endGame(gameId);
    }

    function _dealerTurn(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.state == GameState.DealerTurn, "Not dealer's turn");
        emit DealerTurn(gameId);
    }

    // Game resolution
    function _endGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.state != GameState.Complete, "Game already completed");

        (uint256 payoutToPlayer, uint256 payoutToDealer, string memory result) = _calculateGamePayout(game);

        // Handle payouts
        if (payoutToPlayer > 0) {
            game.player.transfer(payoutToPlayer);
        }

        if (payoutToDealer > 0) {
            game.dealer.transfer(payoutToDealer);
        }

        _finalizeGameState(gameId, game, result, payoutToPlayer, payoutToDealer);

        // No need to update lobby status since each lobby is tied to one game
    }

    // Internal function to calculate game payout
    function _calculateGamePayout(Game storage game)
        internal
        view
        returns (uint256 payoutToPlayer, uint256 payoutToDealer, string memory result)
    {
        uint256 totalFunds = game.betAmount + game.dealerStake;
        uint256 playerWinnings = _calculateMainHandPayout(game);
        uint256 playerTotalPayout = game.betAmount + playerWinnings; // Player's original bet + winnings
        uint256 dealerTotalPayout = totalFunds - playerTotalPayout; // Remaining funds to dealer

        payoutToPlayer = playerWinnings > 0 ? playerTotalPayout : 0;
        payoutToDealer = dealerTotalPayout > 0 ? dealerTotalPayout : 0;

        if (game.playerBusted) {
            result = "Dealer wins";
        } else if (game.dealerBusted) {
            result = "Player wins";
        } else if (game.isBlackjack && game.scores.dealerScore != BLACKJACK) {
            result = "Player wins with Blackjack";
        } else if (game.scores.playerScore > game.scores.dealerScore) {
            result = "Player wins";
        } else if (game.scores.playerScore == game.scores.dealerScore) {
            // Push - return player's original bet to the player
            payoutToPlayer = game.betAmount;
            payoutToDealer = game.dealerStake;
            result = "Push/Draw";
        } else {
            result = "Dealer wins";
        }
    }

    // Internal function to calculate main hand payout
    function _calculateMainHandPayout(Game storage game) internal view returns (uint256) {
        return _determineHandPayout(
            game.scores.playerScore,
            game.scores.dealerScore,
            game.betAmount,
            game.playerBusted,
            game.dealerBusted,
            game.isBlackjack
        );
    }

    // Internal pure function to determine hand payout
    function _determineHandPayout(
        uint8 playerScore,
        uint8 dealerScore,
        uint256 betAmount,
        bool playerBusted,
        bool dealerBusted,
        bool isBlackjack
    ) internal pure returns (uint256) {
        if (playerBusted) {
            return 0;
        }

        if (isBlackjack && dealerScore != BLACKJACK) {
            // Blackjack pays 3:2
            return (betAmount * BLACKJACK_MULTIPLIER) / MULTIPLIER_BASE; // winnings = betAmount * 1.5
        }

        if (dealerBusted || playerScore > dealerScore) {
            // Regular win pays 1:1
            return betAmount; // winnings = betAmount
        }

        if (playerScore == dealerScore) {
            // Push - no winnings
            return 0;
        }

        // Player loses
        return 0;
    }

    // Internal function to finalize game state
    function _finalizeGameState(
        uint256 gameId,
        Game storage game,
        string memory result,
        uint256 payoutToPlayer,
        uint256 payoutToDealer
    ) internal {
        game.state = GameState.Complete;
        emit GameComplete(gameId, result, payoutToPlayer, payoutToDealer, game.scores.playerScore, game.scores.dealerScore);
    }

    // ------------------ Helper Functions ------------------

    /**
     * @dev Returns the player's hand for a specific game.
     * @param gameId The ID of the game.
     * @return An array of Card structs representing the player's hand.
     */
    function getPlayerHand(uint256 gameId) external view returns (CardLib.Card[] memory) {
        return games[gameId].playerHand;
    }

    /**
     * @dev Returns the dealer's hand for a specific game.
     * @param gameId The ID of the game.
     * @return An array of Card structs representing the dealer's hand.
     */
    function getDealerHand(uint256 gameId) external view returns (CardLib.Card[] memory) {
        return games[gameId].dealerHand;
    }

    // Helper function to generate commit for randomness
    function _generateCommit(uint256 gameId) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            gameId,
            SALT_BASE
        ));
    }

    // Generate secure random number (placeholder - needs secure implementation)
    function _generateSecureRandom(uint256 gameId, bytes32 commit) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            commit,
            block.timestamp,
            block.prevrandao,
            msg.sender,
            gameId
        )));
    }

    // Function to handle stuck games
    function resolveStuckGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(block.timestamp > game.lastActionTime + GAME_TIMEOUT, "Game not timed out");
        require(game.state != GameState.Complete, "Game already completed");

        if (game.state == GameState.PlayerTurn) {
            // If player timed out, they forfeit
            game.playerBusted = true;
            _endGame(gameId);
        } else if (game.state == GameState.DealerTurn) {
            // If stuck in dealer's turn, complete the game
            _dealerTurn(gameId);
        }
    }

    // Get game state
    function getGameState(uint256 gameId)
        external
        view
        returns (
            uint8 playerScore,
            uint8 dealerScore,
            bool isPlayerTurn,
            bool isComplete,
            uint256 betAmount
        )
    {
        Game storage game = games[gameId];

        return (
            game.scores.playerScore,
            game.scores.dealerScore,
            game.state == GameState.PlayerTurn,
            game.state == GameState.Complete,
            game.betAmount
        );
    }
}
