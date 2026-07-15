export interface BudgetItem { name: string; cost: number }

export function allocatedTotal(items: readonly BudgetItem[], selected: ReadonlySet<string>): number {
  return items.filter((item) => selected.has(item.name)).reduce((sum, item) => sum + item.cost, 0);
}

export function benBudgetFix(selected: ReadonlySet<string>): Set<string> {
  const fixed = new Set(selected);
  fixed.delete('HOUSING');
  return fixed;
}
