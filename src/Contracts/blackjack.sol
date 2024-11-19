// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BlackJack {
    address payable public gameHost;
    address payable public user;

    uint public currentPot;
    uint public minPullOut;
    uint public maxBet;
    uint public minBet;

    mapping(address => uint) playerReturns;
    bool ended;

    constructor(address payable hostAddress, uint potInvestment, uint minimumPullOut, uint maximumBet, uint minimumBet) {
        gameHost = hostAddress;
        currentPot = potInvestment;
        maxBet = maximumBet;
        minBet = minimumBet;
        minPullOut = minimumPullOut;
    }
}

