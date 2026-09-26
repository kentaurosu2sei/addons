import * as server from "@minecraft/server"


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




/*
Commandの登録場所
*/

