// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

library CardLib {
    struct Card {
        uint8 value; // 1-13 (Ace = 1, Jack = 11, Queen = 12, King = 13)
        uint8 suit;  // 1-4 (Hearts = 1, Diamonds = 2, Clubs = 3, Spades = 4)
    }

    // Generates a random card based on a seed and available cards
    function generateRandomCard(uint256 seed, bool[] memory usedCards) internal pure returns (Card memory) {
        require(usedCards.length == 52, "Invalid used cards array length");
        
        // Count available cards
        uint256 availableCards = 0;
        for (uint256 i = 0; i < 52; i++) {
            if (!usedCards[i]) {
                availableCards++;
            }
        }
        require(availableCards > 0, "No cards available");

        // Generate random index within available cards
        uint256 targetIndex = seed % availableCards;
        
        // Find the nth available card
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < 52; i++) {
            if (!usedCards[i]) {
                if (currentIndex == targetIndex) {
                    // Convert index to card value and suit
                    uint8 value = uint8((i % 13) + 1);
                    uint8 suit = uint8((i / 13) + 1);
                    return Card(value, suit);
                }
                currentIndex++;
            }
        }
        
        revert("Card generation failed");
    }

    // Returns the blackjack value of a card
    function getCardValue(Card memory card) internal pure returns (uint8) {
        return card.value > 10 ? 10 : card.value;
    }

    function encodeCard(Card memory card) internal pure returns (uint8) {
        require(card.value >= 1 && card.value <= 13, "Invalid card value");
        require(card.suit >= 1 && card.suit <= 4, "Invalid card suit");
        return (card.suit - 1) * 13 + (card.value - 1) + 1;
    }

    // Calculates the total value of a hand, considering Aces as 1 or 11
    function calculateHandValue(Card[] memory hand) internal pure returns (uint8) {
        uint8 value = 0;
        uint8 aces = 0;

        for (uint8 i = 0; i < hand.length; i++) {
            uint8 cardValue = getCardValue(hand[i]);
            if (hand[i].value == 1) { // Ace
                aces++;
                value += 11;
            } else {
                value += cardValue;
            }
        }

        // Adjust for aces if value exceeds 21
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    // Helper function to get card index in the usedCards array
    function getCardIndex(Card memory card) internal pure returns (uint256) {
        require(card.value >= 1 && card.value <= 13, "Invalid card value");
        require(card.suit >= 1 && card.suit <= 4, "Invalid card suit");
        return ((card.suit - 1) * 13) + (card.value - 1);
    }
}