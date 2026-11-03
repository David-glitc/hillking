// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {Hillking} from "../src/Hillking.sol";

contract HillkingTest is Test {
    address alice=address(0xA11CE);address bob=address(0xB0B);address carol=address(0xCA401);address treasury=address(0x7EA5);
    Hillking k;
    function setUp() public {k=new Hillking(0.01 ether,600,treasury);vm.deal(alice,10 ether);vm.deal(bob,10 ether);vm.deal(carol,10 ether);}
    function test_tollsPriceAndSettle() public {
        vm.prank(alice);k.claim{value:0.01 ether}("first!");
        (,Hillking.Round memory r)=k.current();assertEq(r.king,alice);assertEq(r.price,0.0102 ether);assertEq(r.pot,0.01 ether);
        vm.prank(bob);vm.expectRevert(bytes("send the crown price"));k.claim{value:0.01 ether}("");
        vm.prank(bob);k.claim{value:0.0102 ether}("bob rules");
        assertEq(k.credit(alice),0.00102 ether);
        vm.prank(bob);vm.expectRevert(bytes("you hold the hill"));k.claim{value:0.010404 ether}("");
        uint256 t=vm.getBlockTimestamp();vm.warp(t+599);
        vm.prank(carol);k.claim{value:0.010404 ether}("carol");
        vm.warp(t+599+600);
        vm.prank(alice);vm.expectRevert(bytes("bell rang: settle first"));k.claim{value:0.01061208 ether}("");
        (,r)=k.current();uint256 pot=r.pot;
        k.settle();
        assertEq(k.credit(carol),pot*7000/10000);assertEq(k.credit(treasury),pot-pot*7000/10000-pot*2500/10000);
        (uint256 id,Hillking.Round memory next)=k.current();assertEq(id,1);assertEq(next.pot,pot*2500/10000);assertEq(next.price,0.01 ether);
        assertEq(k.getRound(0).settled,true);assertEq(k.recentCrowns(0,2)[0].king,carol);assertEq(k.recentCrowns(0,10).length,3);
        vm.prank(carol);k.withdraw();assertEq(carol.balance,10 ether-0.010404 ether+pot*7000/10000);
        vm.expectRevert(bytes("round still running"));k.settle();
    }
    function test_emptyRoundWaitsForFirstClaim() public {
        vm.warp(vm.getBlockTimestamp()+30 days);vm.expectRevert(bytes("round still running"));k.settle();
        vm.prank(alice);vm.expectRevert(bytes("flag too long"));k.claim{value:0.01 ether}("0123456789012345678901234567890123456789012345678");
        vm.prank(alice);k.claim{value:0.01 ether}("");(,Hillking.Round memory r)=k.current();assertEq(r.deadline,vm.getBlockTimestamp()+600);
    }
}
