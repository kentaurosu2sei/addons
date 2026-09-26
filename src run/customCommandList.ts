import * as server from "@minecraft/server"
import {customEffectList} from "./custom_effect/customEffectList"
import { applyCustomEffect,getCustomEffectIds} from "./custom_effect/customEffectFunction"
import { selectCenter } from "./Run/runFunctions"
import * as RunFunctions from "./Run/runFunctions"
export interface customCommandCallback {
    (origin: server.CustomCommandOrigin, ...args: any[]): server.CustomCommandResult | undefined
}

export interface customCommandData{
    command:server.CustomCommand
    callback:customCommandCallback
}

export const customCommandList: Record<string, customCommandData> = {}
export const customEnumList: Record<string, string[]> = {}

export function getCustomCommandData(id: string): customCommandData | undefined {
    return customCommandList[id]
}

function registerCustomCommand(id:string,data:customCommandData){
    customCommandList[id] = {
        command:data.command,
        callback:data.callback
    }
}

function registerCustomEnum(id:string,Enum:string[]){
    customEnumList[id] = Enum
}

/*
Enumの登録場所
*/

registerCustomEnum("custom:customEffect",
    getCustomEffectIds()
)

/*
Commandの登録場所
*/

registerCustomCommand("customEffectCommand",
    {
        "command":{
            "name":"custom:custom_effect",
            "description":"apply entities custom effect",
            "cheatsRequired":true,
            "permissionLevel":server.CommandPermissionLevel.Admin,
            "mandatoryParameters":[
                {
                    "name":"target",
                    "type":server.CustomCommandParamType.EntitySelector
                },
                {
                    "name":"custom:customEffect",
                    "type":server.CustomCommandParamType.Enum
                },
                {
                    "name":"duration",
                    "type":server.CustomCommandParamType.Float
                }
            ],
            "optionalParameters":[
                {
                    "name":"amplifier",
                    "type":server.CustomCommandParamType.Float
                }
            ]
        },
        "callback":(origin:server.CustomCommandOrigin,target:server.Entity[],effect:string,duration:number,amplifier?:number) => {
            if(target?.length === 0) return
            for(const entity of target){
                server.system.run(()=> {
                        applyCustomEffect(entity,effect,duration,amplifier)
                })
            }
        }
    }
)

registerCustomCommand("base:applyknockback",
    {
        "command":{
            "name":"base:knockback",
            "description":"apply accelaration",
            "cheatsRequired":true,
            "permissionLevel":server.CommandPermissionLevel.Admin,
            "mandatoryParameters":[
                {
                    "name":"target",
                    "type":server.CustomCommandParamType.EntitySelector
                },
                {
                    "name":"power",
                    "type":server.CustomCommandParamType.Float
                }
            ],
            "optionalParameters":[
                {
                    "name":"originLocation",
                    "type":server.CustomCommandParamType.Location
                }
            ]
        },
        "callback":(origin:server.CustomCommandOrigin,target:server.Entity[],power:number,originLocation?:server.Vector3) => {
            if(target.length === 0) return
            let oriL = originLocation ?? origin.sourceEntity?.location ?? origin.sourceBlock?.location ?? {x:0,y:0,z:0}
            for(const entity of target){
                let tarL = entity.location
                let horiV = {x:power * (tarL.x - oriL.x),z:power * (tarL.z - oriL.z)}
                let vartV = power * (tarL.y - oriL.y)
                server.system.run(()=>{
                    entity.applyKnockback(horiV,vartV)
                })

            }
        }
    }
)

registerCustomCommand("base:rename",{
    "command":{
        "name":"base:rename",
        "permissionLevel":0,
        "cheatsRequired":false,
        "description":"自分の名前を変更します",
        "mandatoryParameters":[
            {
                "name":"name",
                "type":server.CustomCommandParamType.String
            }
        ]
    },
    "callback":(origin:server.CustomCommandOrigin,name:string) => {
        if(!(origin.sourceEntity)){
            server.world.sendMessage("§c実行者が見つかれませんでした。実行者はプレイヤーに限定されています。")
            return
        }
        origin.sourceEntity.nameTag = name
    }
})

registerCustomCommand("run:select_centor",{
    "command":{
        "name":"run:select_centor",
        "description":"RUNゲームの中心点、半径を設定します",
        "cheatsRequired":true,
        "permissionLevel":0,
        "mandatoryParameters":[
            {
                "name":"selectCenter",
                "type":server.CustomCommandParamType.Location
            },
            {
                "name":"radius",
                "type":server.CustomCommandParamType.Float
            }
        ]
    },
    "callback":(origin:server.CustomCommandOrigin,center:server.Vector3,radius:number) => {
        RunFunctions.selectCenter({x:center.x,z:center.z},radius)
    }
})