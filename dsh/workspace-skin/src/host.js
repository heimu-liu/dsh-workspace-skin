import { z } from 'zod';
import { initialCost, foldCost, costView } from './cost.js';
export const name='workspace-skin';
export const inject=['sessionProjections'];
const amounts={low:z.number().nonnegative(),high:z.number().nonnegative(),priced:z.number().int().nonnegative(),missing:z.number().int().nonnegative()};
export const costProjection={
  key:'workspaceSkinCost',stateVersion:1,
  stateSchema:z.object({...amounts,route:z.object({provider:z.string(),model:z.string()}).nullable(),started:z.number(),last:z.object({...amounts,turn:z.number(),step:z.number()}).nullable()}).strict(),
  init:initialCost,apply:foldCost,
  wire:{viewSchema:z.object({...amounts,priceFrom:z.number(),priceUntil:z.number()}).strict(),view:costView}
};
export async function apply(ctx){await ctx.sessionProjections.register(costProjection);}
