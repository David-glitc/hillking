import {parseEther} from 'viem';
export default {
 slug:'hillking',liveLabel:true,vercel:'hillkingbot',assets:['BOT'],name:'Hillking',repo:'hillking',contract:'Hillking',color:'#FFD400',eyebrow:'KING OF THE HILL',symbol:'♛',
 line:'Last claim before the bell takes the pot.',
 app:{title:'The hill',line:'Pay the crown price to take the hill. Every claim resets the clock; when it hits zero, the king takes 70% of the pot.',layout:'board'},
 description:'King of the Hill on BOT Chain. Each claim resets a 10-minute clock and pays the old king a 10% toll. When the bell rings, the king takes 70% of the pot.',
 abis:['Hillking'],
 contracts:['src/Hillking.sol'],tests:['test/Hillking.t.sol'],
 landing:{
  steps:[['Take the hill','Pay the crown price and plant a flag: a short public banner. The clock resets to 10 minutes.'],['Hold it','Every new claim costs 2% more and pays the dethroned king a 10% toll. The rest grows the pot.'],['Hear the bell','When the clock runs out, anyone rings the bell: the king takes 70%, 25% seeds the next round.']],
  features:[['No randomness','The winner is simply the last claim before the bell. Nothing depends on block hashes or an oracle.'],['Tolls soften the fall','Losing the hill is not a total loss: the next claim pays you 10% of its price.'],['Rolling pots','A quarter of every pot carries into the next round, so a new round never starts at zero.'],['Pull payouts','Winnings and tolls wait in the contract until you withdraw, so a payout can never block the game.']],
  faq:[['Is this gambling?','It is a game of timing with real BOT at stake. Play only with amounts you are happy to lose, and check your local rules.'],['Can validators affect it?','Block producers order transactions, so a claim in the final seconds can lose to one in the same block. Do not leave it to the last moment.'],['Where does the 5% go?','To the Hillking treasury, set when the contract is deployed. It cannot change.'],['What happens if nobody claims?','The round waits. The clock only starts with the first claim, and the carried pot sits safely in the contract.'],['Can the price be changed?','No. The base price, the clock and the splits are fixed in the contract.']],
 },
 async deploy({deploy,account}){await deploy('Hillking',[parseEther('0.01'),600,account.address]);},
 async fork({write,read,c,parseEther:pe=parseEther}){
  await write('Hillking','claim',['fork flag'],pe('0.01'));
  await c.request({method:'evm_increaseTime',params:[601]});await c.request({method:'evm_mine',params:[]});
  await write('Hillking','settle');await write('Hillking','withdraw');
  return {flow:'claim hill → wait for bell → settle → withdraw',rounds:String(await read('Hillking','roundCount'))};
 },
};
