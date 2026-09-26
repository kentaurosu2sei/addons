import * as server from "@minecraft/server"

export function setScore(entity:server.Entity,scoreName:string,value:number){
    const score = server.world.scoreboard.getObjective(scoreName) ?? server.world.scoreboard.addObjective(scoreName)
        score.setScore(entity,value)
}

export function addScore(entity:server.Entity,scoreName:string,value:number){
    const addValue = (server.world.scoreboard.getObjective(scoreName)?.getScore(entity) ?? 0) + value
    setScore(entity,scoreName,addValue)
}

export function setWorldScore(scoreName:string,value:number){
    const score = server.world.scoreboard.getObjective(scoreName) ?? server.world.scoreboard.addObjective(scoreName)
    score.setScore(scoreName,value)
}