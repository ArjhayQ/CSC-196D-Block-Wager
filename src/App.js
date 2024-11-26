import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CoinFlip from './pages/CoinFlip';
// import Blackjack from './pages/Blackjack';
import './styles/App.css';

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div className="dynamic-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/CoinFlip" element={<CoinFlip />} />
            {/* <Route path="/blackjack" element={<Blackjack />} /> */}
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;