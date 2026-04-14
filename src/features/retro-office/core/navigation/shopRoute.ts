import { getItemBaseSize } from "@/features/retro-office/core/geometry";
import type {
  FacingPoint,
  FurnitureItem,
  ShopRoute,
} from "@/features/retro-office/core/types";

const GROCERY_ROOM_BOUNDS = {
  minX: 260,
  maxX: 438,
  minY: 40,
  maxY: 270,
};

export const SHOP_ENTRY_TARGET: FacingPoint = {
  x: 450,
  y: 150,
  facing: Math.PI,
};

export const SHOP_AISLE_TARGET: FacingPoint = {
  x: 360,
  y: 150,
  facing: Math.PI,
};

export const SHOP_TARGET: FacingPoint = {
  x: 360,
  y: 220,
  facing: Math.PI,
};

export const resolveShopRoute = (
  item: FurnitureItem | null | undefined,
  x: number,
  y: number,
): ShopRoute => {
  if (!item) {
    return {
      stage: "checkout",
      targetX: SHOP_TARGET.x,
      targetY: SHOP_TARGET.y,
      facing: SHOP_TARGET.facing,
    };
  }
  const { width, height } = getItemBaseSize(item);
  const checkoutTarget = {
    x: item.x + width / 2,
    y: item.y + height + 44,
    facing: 0,
  };
  const closeToCheckout =
    Math.hypot(x - checkoutTarget.x, y - checkoutTarget.y) < 44;
  if (closeToCheckout) {
    return {
      stage: "checkout",
      targetX: checkoutTarget.x,
      targetY: checkoutTarget.y,
      facing: checkoutTarget.facing,
    };
  }

  const closeToAisle = Math.hypot(x - SHOP_AISLE_TARGET.x, y - SHOP_AISLE_TARGET.y) < 80;
  if (closeToAisle) {
    return {
      stage: "checkout",
      targetX: checkoutTarget.x,
      targetY: checkoutTarget.y,
      facing: checkoutTarget.facing,
    };
  }

  const enteredStore =
    (x >= GROCERY_ROOM_BOUNDS.minX &&
      x <= GROCERY_ROOM_BOUNDS.maxX &&
      y >= GROCERY_ROOM_BOUNDS.minY &&
      y <= GROCERY_ROOM_BOUNDS.maxY) ||
    Math.hypot(x - SHOP_ENTRY_TARGET.x, y - SHOP_ENTRY_TARGET.y) < 80;
  if (enteredStore) {
    return {
      stage: "aisle",
      targetX: SHOP_AISLE_TARGET.x,
      targetY: SHOP_AISLE_TARGET.y,
      facing: SHOP_AISLE_TARGET.facing,
    };
  }

  return {
    stage: "entrance",
    targetX: SHOP_ENTRY_TARGET.x,
    targetY: SHOP_ENTRY_TARGET.y,
    facing: SHOP_ENTRY_TARGET.facing,
  };
};
