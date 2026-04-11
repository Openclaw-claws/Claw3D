import { getItemBaseSize } from "@/features/retro-office/core/geometry";
import type {
  FacingPoint,
  FurnitureItem,
  ShopRoute,
} from "@/features/retro-office/core/types";

export const SHOP_TARGET: FacingPoint = {
  x: 280,
  y: 840,
  facing: 0,
};

export const resolveShopRoute = (
  item: FurnitureItem | null | undefined,
  x: number,
  y: number,
): ShopRoute => {
  if (!item) {
    return {
      stage: "counter",
      targetX: SHOP_TARGET.x,
      targetY: SHOP_TARGET.y,
      facing: SHOP_TARGET.facing,
    };
  }
  const { width, height } = getItemBaseSize(item);
  const centerY = item.y + height / 2;
  const approachTarget = {
    x: item.x + width / 2,
    y: item.y + height + 50,
    facing: 0,
  };
  const counterTarget = {
    x: item.x + width / 2,
    y: centerY,
    facing: 0,
  };

  const atCounter =
    y <= approachTarget.y + 6 || Math.hypot(x - approachTarget.x, y - approachTarget.y) < 18;
  if (atCounter) {
    return {
      stage: "counter",
      targetX: counterTarget.x,
      targetY: counterTarget.y,
      facing: counterTarget.facing,
    };
  }

  return {
    stage: "approach",
    targetX: approachTarget.x,
    targetY: approachTarget.y,
    facing: approachTarget.facing,
  };
};
