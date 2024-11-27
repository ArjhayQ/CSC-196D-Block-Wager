// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./CardLib.sol";

contract Blackjack {
    using CardLib for CardLib.Card;

    // Enums
    enum LobbyStatus { Open, InProgress, Completed, Cancelled }
    enum GameState { Open, Dealing, PlayerTurn, DealerTurn, Complete }
    enum ActionState { None, Split, Doubled }

    // Constants
    uint8 constant DEALER_MIN_STAND = 17;
    uint8 constant BLACKJACK = 21;
    uint8 constant ACE_HIGH = 11;
    uint8 constant ACE_LOW = 1;
    uint256 constant BLACKJACK_MULTIPLIER = 150; // 3:2 payout
    uint256 constant NORMAL_MULTIPLIER = 200;    // 2:1 payout
    uint256 constant MULTIPLIER_BASE = 100;      // Base for multiplier calculations
    uint256 constant LOBBY_TIMEOUT = 1 hours;
    uint256 constant GAME_TIMEOUT = 30 minutes;
    bytes32 constant SALT_BASE = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;

    // Using CardLib's Card struct
    using CardLib for CardLib.Card;

    // Card struct is now part of CardLib

    // Scores struct to store player and dealer scores
    struct Scores {
        uint8 playerScore;
        uint8 dealerScore;
    }

    // Lobby struct to handle game creation and joining
    struct Lobby {
        uint256 lobbyId;
        address payable host;
        uint256 betAmount;
        LobbyStatus status;
        uint256 gameId;
        uint256 creationTime;
    }

    // Game struct to store all game-related data
    struct Game {
        address payable player;
        address payable dealer;
        uint256 betAmount;
        uint256 dealerStake;
        CardLib.Card[] playerHand;
        CardLib.Card[] dealerHand;
        CardLib.Card[] splitHand;
        uint256 gameId;
        GameState state;
        ActionState actionState;
        bool isBlackjack;
        bool playerBusted;
        bool dealerBusted;
        bool isSplitHand;
        Scores scores;
        bool[] usedCards;
        uint256 lastActionTime;
        bool splitHandCompleted;
        uint256 splitBetAmount;
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
    event LobbyCreated(uint256 indexed lobbyId, address indexed host, uint256 betAmount);
    event LobbyJoined(uint256 indexed lobbyId, address indexed player);
    event LobbyCancelled(uint256 indexed lobbyId, address indexed host, uint256 refundAmount);
    event LobbyTimeout(uint256 indexed lobbyId);
    event GameCreated(uint256 indexed gameId, address indexed player, address indexed dealer, uint256 betAmount);
    event CardDealt(uint256 indexed gameId, address indexed recipient, uint8 value, uint8 suit, bool isDealer);
    event PlayerAction(uint256 indexed gameId, string action);
    event SplitHandStarted(uint256 indexed gameId);
    event HandBusted(uint256 indexed gameId, bool isSplitHand);
    event DealerAction(uint256 indexed gameId, string action);
    event DealerTurnComplete(uint256 indexed gameId, uint8 dealerScore);
    event GameComplete(uint256 indexed gameId, string result, uint256 payout, uint8 playerScore, uint8 dealerScore);
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

    // Create a new lobby
    function createLobby() external payable {
        require(msg.value >= minBet * 3 / 2 && msg.value <= maxBet * 3 / 2, "Invalid dealer stake amount");

        uint256 betAmount = msg.value * 2 / 3; // Dealer stakes 1.5x the bet amount
        lobbies[lobbyCounter] = Lobby({
            lobbyId: lobbyCounter,
            host: payable(msg.sender),
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
        require(msg.sender == lobby.host, "Only host can cancel");
        require(lobby.status == LobbyStatus.Open, "Lobby not open");

        lobby.status = LobbyStatus.Cancelled;
        uint256 refundAmount = lobby.betAmount * 3 / 2;
        lobby.host.transfer(refundAmount);

        emit LobbyCancelled(lobbyId, msg.sender, refundAmount);
    }

    // Join an existing lobby and start the game
    function joinLobby(uint256 lobbyId) external payable {
        Lobby storage lobby = lobbies[lobbyId];
        require(lobbyId < lobbyCounter, "Invalid lobby ID");
        require(lobby.status == LobbyStatus.Open, "Lobby not open");
        require(msg.sender != lobby.host, "Cannot join your own lobby");
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
                uint256 refundAmount = lobbies[i].betAmount * 3 / 2;
                lobbies[i].host.transfer(refundAmount);
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
        newGame.dealer = lobby.host;
        newGame.betAmount = lobby.betAmount;
        newGame.dealerStake = lobby.betAmount * 3 / 2;
        newGame.gameId = currentGameId;
        newGame.state = GameState.Open;
        newGame.actionState = ActionState.None;
        newGame.isBlackjack = false;
        newGame.playerBusted = false;
        newGame.dealerBusted = false;
        newGame.isSplitHand = false;
        newGame.scores = Scores(0, 0);
        newGame.lastActionTime = block.timestamp;
        newGame.splitHandCompleted = false;
        newGame.splitBetAmount = 0;
        newGame.randomnessCommit = _generateCommit(currentGameId);

        // Initialize usedCards array with proper length
        delete newGame.usedCards;
        newGame.usedCards = new bool[](52);
        for (uint256 i = 0; i < 52; i++) {
            newGame.usedCards[i] = false;
        }

        emit GameCreated(currentGameId, player, lobby.host, lobby.betAmount);

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
            game.playerHand.length + game.dealerHand.length + game.splitHand.length
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
        } else if (game.isSplitHand) {
            game.splitHand.push(newCard);
            emit CardDealt(gameId, game.player, newCard.value, newCard.suit, false);
        } else {
            game.playerHand.push(newCard);
            emit CardDealt(gameId, game.player, newCard.value, newCard.suit, false);
        }
    }

    // Internal helper to check if a card has already been used
    function _isCardUsed(Game storage game, CardLib.Card memory card) internal view returns (bool) {
        uint256 cardIndex = (card.suit - 1) * 13 + (card.value - 1);
        return game.usedCards[cardIndex];
    }

    // Internal helper to mark a card as used
    function _markCardAsUsed(Game storage game, CardLib.Card memory card) internal {
        uint256 cardIndex = (card.suit - 1) * 13 + (card.value - 1);
        game.usedCards[cardIndex] = true;
    }

    // Player action: Hit
    function hit(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(game.state == GameState.PlayerTurn, "Not player's turn");
        require(!game.playerBusted, "Player already busted");

        // Deal card
        _dealCard(gameId, false);

        // Update the correct hand's score
        if (game.isSplitHand) {
            game.scores.playerScore = CardLib.calculateHandValue(game.splitHand);
        } else {
            game.scores.playerScore = CardLib.calculateHandValue(game.playerHand);
        }

        if (game.scores.playerScore > BLACKJACK) {
            game.playerBusted = true;
            if (game.actionState == ActionState.Split && !game.splitHandCompleted) {
                // Switch to split hand
                game.splitHandCompleted = true;
                game.isSplitHand = true;
                game.playerBusted = false;
                game.scores.playerScore = CardLib.calculateHandValue(game.splitHand);
                emit PlayerAction(gameId, "Switch to split hand");
                emit PlayerTurn(gameId); // Emit PlayerTurn for split hand
            } else {
                emit HandBusted(gameId, game.isSplitHand);
                _endGame(gameId);
            }
        }

        game.lastActionTime = block.timestamp;
        emit PlayerAction(gameId, "Hit");
    }


    // Player action: Stand
    function stand(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(game.state == GameState.PlayerTurn, "Not player's turn");

        if (game.actionState == ActionState.Split && !game.splitHandCompleted) {
            // Switch to the split hand
            game.splitHandCompleted = true;
            game.isSplitHand = true;
            game.scores.playerScore = CardLib.calculateHandValue(game.splitHand);
            emit PlayerAction(gameId, "Switch to split hand");
        } else {
            game.state = GameState.DealerTurn;
            emit DealerTurn(gameId); // Emit DealerTurn event
            _dealerTurn(gameId);
        }

        game.lastActionTime = block.timestamp;
        emit PlayerAction(gameId, "Stand");
    }


    // Player action: Double Down
    function doubleDown(uint256 gameId) external payable {
        Game storage game = games[gameId];
        require(msg.sender == game.player, "Not your game");
        require(game.state == GameState.PlayerTurn, "Not player's turn");
        require(game.playerHand.length == 2, "Can only double down on initial hand");
        require(msg.value == game.betAmount, "Must match original bet");
        require(game.actionState == ActionState.None, "Cannot double after split");

        game.betAmount += msg.value;
        game.actionState = ActionState.Doubled;

        // Deal one card and end player's turn
        _dealCard(gameId, false);
        game.scores.playerScore = CardLib.calculateHandValue(game.playerHand);

        if (game.scores.playerScore > BLACKJACK) {
            game.playerBusted = true;
            emit HandBusted(gameId, false);
            _endGame(gameId);
        } else {
            game.state = GameState.DealerTurn;
            _dealerTurn(gameId);
        }

        game.lastActionTime = block.timestamp;
        emit PlayerAction(gameId, "Double Down");
    }

    // Player action: Split
    function split(uint256 gameId) external payable {
        Game storage game = games[gameId];
        _validateSplitConditions(game, msg.sender, msg.value);

        _executeSplit(game, gameId);

        game.lastActionTime = block.timestamp;
        emit SplitHandStarted(gameId);
        emit PlayerAction(gameId, "Split");
    }

    // Internal function to validate split conditions
    function _validateSplitConditions(
        Game storage game,
        address sender,
        uint256 value
    ) internal view {
        require(sender == game.player, "Not your game");
        require(game.state == GameState.PlayerTurn, "Not player's turn");
        require(game.playerHand.length == 2, "Can only split initial hand");
        require(game.actionState == ActionState.None, "Cannot split after other actions");
        require(value == game.betAmount, "Must match original bet");

        // Get card values, handling face cards
        uint8 card1Value = CardLib.getCardValue(game.playerHand[0]);
        uint8 card2Value = CardLib.getCardValue(game.playerHand[1]);
        require(card1Value == card2Value, "Can only split equal value cards");
    }

    // Internal function to execute split
    function _executeSplit(Game storage game, uint256 gameId) internal {
        game.splitBetAmount = game.betAmount;
        game.actionState = ActionState.Split;

        // Remove second card from player's hand
        CardLib.Card memory secondCard = game.playerHand[1];
        game.playerHand.pop();

        // Initialize split hand and add the second card
        game.splitHand.push(secondCard);

        // Deal new cards to both hands
        _dealCard(gameId, false); // To first hand
        game.isSplitHand = true; // Next card goes to split hand
        _dealCard(gameId, false); // To split hand
        game.isSplitHand = false; // Reset back to first hand

        // Update scores
        game.scores.playerScore = CardLib.calculateHandValue(game.playerHand);
    }

    // Modified dealer turn to be manual instead of automatic
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

    function dealerStand(uint256 gameId) external {
        Game storage game = games[gameId];
        require(msg.sender == game.dealer, "Only dealer can perform this action");
        require(game.state == GameState.DealerTurn, "Not dealer's turn");

        emit DealerAction(gameId, "Stand");
        emit DealerTurnComplete(gameId, game.scores.dealerScore);
        _endGame(gameId);
    }

    // Remove the automatic _dealerTurn implementation
    function _dealerTurn(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.state == GameState.DealerTurn, "Not dealer's turn");
        emit DealerTurn(gameId);
    }

    // Internal function to determine if dealer should hit
    function _shouldDealerHit(CardLib.Card[] memory hand, uint8 score) internal pure returns (bool) {
        if (score >= DEALER_MIN_STAND) {
            // Check for soft 17 (Ace + 6)
            if (score == 17) {
                bool hasAce = false;
                uint8 nonAceSum = 0;

                for (uint8 i = 0; i < hand.length; i++) {
                    if (hand[i].value == 1) { // Ace
                        hasAce = true;
                    } else {
                        nonAceSum += (hand[i].value > 10 ? 10 : hand[i].value);
                    }
                }

                // If it's a soft 17 (Ace counting as 11 + 6), dealer must hit
                return hasAce && nonAceSum == 6;
            }
            return false;
        }
        return true;
    }

    // Game resolution
    function _endGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.state != GameState.Complete, "Game already completed");

        (uint256 payoutToPlayer, uint256 payoutToDealer, string memory result) = _calculateGamePayout(game);

        // Handle payouts
        if (payoutToPlayer > 0) {
            payable(game.player).transfer(payoutToPlayer);
        }

        if (payoutToDealer > 0) {
            payable(game.dealer).transfer(payoutToDealer);
        }

        _finalizeGameState(gameId, game, result, payoutToPlayer);

        // Update lobby status
        for (uint256 i = 0; i < lobbyCounter; i++) {
            if (lobbies[i].gameId == gameId) {
                lobbies[i].status = LobbyStatus.Completed;
                break;
            }
        }
    }

    // Internal function to calculate game payout
    function _calculateGamePayout(Game storage game)
        internal
        view
        returns (uint256 payoutToPlayer, uint256 payoutToDealer, string memory result)
    {
        uint256 playerPayout = _calculateMainHandPayout(game);

        if (game.actionState == ActionState.Split) {
            playerPayout += _calculateSplitHandPayout(game);
        }

        if (playerPayout > 0) {
            result = "Player Wins";
            payoutToPlayer = playerPayout;
            payoutToDealer = 0;
        } else if (playerPayout == 0 && !game.playerBusted && !game.dealerBusted && game.scores.playerScore == game.scores.dealerScore) {
            // Push - return bets
            result = "Push";
            payoutToPlayer = game.betAmount + game.splitBetAmount; // Return player's bets
            payoutToDealer = game.dealerStake - (game.betAmount + game.splitBetAmount); // Return remaining dealer stake
        } else {
            result = "Dealer Wins";
            payoutToPlayer = 0;
            payoutToDealer = game.dealerStake + game.betAmount + game.splitBetAmount; // Dealer takes the bets
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

    // Internal function to calculate split hand payout
    function _calculateSplitHandPayout(Game storage game) internal view returns (uint256) {
        uint8 splitScore = CardLib.calculateHandValue(game.splitHand);
        bool splitBusted = splitScore > BLACKJACK;

        return _determineHandPayout(
            splitScore,
            game.scores.dealerScore,
            game.splitBetAmount,
            splitBusted,
            game.dealerBusted,
            false
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

        if (isBlackjack && !dealerBusted && dealerScore != BLACKJACK) {
            // Blackjack pays 3:2
            return (betAmount * BLACKJACK_MULTIPLIER) / MULTIPLIER_BASE;
        }

        if (dealerBusted || (!playerBusted && playerScore > dealerScore)) {
            // Regular win pays 1:1
            return betAmount * 2;
        }

        if (!playerBusted && playerScore == dealerScore) {
            // Push - return original bet
            return betAmount;
        }

        return 0;
    }

    // Internal function to finalize game state
    function _finalizeGameState(
        uint256 gameId,
        Game storage game,
        string memory result,
        uint256 payoutToPlayer
    ) internal {
        game.state = GameState.Complete;
        emit GameComplete(gameId, result, payoutToPlayer, game.scores.playerScore, game.scores.dealerScore);
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

    /**
     * @dev Returns the split hand for a specific game, if any.
     * @param gameId The ID of the game.
     * @return An array of Card structs representing the split hand.
     */
    function getSplitHand(uint256 gameId) external view returns (CardLib.Card[] memory) {
        return games[gameId].splitHand;
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
            uint256 betAmount,
            bool canSplit,
            bool canDouble,
            bool isSplit
        )
    {
        Game storage game = games[gameId];

        return (
            game.scores.playerScore,
            game.scores.dealerScore,
            game.state == GameState.PlayerTurn,
            game.state == GameState.Complete,
            game.betAmount,
            _canSplitHand(game),
            _canDoubleDown(game),
            game.actionState == ActionState.Split
        );
    }

    // Internal helper to check if hand can be split
    function _canSplitHand(Game storage game) internal view returns (bool) {
        if (game.playerHand.length != 2 || game.actionState != ActionState.None) {
            return false;
        }

        uint8 card1Value = CardLib.getCardValue(game.playerHand[0]);
        uint8 card2Value = CardLib.getCardValue(game.playerHand[1]);

        return card1Value == card2Value;
    }

    // Internal helper to check if hand can be doubled down
    function _canDoubleDown(Game storage game) internal view returns (bool) {
        return game.playerHand.length == 2 &&
            game.actionState == ActionState.None &&
            game.state == GameState.PlayerTurn;
    }
}

