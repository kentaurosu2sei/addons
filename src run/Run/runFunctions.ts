import * as server from "@minecraft/server"
import * as SkillMeta from "./SkillMetaData"

export const DynamicPropertyIds = {
    limitTime:"run:limit_timr",//number
    gameMode:"run:gameMode",//number
    levelPoint:"run:level_point",//number
    level:"run:level",//number
    gameIsVail:"run:isVail",//boolean
    playerCount:"run:player_count",//number
    centerX:"Srun:center_x",//number
    centerY:"Srun:center_y",
    centerZ:"Srun:center_Z",//number
    radius:"Srun:radius",//number
    


}

export function addtime(player:server.Player,amount:number){
    player.setDynamicProperty("run:limit_time",((player.getDynamicProperty(DynamicPropertyIds.limitTime) as number) ?? 0) + amount)
    if((player.getDynamicProperty(DynamicPropertyIds.limitTime) as number) <= 0){
        player.runCommand("scriptevent run:death")
    }
}

export function getPlayer(){
    return server.world.getAllPlayers().filter(player => player.getDynamicProperty(DynamicPropertyIds.gameMode) as number > 1)
}



export function getLeastLimitPlayer(){
    let least = null
    let higest = 0
    for(const player of server.world.getAllPlayers().filter((player) => player.getDynamicProperty(DynamicPropertyIds.gameMode))){
        let time = player.getDynamicProperty("run:limit_time") as number 
        if(time > higest){
            least = player
            higest = time 
        }
    }
    return least
}

export function selectChaser(Player:server.Player){
    for(const player of server.world.getPlayers().filter((player) => player.getDynamicProperty(DynamicPropertyIds.gameMode) == 0)){
        player.setDynamicProperty(DynamicPropertyIds.gameMode,2)
    }
    Player.setDynamicProperty(DynamicPropertyIds.gameMode,3)
}
export function ReSelectChaser(Player:server.Player){
    for(const player of server.world.getPlayers().filter((player) => player.getDynamicProperty(DynamicPropertyIds.gameMode) == 3)){
        player.setDynamicProperty(DynamicPropertyIds.gameMode,2)
        chaserDistribution(player)
    }
    Player.setDynamicProperty(DynamicPropertyIds.gameMode,3)
}

export function normalizeVector(vector: server.Vector3): server.Vector3 {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length === 0) {
        return { x: 0, y: 0, z: 0 };
    }
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
    };
}

export function showTargetIndicator(player: server.Player, target: server.Entity,PARTICLE_ID:string): void {
    if((target.typeId.startsWith("gaagaa"))) return;
    if (!target) return;
    const oriL = {
        x: player.location.x,
        y: player.location.y +1,
        z: player.location.z
    }
    const targetL = {
        x: target.location.x,
        y: target.location.y +1,
        z: target.location.z
    };
    const direction = {
        x: targetL.x - oriL.x,
        y: targetL.y - oriL.y,
        z: targetL.z - oriL.z
    };
    const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
    const normalizedDirection = normalizeVector(direction);
    const hit = player.dimension.getBlockFromRay(oriL, normalizedDirection, { maxDistance: distance -0.1})?.block.location
    if(hit){
        
        const offset = {
            x: hit.x - normalizedDirection.x,
            y: hit.y - normalizedDirection.y,
            z: hit.z - normalizedDirection.z
        }
        
        player.spawnParticle(PARTICLE_ID,offset)
    }
    
    else{
        player.spawnParticle(PARTICLE_ID,targetL)
        server.world.sendMessage(`こいつは${target.typeId}です`)
    }
}

export function addPlayerCount(count:1|-1){
    server.world.setDynamicProperty(DynamicPropertyIds.playerCount,((server.world.getDynamicProperty(DynamicPropertyIds.playerCount) as number) ?? 0) + count)
}

export function getPlayerCount(){
    return server.world.getDynamicProperty(DynamicPropertyIds.playerCount) as number
}



export function getChaseSkillsOnPlayer(player:server.Player){
    let chaseSkills = []
    for(let i=1;i<4;i++){
        chaseSkills.push(player.getDynamicProperty(`Srun:chaserSkill${i}`) as string)
    }
    return chaseSkills
}

export function getGameMode(player:server.Player){
    let nun = player.getDynamicProperty(DynamicPropertyIds.gameMode) as number | undefined
    if(nun){
        return nun 
    }else{
        return undefined
    }
}

export function getRunnerSkillOnPlayer(player:server.Player){
    let runnerSkill1 = []
    for(let i=1;i<3;i++){
        runnerSkill1.push(player.getDynamicProperty(`Srun:runnerSkill${i}`) as string)
    }
    return runnerSkill1
}

export function chaserDistribution(player:server.Player){
    const inventory = player.getComponent("minecraft:inventory")?.container
    if(inventory){
        inventory.clearAll()
        for(const skill of getChaseSkillsOnPlayer(player)){
            inventory.addItem((new server.ItemStack(`run:skill_${skill}`)))
        }
        player.runCommand("loot give @s loot chaser_start")
    }
}

export function runnerDistribution(player:server.Player){
    const inventory = player.getComponent("minecraft:inventory")?.container
    if(inventory){
        inventory.clearAll()
        for(const skill of getRunnerSkillOnPlayer(player)){
            let amount = SkillMeta.getRunnerSkills(skill).defaultAmount
            if(amount){
                inventory.addItem((new server.ItemStack(`run:skill_${skill}`,amount)))
            }else{
                inventory.addItem((new server.ItemStack(`run:skill_${skill}`)))
            }
        }
        player.runCommand("loot give @s loot runner_start")
    }
}


export function selectCenter(point:server.VectorXZ,radius:number){
    server.world.setDynamicProperty(DynamicPropertyIds.centerX,point.x)
    server.world.setDynamicProperty(DynamicPropertyIds.centerZ,point.z)
    server.world.setDynamicProperty(DynamicPropertyIds.radius)
}


export function getCenter(){
    let X = server.world.getDynamicProperty(DynamicPropertyIds.centerX) as number
    let Z = server.world.getDynamicProperty(DynamicPropertyIds.centerZ) as number
    if(X&&Z){
        return {x:X,z:Z}
    }else{
        return undefined
    }
}

export function getCenter3D(){
    let X = server.world.getDynamicProperty(DynamicPropertyIds.centerX) as number
    let Y = server.world.getDynamicProperty(DynamicPropertyIds.centerY) as number
    let Z = server.world.getDynamicProperty(DynamicPropertyIds.centerZ) as number
    if(X&&Y&&Z){
        return {x:X,y:Z,z:Z}
    }else{
        return undefined
    }
}

export function getRudius(){
    let R = server.world.getDynamicProperty(DynamicPropertyIds.radius) as number
    if(R){
        return R
    }else{
        return undefined
    }
}
export function setActive(isActive:boolean){
    server.world.setDynamicProperty(DynamicPropertyIds.gameIsVail,isActive)
}
export function isActive(){
    return server.world.getDynamicProperty(DynamicPropertyIds.gameIsVail)
}