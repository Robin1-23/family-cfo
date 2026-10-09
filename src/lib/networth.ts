import { ITEM_GROUP, ITEM_TYPE_LABELS } from './items';
import type { Item, ItemType } from './types';

export interface NetWorthLine {
  type: ItemType;
  label: string;
  amount: number;
}

export interface NetWorth {
  assets: number;
  liabilities: number;
  net: number;
  /** Asset classes, biggest first. */
  byClass: NetWorthLine[];
  loans: NetWorthLine[];
  byMember: { memberId: string; assets: number; liabilities: number; net: number }[];
}

/**
 * Household balance sheet from confirmed items: savings and assets minus loans.
 * Insurance cover is not wealth, so it is left out.
 */
export function netWorth(items: Pick<Item, 'memberId' | 'type' | 'amount'>[]): NetWorth {
  const counted = items.filter((i) => i.amount != null && (ITEM_GROUP[i.type] === 'asset' || ITEM_GROUP[i.type] === 'loan'));
  const sumBy = (pick: (i: (typeof counted)[number]) => boolean) => counted.filter(pick).reduce((n, i) => n + i.amount!, 0);
  const lines = (group: 'asset' | 'loan') => {
    const totals = new Map<ItemType, number>();
    for (const i of counted) if (ITEM_GROUP[i.type] === group) totals.set(i.type, (totals.get(i.type) ?? 0) + i.amount!);
    return [...totals].map(([type, amount]) => ({ type, label: ITEM_TYPE_LABELS[type], amount })).sort((a, b) => b.amount - a.amount);
  };
  const assets = sumBy((i) => ITEM_GROUP[i.type] === 'asset');
  const liabilities = sumBy((i) => ITEM_GROUP[i.type] === 'loan');
  const memberIds = [...new Set(counted.map((i) => i.memberId))];
  return {
    assets,
    liabilities,
    net: assets - liabilities,
    byClass: lines('asset'),
    loans: lines('loan'),
    byMember: memberIds
      .map((memberId) => {
        const a = sumBy((i) => i.memberId === memberId && ITEM_GROUP[i.type] === 'asset');
        const l = sumBy((i) => i.memberId === memberId && ITEM_GROUP[i.type] === 'loan');
        return { memberId, assets: a, liabilities: l, net: a - l };
      })
      .sort((x, y) => y.net - x.net),
  };
}
