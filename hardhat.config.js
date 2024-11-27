// hardhat.config.js

require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    ganache: {
      url: "http://127.0.0.1:7545", // Ganache RPC URL
      accounts: [
        "0xd728d924b91b3959d8867f709a785031ec73bd064bc726275011a7e148cf5abd", "0xf239afac3bdc8ef4d0b59975f00de525e0a391c61cc358c4bbd4b764828b899e", "0x0efd3ef9226bebc5a4a3120ebbf2089aceb0c4097d2f25dec378968f9b318258",
        "0xd2327b86d4e030d19206dc61ad927104bf2f32ca31d1a56b8990c492600279ce", "0x381ece7ca847414406ead1edf99a5d098d92acd17760cdbef00af296bb31eb79", "0x01943bb7e81ac46135a71b7f04dc99257df29295b9bf1a49288aa6426e237915",
        "0xd14d3c45f47274a4eebc18acf3f9f789a780d8d200eaa1e42a813d89d3803571","0x75eadcc0f0950c1ddd6d459ca5318cd3313d1ed508c42f4acab2421380c52c37", "0x8fe49f3aa06da6e234d6225398e33efa4c5c4b65763af405229350ad0fb0de73", 
        "0x554c5149c779f5fc8d99c2739ebe0615319361008bccf2a031bd9adffb2ee2a7",
      ]
    },
  },
};
