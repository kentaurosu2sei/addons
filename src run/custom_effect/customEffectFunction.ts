import * as server from "@minecraft/server"
import { customEffectData,triggerFunction,alwaysFunction,endFunction,getCustomEffectData, customEffectList } from "./customEffectList"

export function setCustomEffect(target:server.Entity | server.Player, effect: string, duration: number, amplifier: number, triggerFunction?: triggerFunction, alwaysFunction?: alwaysFunction, frequency?: number, endFunction?: endFunction) {
    const beforeEffected = target.getDynamicProperty(`custom:${effect}Duration`) as number | undefined
    if(!beforeEffected){
        let Frequency = frequency ?? 20
        target.setDynamicProperty(`custom:${effect}Duration`, duration)
        target.setDynamicProperty(`custom:${effect}Amplifier`, amplifier)
        target.setDynamicProperty(`custom:${effect}Cancel`, undefined)
        if (triggerFunction) {
            try {
                triggerFunction(target, amplifier);
            } catch (error) {
                server.world.sendMessage(`§c[CustomEffect] Error in triggerFunction for effect ${effect}: ${error}`);
            }
        }
        const interval = server.system.runInterval(() => {
            if(target?.getDynamicProperty(`custom:${effect}Duration`) as number <= 0) {
                if(endFunction && !(target.getDynamicProperty(`custom:${effect}Cancel`))) {
                    try {
                        endFunction(target, amplifier);
                    } catch (error) {
                        server.world.sendMessage(`§c[CustomEffect] Error in endFunction for effect ${effect}: ${error}`);
                    }
                }else{
                    target.setDynamicProperty(`custom:${effect}Cancel`,undefined)
                }
                try{
                    server.system.clearRun(interval)
                }catch(e){
                    server.world.sendMessage(`§c[CustomEffect] it wasnt able to clear runInterval${e}`)
                }
                target.setDynamicProperty(`custom:${effect}Duration`, undefined)
                target.setDynamicProperty(`custom:${effect}Amplifier`, undefined)
                return;
            }
            if(target){
                target.setDynamicProperty(`custom:${effect}Duration`, (target.getDynamicProperty(`custom:${effect}Duration`) as number) - (Frequency/20))
                if((alwaysFunction)) {
                    try{
                        alwaysFunction(target, amplifier);
                    } catch (error) {
                        server.world.sendMessage(`§c[CustomEffect] Error in alwaysFunction for effect ${effect}: ${error}`);
                    }
                }
            }
        }, Frequency)
    }else{
        // 平均化
        target.setDynamicProperty(`custom:${effect}Amplifier`,((target.getDynamicProperty(`custom:${effect}Amplifier`) as number) + (amplifier?? 0)) / 2)
        if(beforeEffected < duration){
            target.setDynamicProperty(`custom:${effect}Duration`,duration)    
        }
    }
}

export function clearCustomEffect(target:server.Entity | server.Player, effect: string) {
    target.setDynamicProperty(`custom:${effect}Duration`, undefined)
    target.setDynamicProperty(`custom:${effect}Amplifier`, undefined)
    target.setDynamicProperty(`custom:${effect}Cancel`, true)
}

export function getCustomEffectDuration(target:server.Entity | server.Player, effect: string): number | undefined {
    return target.getDynamicProperty(`custom:${effect}Duration`) as number | undefined
}

export function applyCustomEffect(target:server.Entity | server.Player, effect: string, duration: number, amplifier?: number) {
    const effectData = getCustomEffectData(effect)
    if (effectData) {
        setCustomEffect(target, effect, duration, amplifier ?? effectData.defaultAmplifier, effectData.triggerFunction, effectData.alwaysFunction, effectData.frequency, effectData.endFunction)
    } else {
        server.world.sendMessage(`§c[CustomEffect] Effect ${effect} not found.`)
    }
}

export function instantApplyCustomEffect(target:server.Entity | server.Player, effect: string) {
    const effectData = getCustomEffectData(effect)
    if (effectData) {
        setCustomEffect(target, effect, effectData.defaultDuration, effectData.defaultAmplifier, effectData.triggerFunction, effectData.alwaysFunction, effectData.frequency, effectData.endFunction)
    } else {
        server.world.sendMessage(`§c[CustomEffect] Effect ${effect} not found.`)
    }
}

export function setAmplifier(target:server.Entity | server.Player, effect: string, amplifier: number) {
    if (target.getDynamicProperty(`custom:${effect}Amplifier`) as number | undefined) {
        target.setDynamicProperty(`custom:${effect}Amplifier`, amplifier)
    }else{
        server.world.sendMessage(`§c[CustomEffect] Effect ${effect} is not active.`)
    }
}

export function getCustomEffectIds(){
    return Object.keys(customEffectList)
}

export function getCustomEffectsOnEntity(target:server.Entity | server.Player){
    const Ids = target.getDynamicPropertyIds().filter((id) => id.startsWith("custom:") && id.endsWith("Duration")).map((ids) => ids.slice(7,-9))
    return Ids
}

function reactivation(player:server.Player){
        const Ids = getCustomEffectsOnEntity(player)
        if(Ids.length === 0) return
        for(const effect of Ids){
            const duration = player.getDynamicProperty(`custom:${effect}Duration`) as number
            const amplifier = player.getDynamicProperty(`custom:${effect}Amplifier`) as number
            clearCustomEffect(player,effect)
            applyCustomEffect(player,effect,duration,amplifier)
        }
}


server.world.afterEvents.playerSpawn.subscribe(ev =>{
    const player = ev.player
    if(ev.initialSpawn){
        reactivation(player)
        }
    }
)

server.world.afterEvents.worldLoad.subscribe(() => {
    for(const player of server.world.getPlayers()){
        reactivation(player)
    }
})