import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ethers } from 'ethers';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CoinFlip from './pages/CoinFlip';
import Blackjack from './pages/Blackjack';
import './styles/App.css';

import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';

const App = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        try {
          // Request account access if needed
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          // We use ethers.js to wrap the provider and get the signer
          const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(tempProvider);
          const tempSigner = tempProvider.getSigner();
          setSigner(tempSigner);
          const tempContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, tempSigner);
          setBlackjackContract(tempContract);
        } catch (error) {
          console.error('User denied account access', error);
        }
      } else {
        console.error('Please install MetaMask!');
      }
    };

    initWeb3();
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div className="dynamic-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/CoinFlip" element={<CoinFlip />} />
            <Route path="/blackjack" element={<Blackjack />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
