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
    priority?:number
}

export const infoList:Record<string,infoData> = {}

export function registerInfo(key:string,data:infoData){
    infoList[key] = {
        name:data.name,
        propertyId:data.propertyId,
        function:data.function,
        source:data.source,
        priority:data.priority ?? 0
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
    source:"Player",
    priority:100
})

registerInfo("shot_surv:ammo",{
    name:"残弾",
    propertyId:"shot_surv:ammo",
    function:(value:string|number|boolean|server.Vector3|undefined)=> {
        if(!(typeof value == "number")) return undefined
        return value.toString()
    },
    source:"Player",
    priority:5
})//"shot_surv:ammo"

registerInfo("shot_surv:team",{
    name:"所属",
    propertyId:"shot_surv:team",
    function:(value:string|number|boolean|server.Vector3|undefined)=> {
        if(!((typeof value == "string")&&(["red","blue","yellow","green","white","black"].includes(value)))) return undefined
        switch(value){
            case "red":
                return "赤チーム"
            case "blue":
                return "青チーム"
            case "yellow":
                return "黄チーム"
            case "green":
                return "緑チーム"
            case "white":
                return "白チーム"
            case "black":
                return "黒チーム"
            default:
                return undefined
        }
    },
    source:"Player",
    priority:6
})


registerInfo("phase_timer:preparationDay",{
    name:"準備-昼",
    propertyId:"phase_timer:preparationDay",
    function:(value:string|number|boolean|server.Vector3|undefined) => {
        if(!((typeof value == "number")&&(value >= 0))) return undefined
        return value.toString()
    },
    source:"World",
    priority:10

})

registerInfo("phase_timer:preparationNight",{
    name:"準備-夜",
    propertyId:"phase_timer:preparationNight",
    function:(value:string|number|boolean|server.Vector3|undefined) => {
        if(!((typeof value == "number")&&(value >= 0))) return undefined
        return value.toString()
    },
    source:"World",
    priority:10
})

registerInfo("phase_timer:fight",{
    name:"戦闘",
    propertyId:"phase_timer:fight",
    function:(value:string|number|boolean|server.Vector3|undefined) => {
        if(!((typeof value == "number")&&(value >= 0))) return undefined
        return value.toString()
    },
    source:"World",
    priority:10
})

registerInfo("phase_timer:suddenDeath",{
    name:"サドンデス",
    propertyId:"phase_timer:suddenDeath",
    function:(value:string|number|boolean|server.Vector3|undefined) => {
        if(!((typeof value == "number")&&(value >= 0))) return undefined
        return value.toString()
    },
    source:"World",
    priority:10
})

export function showInfoBoard(player:server.Player){
    player.setDynamicProperty(DynamicPropertyIds.isActive,true)
}
server.system.runInterval(() => {
    for(const player of server.world.getPlayers()){
        if(!(player.getDynamicProperty(DynamicPropertyIds.isActive))) continue
            let data:string[] = []
            let infoKeys = ((player.getDynamicProperty(DynamicPropertyIds.infoArray) ?? "") as string).split("/").filter(Boolean)
            let orderedKeys = infoKeys
                .map((key, index) => ({ key, index, info: getPanelInfo(key) }))
                .filter((entry) => !!entry.info)
                .sort((a, b) => {
                    const priorityDiff = (a.info!.priority ?? 0) - (b.info!.priority ?? 0)
                    if(priorityDiff !== 0) return priorityDiff
                    return a.index - b.index
                })
                .map((entry) => entry.key)

            for(const key of orderedKeys){
                let Info = getPanelInfo(key)
                if(!(Info)){
                    removeDisplayInfo(player,key)
                    continue;
                }
                let pushData = null
                let toData: string | undefined;
                if(Info.source == "Player"){
                    toData = Info.function(player.getDynamicProperty(Info.propertyId));
                }
                if(Info.source == "World"){
                    toData = Info.function(server.world.getDynamicProperty(Info.propertyId));
                }

                if(toData === ""){
                    continue;
                }
                if(toData === undefined){
                    removeDisplayInfo(player, key);
                    continue;
                }

                pushData = ("§r" + Info.name + ":" + toData);
                data.push(pushData);
            }
            player.onScreenDisplay.setActionBar(data.join(" "))
        
    }
},2)

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
                case "infoboard:active":{
                    showInfoBoard(player)
                }
                case "infoboard:deactive":{
                    player.setDynamicProperty(DynamicPropertyIds.isActive)
                }
            }
            break
        }
    }
})