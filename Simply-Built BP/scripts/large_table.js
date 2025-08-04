import { world, BlockPermutation, system } from "@minecraft/server";

// Offsets and block identifiers for table parts
const TABLE_PARTS = [
  { dx: -1, dz: -1, name: "sb:large_table_nw" },
  { dx:  0, dz: -1, name: "sb:large_table_north" },
  { dx:  1, dz: -1, name: "sb:large_table_ne" },
  { dx: -1, dz:  0, name: "sb:large_table_west" },
  { dx:  1, dz:  0, name: "sb:large_table_east" },
  { dx: -1, dz:  1, name: "sb:large_table_sw" },
  { dx:  0, dz:  1, name: "sb:large_table_south" },
  { dx:  1, dz:  1, name: "sb:large_table_se" },
];

// Used to track placed table centers
const placedTableCenters = new Map();

function posKey(pos) {
  return `${pos.x},${pos.y},${pos.z}`;
}

function placeTable(centerBlock) {
  const dim = centerBlock.dimension;
  const { x, y, z } = centerBlock.location;

  const centerPosKey = posKey(centerBlock.location);
  placedTableCenters.set(centerPosKey, true);

  for (const part of TABLE_PARTS) {
    const pos = { x: x + part.dx, y, z: z + part.dz };
    const block = dim.getBlock(pos);
    if (!block) continue;
    block.setPermutation(BlockPermutation.resolve(part.name));
  }
}

function breakTable(centerPos) {
  const dim = world.getDimension("overworld");
  const { x, y, z } = centerPos;

  // Remove all parts and center
  for (const part of TABLE_PARTS.concat([{ dx: 0, dz: 0 }])) {
    const pos = { x: x + part.dx, y, z: z + part.dz };
    const block = dim.getBlock(pos);
    if (!block) continue;
    block.setPermutation(BlockPermutation.resolve("minecraft:air"));
  }

  // Drop the main table item
  dim.spawnItem("sb:large_oak_table", { x: x + 0.5, y: y + 1, z: z + 0.5 });
}

function findTableCenter(pos) {
  // Search nearby for a center
  for (const part of TABLE_PARTS.concat([{ dx: 0, dz: 0 }])) {
    const check = {
      x: pos.x + part.dx,
      y: pos.y,
      z: pos.z + part.dz
    };
    const key = posKey(check);
    if (placedTableCenters.has(key)) return check;
  }
  return null;
}

world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("sb:large_table_handler", {
    onPlace: ({ block }) => {
      placeTable(block);
    },
    onPlayerDestroy: ({ block }) => {
      const center = findTableCenter(block.location);
      if (center) {
        placedTableCenters.delete(posKey(center));
        breakTable(center);
      }
    }
  });
});
