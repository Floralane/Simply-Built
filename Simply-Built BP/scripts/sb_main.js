import { world } from "@minecraft/server";

console.warn("§6Simply Built §7| §eLoaded!")

import 'blocks/large_table.js'

world.afterEvents.playerBreakBlock.subscribe(function(data){
    world.sendMessage("A player broke a block!");
})

