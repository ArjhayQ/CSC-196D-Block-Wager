import React, { useState, useEffect } from "react";
import Web3 from "web3";
import CoinFlipABI from "../abis/CoinFlip.json";
import "../styles/CoinFlip.css";

const CoinFlipPage = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [lobbies, setLobbies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newLobby, setNewLobby] = useState({ betAmount: "", choice: "" });

  const contractAddress = "0x805010A7D9Ea3816b1C848229d7a11d5e0bE38AA";

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
          fetchedLobbies.push(lobby);
        }

        console.log("Fetched Lobbies:", fetchedLobbies);
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
      const tx = await contract.methods
        .createLobby(newLobby.choice)
        .send({ from: account, value: web3.utils.toWei(newLobby.betAmount, "ether") });

      console.log("Transaction Receipt:", tx);
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
    <div className="coinflip-page">
      <h1>Coin Flip Lobbies</h1>
      <div className="sub-header">
        <button className="create-button" onClick={() => setShowModal(true)}>
          Create Lobby
        </button>
      </div>
      <div className="lobby-list">
        {lobbies.map((lobby, index) => (
          <div key={index} className="lobby-item">
            <p><strong>Host:</strong> {lobby.host}</p>
            <p><strong>Bet Amount:</strong> {web3.utils.fromWei(lobby.betAmount, "ether")} ETH</p>
            <p><strong>Pick:</strong> {lobby.choice}</p>
            <p><strong>Status:</strong> {lobby.status}</p>

            {lobby.status === "Open" && (
              <button className="join-button" onClick={() => joinLobby(index)}>
                Join
              </button>
            )}

            {lobby.status === "Flipping" && (
              <p className="flipping-text">Flipping in progress...</p>
            )}

            {lobby.status === "Ended" && (
              <p className="result-text">Result: {lobby.result}</p>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create Lobby</h2>
            <label>Bet Amount (ETH):</label>
            <input
              type="number"
              value={newLobby.betAmount}
              onChange={(e) => setNewLobby({ ...newLobby, betAmount: e.target.value })}
            />
            <div>
              <label>
                <input
                  type="radio"
                  name="choice"
                  value="Heads"
                  onChange={(e) => setNewLobby({ ...newLobby, choice: e.target.value })}
                />
                Heads
              </label>
              <label>
                <input
                  type="radio"
                  name="choice"
                  value="Tails"
                  onChange={(e) => setNewLobby({ ...newLobby, choice: e.target.value })}
                />
                Tails
              </label>
            </div>
            <button onClick={createLobby} className="modal-create-button">
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinFlipPage;