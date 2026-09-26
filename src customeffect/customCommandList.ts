import * as server from "@minecraft/server"
import {customEffectList} from "./custom_effect/customEffectList"
import { applyCustomEffect,getCustomEffectIds} from "./custom_effect/customEffectFunction"
import "./library/infoboard"
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

