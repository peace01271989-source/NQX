import { MONETIZATION } from './config.js';
export function entitlements(state){
  const plan=state.monetization?.plan ?? MONETIZATION.free;
  return {
    plan,
    normalAds:plan===MONETIZATION.free,
    rewardAds:plan!==MONETIZATION.fullAdFree,
    instantReward:plan===MONETIZATION.fullAdFree,
    individual:plan===MONETIZATION.normalAdFree||plan===MONETIZATION.fullAdFree,
    generation:plan===MONETIZATION.fullAdFree,
    inheritance:plan===MONETIZATION.fullAdFree
  };
}
export function setPlan(state,plan){
  if(!Object.values(MONETIZATION).includes(plan) && ![MONETIZATION.free,MONETIZATION.normalAdFree,MONETIZATION.fullAdFree].includes(plan)) throw new Error('invalid plan');
  state.monetization={plan,purchasedAt:plan===MONETIZATION.free?null:Date.now()};return entitlements(state);
}
export function purchaseLabel(state){
  const p=state.monetization?.plan??MONETIZATION.free;
  if(p===MONETIZATION.fullAdFree)return '全広告解除済み';
  if(p===MONETIZATION.normalAdFree)return '通常広告解除済み / +¥250で全解除';
  return 'FREE';
}
