// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract CoinFlip {
    struct Lobby {
        address payable dealer; // Mark dealer as payable
        uint256 betAmount;
        string choice; // "Heads" or "Tails"
        address payable joinedUser; // Mark joinedUser as payable
        string result; // "Heads" or "Tails"
        string status; // "Open", "Flipping", "Ended"
    }

    mapping(uint256 => Lobby) public lobbies;
    uint256 public lobbyCounter;

    event LobbyCreated(uint256 lobbyId, address dealer, uint256 betAmount, string choice);
    event LobbyJoined(uint256 lobbyId, address joinedUser);
    event CoinFlipped(uint256 lobbyId, string result);

    function createLobby(string memory choice) external payable {
        require(
            keccak256(abi.encodePacked(choice)) == keccak256("Heads") ||
            keccak256(abi.encodePacked(choice)) == keccak256("Tails"),
            "Invalid choice"
        );
        require(msg.value > 0, "Bet amount must be greater than 0");

        lobbies[lobbyCounter] = Lobby({
            dealer: payable(msg.sender), // Explicitly cast msg.sender to payable
            betAmount: msg.value,
            choice: choice,
            joinedUser: payable(address(0)), // Explicitly cast address(0) to payable
            result: "",
            status: "Open"
        });

        emit LobbyCreated(lobbyCounter, msg.sender, msg.value, choice);
        lobbyCounter++;
    }

    function joinLobby(uint256 lobbyId) external payable {
        Lobby storage lobby = lobbies[lobbyId];
        require(
            keccak256(abi.encodePacked(lobby.status)) == keccak256("Open"),
            "Lobby is not available"
        );
        require(lobby.joinedUser == payable(address(0)), "Lobby already joined"); // Explicitly cast address(0) to payable
        require(lobby.dealer != msg.sender, "Host cannot join their own lobby");
        require(msg.value == lobby.betAmount, "Incorrect bet amount");

        lobby.joinedUser = payable(msg.sender); // Explicitly cast msg.sender to payable
        lobby.status = "Flipping";

        emit LobbyJoined(lobbyId, msg.sender);

        // Automatically flip the coin after a short delay (simulated)
        flipCoin(lobbyId);
    }

    function flipCoin(uint256 lobbyId) internal {
        Lobby storage lobby = lobbies[lobbyId];
        require(
            keccak256(abi.encodePacked(lobby.status)) == keccak256("Flipping"),
            "Game is not ready to flip"
        );

        // Randomly determine the result
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)
            )
        ) % 2;

        string memory result = random == 0 ? "Heads" : "Tails";

        lobby.result = result;
        lobby.status = "Ended";

        emit CoinFlipped(lobbyId, result);

        // Determine winner and transfer funds
        if (keccak256(abi.encodePacked(result)) == keccak256(abi.encodePacked(lobby.choice))) {
            // Host wins
            lobby.dealer.transfer(lobby.betAmount * 2);
        } else {
            // Joined user wins
            lobby.joinedUser.transfer(lobby.betAmount * 2);
        }
    }
}
