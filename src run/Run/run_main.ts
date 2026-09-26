import * as server from "@minecraft/server"
import {ModalFormBuilder} from "../library/ModalFormBuilder"
import * as skill from "./SkillMetaData"
import {Config} from "./Paramaters"
import * as Functions from "./runFunctions"
import {worldBorder} from "../library/WorldBorder"
import "../library/infoboard"

/* 

gameMode = {
   ready:0       準備中のステータス
   scpectator:1  観戦中のステータス　
   chaser:2　　  チェイサーのステータス 
   runner:3　　　ランナーのステータス
   test:4　　　　 テストプレイ用のステータス
}

*/

worldBorder.playerLeaveBorderEvent.subscribe(ev => {
    if(Functions.getGameMode(ev.player)??0 > 1){
        ev.player.teleport(Functions.getCenter3D() ?? {x:0,y:0,z:0})
        ev.player.applyDamage(5)
    }
})

function registerRunInterval(){
    const interval = server.system.runInterval(()=>{
        if(!(Functions.isActive())){
            server.system.clearRun(interval)
        }
        for(const player of server.world.getPlayers()){
            if(player.getDynamicProperty("run:gameMode")){
                const gameMode = player.getDynamicProperty(Functions.DynamicPropertyIds.gameMode) as number
                if(gameMode == 1){
                    if(!(player.getGameMode() == server.GameMode.Spectator)){
                        player.setGameMode(server.GameMode.Spectator)
                        player.runCommand("effect @s night_vision 30 1 true")
                    }
                }else{
                    if(!(player.getGameMode() == server.GameMode.Adventure)){
                        player.setGameMode(server.GameMode.Adventure)
                    }
                    if(gameMode == 2){
                        let Skill = Config.chaserSkills
                        let chaseSkills = []
                        for(let i=1;i>4;i++){
                            chaseSkills.push(player.getDynamicProperty(`Srun:chaserSkill${i}`) as string)
                        }
                        if(chaseSkills.includes("echo")){
                            if((server.system.currentTick % Skill.echo.tick === 0) && player.isOnGround){
                                const runners = player.dimension.getPlayers({location:player.location,maxDistance:Skill.echo.radius,minDistance:2})
                                if(runners.length === 0) return
                                for(const runner of runners){
                                    if(runner.isSprinting && (runner.getDynamicProperty(Functions.DynamicPropertyIds.gameMode) as number) == 3){
                                        player.spawnParticle("run:echo",runner.location)
                                    }
                                }
                            }
                        }
                    }
                    if(gameMode == 3){

                    }
                }
            }
        }
        //１秒ごとにタイマーを一進められるよう、１tick毎に0.05タイマーを進める処理を行う
        server.world.setDynamicProperty("run:event_timer",((server.world.getDynamicProperty("run:event_timer") ?? Config.gamebase.eventInterval) as number) -0.05)
    },1)
}


async function show_skill_panel(player:server.Player){
    const result = await new ModalFormBuilder()
        .title("スキル選択フォーム")
        .dropdown(`Srun:chaserSkill1`,`チェイサースキル1`,Object.keys(skill.chaserSkills),{defaultValueIndex:(Object.keys(skill.chaserSkills).indexOf(((player.getDynamicProperty(`Srun:chaserSkill1`) ?? "anger") as string)))})
        .dropdown(`Srun:chaserSkill2`,`チェイサースキル2`,Object.keys(skill.chaserSkills),{defaultValueIndex:(Object.keys(skill.chaserSkills).indexOf(((player.getDynamicProperty(`Srun:chaserSkill2`) ?? "anger") as string)))})
        .dropdown(`Srun:chaserSkill3`,`チェイサースキル3`,Object.keys(skill.chaserSkills),{defaultValueIndex:(Object.keys(skill.chaserSkills).indexOf(((player.getDynamicProperty(`Srun:chaserSkill3`) ?? "anger") as string)))})
        .divider()
        .dropdown(`Srun:runnerSkill1`,`ランナースキル1`,Object.keys(skill.runnerSkills),{defaultValueIndex:Object.keys(skill.runnerSkills).indexOf(((player.getDynamicProperty(`Srun:runnerSkill1`) ?? "flash") as string))})
        .dropdown(`Srun:runnerSkill2`,`ランナースキル2`,Object.keys(skill.runnerSkills),{defaultValueIndex:Object.keys(skill.runnerSkills).indexOf(((player.getDynamicProperty(`Srun:runnerSkill2`) ?? "flash") as string))})
        .show(player)
        if(result.canceled) return
        try{
            player.setDynamicProperty(`Srun:chaserSkill1`,result.get(`Srun:chaserSkill1`))
            player.sendMessage(`§a[チェイサースキル1:${result.get("Srun:chaserSkill1")}]`)
            player.setDynamicProperty(`Srun:chaserSkill2`,result.get(`Srun:chaserSkill2`))
            player.sendMessage(`§a[チェイサースキル2:${result.get("Srun:chaserSkill2")}]`)
            player.setDynamicProperty(`Srun:chaserSkill3`,result.get(`Srun:chaserSkill3`))
            player.sendMessage(`§a[チェイサースキル3:${result.get("Srun:chaserSkill3")}]`)
            player.setDynamicProperty(`Srun:runnerSkill1`,result.get(`Srun:runnerSkill1`))
            player.sendMessage(`§a[ランナースキル1:${result.get("Srun:runnerSkill1")}]`)
            player.setDynamicProperty(`Srun:runnerSkill2`,result.get(`Srun:runnerSkill2`))
            player.sendMessage(`§a[ランナースキル2:${result.get("Srun:runnerSkill2")}]`)
            player.sendMessage(`§aスキルを設定しました。`)
        }catch(error){
            player.sendMessage(`§cスキルが設定できませんでした。${error}`)
        }
} 

server.system.afterEvents.scriptEventReceive.subscribe(async(ev) => {
    switch(ev.sourceType){
        case undefined:
            server.world.sendMessage(`[${ev.id}]§scripteventの実行者が存在しません`)
            return
        case server.ScriptEventSource.Entity:
            const entity = ev.sourceEntity
            if(!(entity)) return
            switch(ev.id){
                case "run:show_skill_panel":{
                    if(!(entity.typeId == "minecraft:player")) return
                    let player = entity as server.Player
                    show_skill_panel(player)
                    break
                }
                case "run:testthrough":{
                    if(!(entity.typeId == "minecraft:player")) return
                    let player = entity as server.Player
                    const target = player.dimension.getEntities({location:entity.location,maxDistance:30,minDistance:1})[0]
                    Functions.showTargetIndicator(player,target,"run:echo")
                    break
                }
                case "run:death":{
                    if(!(entity.typeId == "minecraft:player")) return
                    let player = entity as server.Player
                    player.dimension.spawnParticle("minecraft:breeze_wind_explosion_emitter",player.location)
                    player.dimension.playSound("mob.warden.sonic_boom",player.location)
                    let topPlayer = Functions.getLeastLimitPlayer()
                    if(topPlayer){
                        if((server.world.getDynamicProperty(Functions.DynamicPropertyIds.playerCount) as number) == 1){
                            //ゲーム終了処理
                        }else{
                            Functions.ReSelectChaser(topPlayer)
                        }
                    }else{
                        server.world.sendMessage("§c`run:death error`エラー:プレイヤーが存在しません")
                    }
                    break
                    
                }
                case "run:treasure_open":{
                    entity.playAnimation("animation.shulker.open")
                    entity.runCommand("loot spawn ~ ~ ~ loot run_normal")
                    server.system.runTimeout(() => {
                        let dimension = entity.dimension
                        let location = entity.location
                        dimension.spawnParticle("minecraft:egg_destroy_emitter",location)
                        entity.remove()
                    },2)
                    break
                }
                case "run:game_start":{
                    if(!(Functions.getCenter())){
                        server.world.sendMessage("§cゲームの中心点を設定してください")
                        return
                    }
                    for(const run of server.world.getAllPlayers().filter((players)=> players.getDynamicProperty(Functions.DynamicPropertyIds.gameMode) == 0)){
                        Functions.addPlayerCount(1)
                    }
                    if(!(Functions.getPlayerCount() > 1)){
                        server.world.sendMessage("§c十分なプレイヤーがいません。最低参加人数は3人です")
                        return

                    }
                    if(!(entity.typeId == "minecraft:player")) return
                    let player = entity as server.Player
                    
                    Functions.selectChaser(player)
                    for(const player of Functions.getPlayer()){
                        switch(player.getDynamicProperty(Functions.DynamicPropertyIds.gameMode)){
                            case 2:Functions.runnerDistribution(player)
                            break
                            case 3:Functions.chaserDistribution(player)
                            break
                        }
                        player.runCommand(`spreadplayers ${Functions.getCenter()?.x} ${Functions.getCenter()?.z} 8 ${Functions.getRudius()}`)                     
                    }
                    worldBorder.setCenter((Functions.getCenter() ?? {x:0,z:0}))
                    worldBorder.setSize(Functions.getRudius() ?? 50)
                    worldBorder.setActive(true)
                    Functions.setActive(true)
                    registerRunInterval()
                    break
                    
                }
                case "run:game_end":{
                    
                }
                case "run:test_query_skill":{
                    if(!(entity.typeId == "minecraft:player")) return
                    let player = entity as server.Player
                    player.sendMessage(`${JSON.stringify(Functions.getChaseSkillsOnPlayer(player)) + JSON.stringify(Functions.getRunnerSkillOnPlayer(player))}`)
                    break
                }
            }
        case server.ScriptEventSource.Block:{
            switch(ev.id){
                case "run:game_start":{
                    let player = server.world.getAllPlayers().filter((player) => player.getDynamicProperty(Functions.DynamicPropertyIds.gameMode) == 0)[0]
                    Functions.selectChaser(player)
                    break
                }
            }
        }
    }
})

server.world.beforeEvents.entityHurt.subscribe(ev => {
    if((ev.hurtEntity.getDynamicProperty("run:gameMode") ?? 0) as number < 1){
        const player = ev.hurtEntity as server.Player
        const damage = ev.damage
        if((player.getComponent("minecraft:health")?.currentValue ?? 0) < damage){
            ev.cancel = true
            server.system.run(() => {
                Functions.ReSelectChaser(player)
            })
        }
    }
})




