import type { Conditions, PageItem } from "./types";

export function conditionsMatch(conditions: Conditions, now = new Date()) {
  const rules = conditions?.rules ?? [];
  if (!rules.length) return true;

  const checks = rules.map((rule) => {
    switch (rule.field) {
      case "after":
        return now >= new Date(rule.value);
      case "before":
        return now <= new Date(rule.value);
      case "year":
        return now.getFullYear() === Number(rule.value);
      case "weekday":
        return rule.value.split(",").map(Number).includes(now.getDay());
      default:
        return false;
    }
  });

  return conditions.mode === "any" ? checks.some(Boolean) : checks.every(Boolean);
}

export function isFeatured(item: PageItem, now = new Date()) {
  if (!item.featured) return false;
  if (item.featuredStartAt && now < new Date(item.featuredStartAt)) return false;
  if (item.featuredEndAt && now > new Date(item.featuredEndAt)) return false;
  return true;
}
