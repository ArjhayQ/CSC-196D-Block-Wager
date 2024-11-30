import React, { useState, useEffect } from "react";
import Web3 from "web3";
import CoinFlipABI from "../abis/CoinFlip.json";

const CoinFlipPage = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [lobbies, setLobbies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newLobby, setNewLobby] = useState({ betAmount: "", choice: "" });

  const contractAddress = "CONTRACT_ADDRESS_HERE";

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const coinFlipContract = new web3Instance.eth.Contract(CoinFlipABI.abi, contractAddress);

        setWeb3(web3Instance);
        setAccount(accounts[0]);
        setContract(coinFlipContract);
      } else {
        alert("Please install MetaMask to use this feature!");
      }
    };

    initWeb3();
  }, []);

  const fetchLobbies = async () => {
    if (contract) {
      try {
        const lobbyCounter = await contract.methods.lobbyCounter().call();
        const fetchedLobbies = [];

        for (let i = 0; i < lobbyCounter; i++) {
          const lobby = await contract.methods.lobbies(i).call();
          if (lobby.status !== "Closed") {
            fetchedLobbies.push(lobby);
          }
        }

        setLobbies(fetchedLobbies);
      } catch (error) {
        console.error("Error fetching lobbies:", error);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLobbies();
    }, 500);

    return () => clearInterval(interval);
  }, [contract]);

  const createLobby = async () => {
    if (!newLobby.betAmount || !newLobby.choice) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      await contract.methods
        .createLobby(newLobby.choice)
        .send({ from: account, value: web3.utils.toWei(newLobby.betAmount, "ether") });

      fetchLobbies();
      setShowModal(false);
      setNewLobby({ betAmount: "", choice: "" });
    } catch (err) {
      console.error("Error creating lobby:", err);
    }
  };

  const joinLobby = async (lobbyId) => {
    try {
      const lobby = lobbies[lobbyId];
      await contract.methods
        .joinLobby(lobbyId)
        .send({ from: account, value: lobby.betAmount });
      fetchLobbies();
    } catch (err) {
      console.error("Error joining lobby:", err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Coin Flip Lobbies</h1>
      
      <button
        onClick={() => setShowModal(true)}
        className="w-full mb-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 
                   text-white font-bold py-4 px-6 rounded-lg transition-colors 
                   duration-200 ease-in-out flex items-center justify-center gap-2 shadow-md"
      >
        Create Lobby
      </button>
      
      <div className="space-y-4 bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Open Games</h2>
        {lobbies.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">No open games available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lobbies.map((lobby, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg shadow-sm p-4 border border-gray-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Host:</span>
                    <span className="text-gray-900 font-medium truncate" title={lobby.dealer}>
                      {lobby.dealer.slice(0, 6)}...{lobby.dealer.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bet Amount:</span>
                    <span className="text-gray-900 font-medium">
                      {web3?.utils.fromWei(lobby.betAmount, "ether")} ETH
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pick:</span>
                    <span className="text-gray-900 font-medium">{lobby.choice}</span>
                  </div>
                  <button
                    onClick={() => joinLobby(index)}
                    disabled={lobby.status !== "Open"}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 
                             text-white font-medium py-2 px-4 rounded transition-colors 
                             duration-200 ease-in-out shadow-sm"
                  >
                    {lobby.status === "Open" ? "Join Lobby" : "Lobby Closed"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
            <label className="block text-gray-700 mb-2">Bet Amount (ETH):</label>
            <input
              type="number"
              value={newLobby.betAmount}
              onChange={(e) => setNewLobby({ ...newLobby, betAmount: e.target.value })}
              className="w-full mb-4 p-2 border rounded"
            />
            <label className="block text-gray-700 mb-2">Choice:</label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="choice"
                  value="Heads"
                  onChange={(e) => setNewLobby({ ...newLobby, choice: e.target.value })}
                  className="form-radio"
                />
                Heads
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="choice"
                  value="Tails"
                  onChange={(e) => setNewLobby({ ...newLobby, choice: e.target.value })}
                  className="form-radio"
                />
                Tails
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={createLobby}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                Create
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinFlipPage;