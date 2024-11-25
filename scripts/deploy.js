// scripts/deploy.js

const hre = require("hardhat");

async function main() {
  const BlackJack = await hre.ethers.getContractFactory("BlackJack");
  const blackjack = await BlackJack.deploy();

  await blackjack.deployed();

  console.log("BlackJack deployed to:", blackjack.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in deployment:", error);
    process.exit(1);
  });
