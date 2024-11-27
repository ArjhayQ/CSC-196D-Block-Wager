const Blackjack = artifacts.require("Blackjack");

module.exports = async function(deployer) {
  // Set minimum bet to 0.01 ETH (in wei)
  const minBet = web3.utils.toWei('0.01', 'ether');
  
  // Set maximum bet to 10 ETH (in wei)
  const maxBet = web3.utils.toWei('10', 'ether');
  
  // Deploy the contract with constructor parameters
  await deployer.deploy(Blackjack, minBet, maxBet);
};