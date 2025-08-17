import { world, BlockPermutation, ItemStack } from "@minecraft/server";

// 3x3 grid parts relative to center
const tableParts = [
  { offset: [ 0, 0,  0], state: "center" },
  { offset: [ 0, 0, -1], state: "north"  },
  { offset: [ 0, 0,  1], state: "south"  },
  { offset: [-1, 0,  0], state: "west"   },
  { offset: [ 1, 0,  0], state: "east"   },
  { offset: [-1, 0, -1], state: "nw"     },
  { offset: [ 1, 0, -1], state: "ne"     },
  { offset: [-1, 0,  1], state: "sw"     },
  { offset: [ 1, 0,  1], state: "se"     },
];

function isTableBlock(block) {
  return block?.typeId?.startsWith("sb:large_table");
}

function getTableWoodType(block) {
  // Returns the block id, e.g. sb:large_table_oak
  return block?.typeId;
}

function updateConnections(block) {
  if (!isTableBlock(block)) return;

  const dim = block.dimension;
  const north = dim.getBlock({ x: block.location.x, y: block.location.y, z: block.location.z - 1 });
  const east  = dim.getBlock({ x: block.location.x + 1, y: block.location.y, z: block.location.z });
  const south = dim.getBlock({ x: block.location.x, y: block.location.y, z: block.location.z + 1 });
  const west  = dim.getBlock({ x: block.location.x - 1, y: block.location.y, z: block.location.z });

  try {
    block.setPermutation(block.permutation.withState('sb:north_connection', isTableBlock(north) ? 1 : 0));
    block.setPermutation(block.permutation.withState('sb:south_connection', isTableBlock(south) ? 1 : 0));
    block.setPermutation(block.permutation.withState('sb:east_connection',  isTableBlock(east)  ? 1 : 0));
    block.setPermutation(block.permutation.withState('sb:west_connection',  isTableBlock(west)  ? 1 : 0));
  } catch (e) {}
}

world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("sb:table_function", {

    onPlace: (e) => {
      const center = e.block;
      const placedPart = center.permutation.getState("sb:table_part");
      if (placedPart !== "center") return;

      const dim = center.dimension;
      const { x, y, z } = center.location;
      const centerDir = center.permutation.getState("minecraft:cardinal_direction");
      const woodType = getTableWoodType(center);

      for (const p of tableParts) {
        const [dx, dy, dz] = p.offset;
        const pos = { x: x + dx, y: y + dy, z: z + dz };
        const target = dim.getBlock(pos);
        if (!target || target.typeId !== "minecraft:air") continue;

        const states = { "sb:table_part": p.state };
        if (centerDir !== undefined) states["minecraft:cardinal_direction"] = centerDir;

        target.setPermutation(BlockPermutation.resolve(woodType, states));
      }

      // Update connections for this table and neighbors
      for (const p of tableParts) {
        const [dx, dy, dz] = p.offset;
        const partBlock = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
        updateConnections(partBlock);
      }
      for (const neighbor of [center.north(), center.east(), center.south(), center.west()]) {
        updateConnections(neighbor);
      }
    },

    onPlayerDestroy: (e) => {
      const destroyed = e.block;
      const dim = destroyed.dimension;
      const { x, y, z } = destroyed.location;

      // Find the true center within 3x3 around the broken piece
      let centerPos = null;
      let centerWoodType = null;

      for (let dx = -1; dx <= 1 && !centerPos; dx++) {
        for (let dz = -1; dz <= 1 && !centerPos; dz++) {
          const checkPos = { x: x + dx, y, z: z + dz };
          const b = dim.getBlock(checkPos);
          if (isTableBlock(b) && b.permutation.getState("sb:table_part") === "center") {
            centerPos = checkPos;
            centerWoodType = getTableWoodType(b);
          }
        }
      }

      if (!centerPos) {
        destroyed.setType("minecraft:air");
        return;
      }

      // Destroy all 9 parts
      for (const p of tableParts) {
        const [px, py, pz] = p.offset;
        const partPos = { x: centerPos.x + px, y: centerPos.y + py, z: centerPos.z + pz };
        const partBlock = dim.getBlock(partPos);
        if (partBlock?.typeId === centerWoodType) {
          partBlock.setType("minecraft:air");
        }
      }

      // Update connections for neighbors
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const neighbor = dim.getBlock({ x: centerPos.x + dx, y: centerPos.y, z: centerPos.z + dz });
          updateConnections(neighbor);
        }
      }
      for (const neighbor of [destroyed.north(), destroyed.east(), destroyed.south(), destroyed.west()]) {
        updateConnections(neighbor);
      }
    }

  });
});
