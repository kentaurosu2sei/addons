import * as server from "@minecraft/server"

const DynamicPropertyIds = {
    infoArray:"key:infoArray",//"key1/key2/key3/.."
    isActive:"infoBoard:isActive"
}

export interface infoData{
    name:string,
    propertyId:string,
    function:(value:string|number|boolean|server.Vector3|undefined) => string|undefined
    source:"World"|"Player"
}

export const infoList:Record<string,infoData> = {}

export function registerInfo(key:string,data:infoData){
    infoList[key] = {
        name:data.name,
        propertyId:data.propertyId,
        function:data.function,
        source:data.source
    }
}

export function getPanelInfo(key:string){
    return infoList[key]
}

registerInfo("test:test",{
    name:"テストだよ！",
    propertyId:"test:info",
    function:(value:string|number|boolean|server.Vector3|undefined)=> {
        if(value){
            let testvalue = value as string
            return testvalue
        }else{
            return undefined
        }
    },
    source:"Player"
    
})



    server.system.runInterval(() => {
        for(const player of server.world.getAllPlayers()){
            let data = []
            let infoKeys = ((player.getDynamicProperty(DynamicPropertyIds.infoArray) ?? "") as string).split("/")
            for(const key of infoKeys){
                let Info = getPanelInfo(key)
                if(!(Info)){
                    removeDisplayInfo(player,key)
                    continue;
                }
                let pushData = null
                if(Info.source == "Player"){
                    let toData = Info.function(player.getDynamicProperty(Info.propertyId))
                    if(toData){
                        pushData = (Info.name+":"+toData)
                    }else{
                        removeDisplayInfo(player,key)
                        continue
                    }
                }
                if(Info.source == "World"){
                    let toData = Info.function(server.world.getDynamicProperty(Info.propertyId))
                    if(toData){
                        pushData = (Info.name+":"+toData)
                    }else{
                        removeDisplayInfo(player,key)
                        continue
                    }
                }if(pushData){
                    data.push(pushData)
                }else{
                    continue
                }
            }
            player.onScreenDisplay.setActionBar(data.join(" "))
        }
    },10)

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

server.system.afterEvents.scriptEventReceive.subscribe(ev => {
    switch(ev.sourceType){
        case server.ScriptEventSource.Entity:{
            if(ev.sourceEntity?.typeId != "minecraft:player") return
            let player = ev.sourceEntity as server.Player
            switch(ev.id){
                case "infoboard:add":{
                    addDisplayInfo(player,ev.message)
                    player.sendMessage(`表示スロットに${ev.message}を追加しました。`)
                    break
                }
                case "infoboad:remove":{
                    removeDisplayInfo(player,ev.message)
                    player.sendMessage(`表示スロットから${ev.message}を削除しました。`)
                }
                case "infoboard:test":{
                    player.setDynamicProperty("test:info","TESTING")
                }
            }
            break
        }
    }
})