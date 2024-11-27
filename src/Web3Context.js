import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BlackjackABI from './abis/Blackjack.json';

// For development - you can use your deployed contract address
const BLACKJACK_ADDRESS = "0x80dD1e87c9000f01FEce632CA0C47F41FD6FbB91";

const Web3Context = createContext(null);

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkId, setNetworkId] = useState(null);

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      
      // Get network ID
      const network = await provider.getNetwork();
      setNetworkId(network.chainId);



      const contract = new ethers.Contract(
        BLACKJACK_ADDRESS,
        BlackjackABI.abi,
        signer
      );

      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      setAccount(account);
      setError(null);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User has disconnected their wallet
          setAccount(null);
          toast.warn('Wallet disconnected');
        } else {
          setAccount(accounts[0]);
          toast.success('Account changed');
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      });

    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Try to connect on component mount
  useEffect(() => {
    connectWallet();

    return () => {
      // Cleanup listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Helper function to check if we're on the right network
  const checkNetwork = async () => {
    if (!window.ethereum) return false;
    
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const desiredNetwork = process.env.REACT_APP_NETWORK_ID || '0x539'; // Default to Ganache (1337)
    
    if (chainId !== desiredNetwork) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: desiredNetwork }],
        });
        return true;
      } catch (error) {
        console.error('Failed to switch network:', error);
        return false;
      }
    }
    return true;
  };

  const value = {
    provider,
    signer,
    contract,
    account,
    isLoading,
    error,
    networkId,
    connectWallet,
    checkNetwork
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
      <ToastContainer position="top-right" autoClose={5000} />
    </Web3Context.Provider>
  );
};