import * as server from "@minecraft/server"
import  * as Commands from "./customCommandList"
import { propertyIds,phaseOrder } from "./functions"
import * as Functions from "./functions"
import * as api from "./lbraryAPI"
import { config } from "./config"



server.system.beforeEvents.startup.subscribe(ev => {
    for(const [id,Enum] of Object.entries(Commands.customEnumList)){
        ev.customCommandRegistry.registerEnum(id,Enum)
    }
    for(const data of Object.values(Commands.customCommandList)){
        ev.customCommandRegistry.registerCommand(
            data.command,
            data.callback
        )
    }
    ev.blockComponentRegistry.registerCustomComponent("shot_surv:down_block",{
        onTick(arg0, arg1) {
            let loc = arg0.block.location
            let dim = arg0.dimension
            dim.setBlockType(loc,"minecraft:air")
        },
    })
})



server.system.afterEvents.scriptEventReceive.subscribe(ev => {
    const id = ev.id
    const message = ev.message
    //ワールド単位の処理(実行元を区別しない)
    switch(id){
        case"shot_surv:game_start":{
            const center = Functions.getCenter()
            const diameter = Functions.getSystemConfigValue("area_diameter")
            const dim = Functions.getGameDimension()
            if(!(center&&dim)){
                server.world.sendMessage("§cゲームの中心を設定してください。")
                return
            }
            let players = server.world.getPlayers()
            //チーム登録
            if(Functions.getAllActivePlayer().length < 2){
                server.world.sendMessage("§cゲームを開始するには2チーム以上必要です")
                return
            }
            let currentSet = new Set(((server.world.getDynamicProperty(propertyIds.activeTeamList) ?? "") as string).split("/").filter(Boolean))
            for(const player of players){
                let team = player.getDynamicProperty(propertyIds.playerTeam) as string
                if(team == "spectator") continue
                currentSet.add(team)
            }
            if(currentSet.size < 2){
                server.world.sendMessage("§cゲームを開始するには2チーム以上必要です")
                return
            }
            Functions.triggerPreparationDayPhase()
            for(const player of Functions.getAllActivePlayer()){
                api.activateInfoBoard(player)
                api.addDisplayInfo(player,"shot_surv:ammo")
                api.addDisplayInfo(player,"shot_surv:team")
                Functions.giveMenuItem(player)
            }
            
            //ランダムテレポート
            for(const Team of currentSet){
                players.filter(p => Functions.getTeam(p)==Team)[0].addTag("temporary_team_leader")
            }
            server.world.getDimension(dim).runCommand(`spreadplayers ${center.x} ${center.z} 70 ${diameter/2} @a[tag=temporary_team_leader]`)
            server.system.runTimeout(()=>{
                players = server.world.getPlayers()//タグが付与されたのでプレイヤー情報を更新
            for(const player of players.filter(p => p.hasTag("temporary_team_leader"))){
                let loc = player.location
                let teamMenbers = Functions.getTeamMenbers(Functions.getTeam(player) as string)
                for(const menber of teamMenbers){
                    menber.teleport(loc)
                }
                player.removeTag("temporary_team_leader")
            }
            },10)
            break
        }
    }
    let player = ev.sourceEntity as server.Player 
    if(!((player)&&(player.typeId === "minecraft:player"))) return
    switch(ev.id){
        case "shot_surv:define_center":{
            Functions.defineCenterPosition(player)
            break
        }
    }
})

server.world.beforeEvents.itemUse.subscribe(ev => {
    const player = ev.source
    const item = ev.itemStack
    if(player.hasTag(propertyIds.downTag)){
        ev.cancel = true
        return
    }
    if((item.typeId === "shot_surv:tnt") && (server.world.gameRules.tntExplodes === false)){
        ev.cancel
        return
    }
    if(item.getDynamicProperty(propertyIds.itemType) === config.item_type.rocket){
        Functions.rocketBooster(player)
    }
})
server.world.afterEvents.playerPlaceBlock.subscribe(ev =>{
    const player = ev.player
    const block = ev.block
    let loc ={
        x:block.location.x + 0.5,
        y:block.location.y,
        z:block.location.z + 0.5
    } as server.Vector3
    if(block.typeId === "shot_surv:tnt"){
        ev.dimension.setBlockType(loc,"minecraft:air")
        ev.dimension.spawnEntity("minecraft:tnt",loc)
    }
})

server.world.beforeEvents.playerBreakBlock.subscribe(ev => {
    const player = ev.player
    const item = ev.itemStack
    if(player.hasTag(propertyIds.downTag)){
        ev.cancel = true
        return
    }
})



server.world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
    const player = ev.player
    const item = ev.itemStack
    const block = ev.block
    if(player.hasTag(propertyIds.downTag)){
        ev.cancel = true
        return
    }
    if(item?.getDynamicProperty(propertyIds.itemType) === config.item_type.tnt){
        if(server.world.gameRules.tntExplodes === true){
            ev.cancel = true
            return
        }
    }
})

server.world.afterEvents.projectileHitBlock.subscribe(ev =>{
    const player = ev.source as server.Player
    if(!(player?.typeId === "minecraft:player")) return
})


server.world.afterEvents.itemUse.subscribe(ev => {
    const item = ev.itemStack
    const player = ev.source
    switch(item.getDynamicProperty(propertyIds.itemType)){
        case config.item_type.menu :{
            Functions.showMenuHome(player)
            break
        }
    }
})

server.world.afterEvents.itemStopUse.subscribe(ev =>{
    const item = ev.itemStack
    const player = ev.source
    if((item?.getDynamicProperty(propertyIds.itemType) === config.item_type.sniper)){
        Functions.onSpyglassUse(player)
    }
})

server.world.beforeEvents.entityHurt.subscribe(ev=>{
    let damage = ev.damage
    let player = ev.hurtEntity as server.Player
    let damager = ev.damageSource.damagingEntity
    if(damager?.hasTag(propertyIds.downTag)){
        ev.cancel = true
        return
    }
    let phase = Functions.getGamePhase()
    let HP = player.getComponent("minecraft:health")?.currentValue
    if(!phase) return 
    if(player.typeId === "minecraft:player") return
    if(!HP) return
    if(damage>=HP){
        if((phase === "preparationDay")||(phase === "preparationNight")){
            ev.cancel = true
            server.system.run(() =>{
                Functions.returnBasePoint(player)
            })
            return
        }
        if((phase === "fight")||(phase === "suddenDeath")){
            if(player.getComponent("minecraft:equippable")?.getEquipment(server.EquipmentSlot.Offhand)?.typeId === "minecraft:totem_of_undying"){
                ev.cancel = true
                return
            }
            if(!(player.getDynamicProperty(propertyIds.playerTeam) === "spectator")){
                ev.cancel = true
            }
            if(!player.hasTag(propertyIds.downTag)){
                if(ev.damageSource.damagingEntity?.typeId === "minecraft:player"){
                    server.system.run(() => {
                        if(!(damager)) return
                        player.setDynamicProperty(propertyIds.playerLastKilledBy,damager.nameTag)
                    })
                }
                server.system.run(() => {
                    Functions.playerDown(player)
                })
                
            }else{
                server.system.run(() => {
                    Functions.playerRetire(player)
                })
                
            }
        }
    }
    if(player.hasTag(propertyIds.protectionFallTag) && ev.damageSource.cause === server.EntityDamageCause.fall){
        ev.cancel = true
    }
})