export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Replace with your contract address


export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "Player",
        "type": "address"
      }
    ],
    "name": "AfterValueTransferEvent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "GameId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "Player",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "Amount",
        "type": "uint256"
      }
    ],
    "name": "BeforeValueTransferEvent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "GameId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "Player",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "Amount",
        "type": "uint256"
      }
    ],
    "name": "CashOutEvent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "GameId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "Player",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "Amount",
        "type": "uint256"
      }
    ],
    "name": "StartNewGameEvent",
    "type": "event"
  },
  {
    "stateMutability": "nonpayable",
    "type": "fallback"
  },
  {
    "inputs": [],
    "name": "CashOut",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DoubleDown",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "GetGame",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "Id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "Player",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "SafeBalance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "OriginalBalance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "SplitCounter",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "GamesPlayed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "PlayerBet",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "InsuranceBet",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "PlayerCard1",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "PlayerCard2",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "PlayerNewCard",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "PlayerCardTotal",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "PlayerSplitTotal",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "DealerCard1",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "DealerCard2",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "DealerNewCard",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "DealerCardTotal",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "CanDoubleDown",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "CanInsure",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "CanSplit",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "IsSplitting",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "IsSoftHand",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "IsRoundInProgress",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "DealerMsg",
            "type": "string"
          }
        ],
        "internalType": "struct BlackJack.Game",
        "name": "game",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "Hit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "Insurance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "bet",
        "type": "uint256"
      }
    ],
    "name": "PlaceBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ShowTable",
    "outputs": [
      {
        "internalType": "string",
        "name": "DealerMessage",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "PlayerCard1",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "PlayerCard2",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "PlayerNewCard",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "PlayerCardTotal",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "PlayerSplitTotal",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "DealerCard1",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "DealerCard2",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "DealerNewCard",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "DealerCardTotal",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "PlayerBet",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "Pot",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "Split",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "Stand",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "StartNewGame",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];