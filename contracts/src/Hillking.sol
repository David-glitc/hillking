// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice King of the Hill. Take the hill by paying the crown price; every claim resets the clock and raises the price 2%.
/// The dethroned king gets a 10% toll from the new claim. When the clock runs out, the king takes 70% of the pot, 25%
/// seeds the next round and 5% goes to the treasury. No randomness: the last claim before the bell wins.
contract Hillking is ReentrancyGuard {
    uint16 public constant STEP_BPS=200;
    uint16 public constant TOLL_BPS=1000;
    uint16 public constant PRIZE_BPS=7000;
    uint16 public constant CARRY_BPS=2500;
    uint256 public immutable basePrice;
    uint32 public immutable clock;
    address public immutable treasury;
    struct Round {uint256 pot; uint256 price; uint256 carried; address king; uint64 deadline; uint64 started; uint32 crowns; bool settled; uint256 prize;}
    struct Crown {address king; uint256 paid; uint64 time; string flag;}
    Round[] private rounds;
    mapping(uint256=>Crown[]) private crowns;
    mapping(address=>uint256) public credit;
    event Crowned(uint256 indexed round,address indexed king,uint256 paid,uint256 toll,uint64 deadline,string flag);
    event Settled(uint256 indexed round,address indexed king,uint256 prize,uint256 carried,uint256 fee);
    event Withdrawn(address indexed who,uint256 amount);

    constructor(uint256 basePrice_,uint32 clock_,address treasury_){
        require(basePrice_>0&&clock_>=60&&clock_<=1 days&&treasury_!=address(0),"bad config");
        basePrice=basePrice_;clock=clock_;treasury=treasury_;rounds.push(Round(0,basePrice_,0,address(0),0,0,0,false,0));
    }
    /// @notice Pay exactly the crown price to become king. `flag` is a short public banner (up to 48 bytes).
    function claim(string calldata flag) external payable nonReentrant {
        uint256 id=rounds.length-1;Round storage r=rounds[id];
        require(r.king==address(0)||block.timestamp<r.deadline,"bell rang: settle first");
        require(msg.sender!=r.king,"you hold the hill");require(msg.value==r.price,"send the crown price");require(bytes(flag).length<=48,"flag too long");
        uint256 toll=r.king==address(0)?0:msg.value*TOLL_BPS/10_000;
        if(toll>0)credit[r.king]+=toll;
        if(r.king==address(0))r.started=uint64(block.timestamp);
        r.pot+=msg.value-toll;r.king=msg.sender;r.deadline=uint64(block.timestamp+clock);r.crowns++;
        r.price=msg.value*(10_000+STEP_BPS)/10_000;
        crowns[id].push(Crown(msg.sender,msg.value,uint64(block.timestamp),flag));
        emit Crowned(id,msg.sender,msg.value,toll,r.deadline,flag);
    }
    /// @notice Anyone rings the bell after the clock runs out: pays the king, seeds the next round.
    function settle() external {
        uint256 id=rounds.length-1;Round storage r=rounds[id];
        require(r.king!=address(0)&&block.timestamp>=r.deadline,"round still running");
        uint256 prize=r.pot*PRIZE_BPS/10_000;uint256 carry=r.pot*CARRY_BPS/10_000;uint256 fee=r.pot-prize-carry;
        r.settled=true;r.prize=prize;credit[r.king]+=prize;credit[treasury]+=fee;
        rounds.push(Round(carry,basePrice,carry,address(0),0,0,0,false,0));
        emit Settled(id,r.king,prize,carry,fee);
    }
    function withdraw() external nonReentrant {
        uint256 n=credit[msg.sender];require(n>0,"nothing due");credit[msg.sender]=0;
        (bool ok,)=msg.sender.call{value:n}("");require(ok,"transfer failed");emit Withdrawn(msg.sender,n);
    }
    function roundCount() external view returns(uint256){return rounds.length;}
    function getRound(uint256 id) external view returns(Round memory){return rounds[id];}
    function current() external view returns(uint256 id,Round memory r){id=rounds.length-1;r=rounds[id];}
    function crownCount(uint256 id) external view returns(uint256){return crowns[id].length;}
    /// @return list the newest `n` crowns of a round, newest first.
    function recentCrowns(uint256 id,uint256 n) external view returns(Crown[] memory list){
        Crown[] storage c=crowns[id];if(n>c.length)n=c.length;list=new Crown[](n);
        for(uint256 i;i<n;i++)list[i]=c[c.length-1-i];
    }
}
