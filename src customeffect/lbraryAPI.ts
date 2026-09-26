import * as server from "@minecraft/server"

const DynamicPropertyIds = {
    infoArray:"key:infoArray",//"key1/key2/key3/.."
    isActive:"infoBoard:isActive"
}

export function addDisplayInfo(player:server.Player,key:string){
    let infoKeys = ((player.getDynamicProperty(DynamicPropertyIds.infoArray) ?? "") as string).split("/").filter(Boolean)
    infoKeys.push(key)
    player.setDynamicProperty(DynamicPropertyIds.infoArray,infoKeys.join("/"))
}

export function removeDisplayInfo(player:server.Player,key:string){
    let infoKeys = ((player.getDynamicProperty(DynamicPropertyIds.infoArray) ?? "") as string).split("/").filter(Boolean)
    let index = (infoKeys).indexOf(key)
    if(index === -1) return
    infoKeys.splice(index,1)
    player.setDynamicProperty(DynamicPropertyIds.infoArray,infoKeys.join("/"))
}

export function activateInfoBoard(player:server.Player){
    player.setDynamicProperty(DynamicPropertyIds.isActive,true)
}

export function deactivateInfoBoard(player:server.Player){
    player.setDynamicProperty(DynamicPropertyIds.isActive,undefined)
}

export function applyCustomEffect(target:server.Entity | server.Player, effect: string, duration: number, amplifier?: number){
    target.runCommand("scriptevent customEffect:apply "+effect+","+JSON.stringify(duration)+","+JSON.stringify(amplifier ?? 0))
}