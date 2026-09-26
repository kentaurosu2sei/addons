import  * as server from "@minecraft/server"


export function breakBlock(Block: server.Block){
    const X = Block.location.x
    const Y = Block.location.y
    const Z = Block.location.z
    Block.dimension.runCommand(`setblock ${X} ${Y} ${Z} air destroy`)
}

export function ReplaceBlock(Block: server.Block, NewBlock: string){
    const X = Block.location.x
    const Y = Block.location.y
    const Z = Block.location.z
    Block.dimension.runCommand(`setblock ${X} ${Y} ${Z} ${NewBlock}`)
}

export function GetBelowBlock(entity: server.Entity){
    const X = Math.floor(entity.location.x)
    const Y = Math.floor(entity.location.y) - 1
    const Z = Math.floor(entity.location.z)
    const block = entity.dimension.getBlock({x:X,y:Y,z:Z})
    return block
}

export function GetBlockCurrentLocation(entity: server.Entity){
    const X = Math.floor(entity.location.x)
    const Y = Math.floor(entity.location.y)
    const Z = Math.floor(entity.location.z)
    const Location  = {x:X,y:Y,z:Z}
    const block = entity.dimension.getBlock(Location)
    return block
}

export function GetAboveBlock(entity: server.Entity){
    const X = Math.floor(entity.location.x)
    const Y = Math.floor(entity.location.y) + 2
    const Z = Math.floor(entity.location.z)
    const block = entity.dimension.getBlock({x:X,y:Y,z:Z})
    return block
}

export function GetBiome(entity: server.Entity){
    const X = Math.floor(entity.location.x)
    const Y = Math.floor(entity.location.y)
    const Z = Math.floor(entity.location.z)
    const biome = entity.dimension.getBiome({x:X,y:Y,z:Z})
    return biome
}

