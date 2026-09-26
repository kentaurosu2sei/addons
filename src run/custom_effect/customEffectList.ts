import * as server from "@minecraft/server"
import { setScore } from "../library/scoreFunctions"

export interface triggerFunction {
    (target:server.Entity | server.Player, amplifier: number): void
}

export interface alwaysFunction {
    (target:server.Entity | server.Player, amplifier: number): void
}

export interface endFunction {
    (target:server.Entity | server.Player, amplifier: number): void
}

export interface customEffectData {
    name: string,
    defaultDuration: number,
    defaultAmplifier: number,
    triggerFunction?: triggerFunction,
    alwaysFunction?: alwaysFunction,
    frequency?: 1|5|10|15|20,
    endFunction?: endFunction,
    isBadEffect?:boolean
}

export const customEffectList: Record<string, customEffectData> = {}

export function getCustomEffectData(effect: string): customEffectData | undefined {
    return customEffectList[effect]
}

function registerCustomEffect(effect: string, data: customEffectData) {
    customEffectList[effect] = {
        name: data.name,
        defaultDuration: data.defaultDuration,
        defaultAmplifier: data.defaultAmplifier,
        triggerFunction: data.triggerFunction,
        alwaysFunction: data.alwaysFunction,
        frequency: data.frequency,
        endFunction: data.endFunction,
        isBadEffect:data.isBadEffect
    }
}

/*
以下はカスタムエフェクトの定義です。お好きに追加してください。
*/

registerCustomEffect("test",{
    name: "Test Effect",
    defaultDuration: 10,
    defaultAmplifier: 1,
    triggerFunction: (target:server.Entity | server.Player, amplifier?: number) => {
        server.world.sendMessage(`§a[CustomEffect] Test Effect triggered with amplifier ${amplifier}`);
    },
    alwaysFunction: (target:server.Entity | server.Player, amplifier?: number) => {
        server.world.sendMessage(`§a[CustomEffect] Test Effect is active with amplifier ${amplifier}`);
    },
    frequency: 20,
    endFunction: (target:server.Entity | server.Player, amplifier?: number) => {
        server.world.sendMessage(`§a[CustomEffect] Test Effect ended with amplifier ${amplifier}`);
    },
    isBadEffect:true
})

registerCustomEffect("glow",{
    "name":"glow:score",
    "defaultAmplifier":0,
    "defaultDuration":10,
    "isBadEffect":false,
    "alwaysFunction":(target:server.Entity|server.Player) => {
        setScore(target,"glow_score",1)
    },
    "endFunction":(target:server.Entity|server.Player) => {
        setScore(target,"glow_score",0)
    },
    "frequency":1
})

registerCustomEffect("gravity",{
    "name":"run:gravity",
    "defaultAmplifier":1,
    "defaultDuration":30,
    "isBadEffect":true,
    "alwaysFunction":(target:server.Entity|server.Player,amplifier:number) => {
        target.applyKnockback({x:0,z:0},-5 * amplifier)
        target.dimension.spawnParticle("run:gravity",target.location)
        if(target.typeId == "minecraft:player"){
            const player = target as server.Player
            player.inputPermissions.setPermissionCategory(server.InputPermissionCategory.Jump,false)
        }
    },
    "frequency":1,
    "endFunction":(target:server.Entity|server.Player,amplifier:number) => {
        if(target.typeId == "minecraft:player"){
            const player = target as server.Player
            player.inputPermissions.setPermissionCategory(server.InputPermissionCategory.Jump,true)
        } 
    }
})

registerCustomEffect("blood",{
    "name":"run:blood",
    "defaultDuration":7,
    "defaultAmplifier":1,
    "isBadEffect":true,
    "frequency":20,
    "alwaysFunction":(target:server.Entity|server.Player,amplifier:number) => {
        target.dimension.spawnParticle("run:blood",target.location)
    },
    "endFunction":(target:server.Entity|server.Player,amplifier:number) => {
        target.applyDamage(3)
    }
})