import * as server from "@minecraft/server"
import  * as Commands from "./customCommandList"
import {ModalFormBuilder} from "./library/ModalFormBuilder"
import "./Run/run_main"



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
})




