import * as server from "@minecraft/server"
import * as ui from "@minecraft/server-ui"
import { cmd } from "./command-builder";
import { ModalFormBuilder, FieldDef } from "./ModalFormBuilder";
import { CustomEffectManager } from "./CustomEffectManager";
import * as Functions from "./Functions";



function randomInteger (max:number) {

    const num = Math.random() * (max + 1);
    const numInt = Math.trunc(num);

    return numInt;
}



server.system.beforeEvents.startup.subscribe(ev => {
    ev.blockComponentRegistry.registerCustomComponent("zk:vergurd", {
        onTick:evenData => {
            const Block = evenData.block
            const X = Block.location.x
            const Y = Block.location.y
            const Z = Block.location.z
            Block.dimension.runCommand(`execute if block ${X} ${Y} ${Z} ${Block.typeId} run setblock ${X} ${Y} ${Z} minecraft:air`)
        },
    })
})

server.system.runInterval(() => {
})

server.system.afterEvents.scriptEventReceive.subscribe(ev => {
    if(ev.sourceEntity){
        const source = ev.sourceEntity;
        const otherplayer = source.dimension.getPlayers({closest:1,location:source.location})[0]
        switch(ev.id){
            case"ctool:remove":{
                source.remove();
                break;
            }
            case"ctool:getInfo":{
                const infomation = [
                    "---------------------------",
                    `${source.nameTag || source.typeId}の情報を取得しました`,
                    `[位置: ${source.location.x}, ${source.location.y}, ${source.location.z}]`,
                    `[付与されているダイナミックプロパティ: ${JSON.stringify(source.getDynamicPropertyIds() ?? "なし")}]`,
                    `[付与されているエフェクト: ${JSON.stringify(source.getEffects() ?? "なし")}]`,
                    `[現在のヒットポイント: ${source.getComponent("minecraft:health")?.currentValue}/${source.getComponent("minecraft:health")?.defaultValue}]`,
                    `[付与されているタグ: ${JSON.stringify(source.getTags() ?? "なし")}]`,
                    "---------------------------"
                ]
                for(const info of infomation){
                    server.world.sendMessage(`§l${info}`);
                    
                }
                break;
            }
            case "ctool:dumyAttack":{
                source.triggerEvent("ctool:defaultmode")
                server.world.sendMessage("ダミーくんをアタックモードに変更しました")
                break;
            }
            case"ctool:dumyDefault":{
                source.triggerEvent("ctool:attackmode")
                server.world.sendMessage("ダミーくんをデフォルトモードに変更しました")
                break
            }
            case "ctool:dumy": {
    if (!(source.typeId.startsWith("ctool:dumy"))) return;
    if (!(ev.message)) {
        server.system.runTimeout(async () => {
            try {
                const result = await new ModalFormBuilder()
                    .title("ダミーくん設定画面")
                    .dropdown("mode", "ダミーくんのモード", ["変更なし", "default", "attack"])
                    .textField("items", "持たせるアイテムのID", "例:minecraft:stick",{})
                    .textField("tags", "付与するタグ", "例:dumy")
                    .slider("dps","DPSを計測する",0,90,{tooltip:"指定秒間あたりのダメージを計測します。0秒を指定した場合は計測しません。計測中はダメージ表示を行わず、計測終了後総ダメージ、tick/secoundあたりのダメージを表示します。※モード変更とは併用できません"})
                    .toggle("nodisplay","ダメージ表示をオフ",{defaultValue:source.hasTag("noDisplay")})
                    .toggle("isClearEffects", "エフェクトをすべて消す")
                    .toggle("isRemoveTags", "タグをすべて消す")
                    .show(otherplayer);
                if (result.canceled) {
                    server.world.sendMessage("設定がキャンセルされました。");
                    return;
                }

                const items = result.get("items");
                const tags = result.get("tags");
                const mode = result.get("mode");

                if((mode !== "変更無し") && result.get("dps")){
                    server.world.sendMessage("§cDPS計測とモード変更は併用できません。")
                    return;
                }

                if (items) {
                    source.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${items}`);
                }
                if (tags) {
                    source.runCommand(`tag @s add ${tags}`);
                }
                if(result.get("dps")){
                    const Time = result.get("dps") ?? 0
                    for(let i=5;i>=0;i--){
                        server.system.runTimeout(()=>{
                            if(i !== 0){
                                server.world.sendMessage(`計測まで${i}秒`)
                            }else{
                                server.world.sendMessage("計測を開始します")
                                source.setDynamicProperty("measuredDamage", 0)
                                source.addTag("dpsMeasuring")
                                server.system.runTimeout(()=> {
                                    const allDamage = source.getDynamicProperty("measuredDamage") as number
                                    const displaytext =[
                                        "-------------------------------",
                                        `§l計測を終了しました`,
                                        `AllDamage:[${allDamage}]`,
                                        `D/tick:[${allDamage/Time/20}]`,
                                        `D/secound:[${allDamage/Time}]`,
                                        "-------------------------------"
                                    ]
                                    for(const text of displaytext){
                                        server.world.sendMessage(`${text}`)
                                    }
                                    source.removeTag("dpsMeasuring")
                                },Time*20)
                            }
                        },(5-i)*20)
                    }
                }
                if(result.get("nodisplay")&& !(source.hasTag("noDisplay"))){
                    server.world.sendMessage("ダメージ表示をオフにしました")
                    source.addTag("noDisplay")
                }
                if(!(result.get("nodisplay")) && source.hasTag("noDisplay")){
                    server.world.sendMessage("ダメージ表示をオンにしました")
                    source.removeTag("noDisplay")
                }
                
                if (result.get("isClearEffects")) {
                    source.runCommand(`effect @s clear`);
                }
                if (result.get("isRemoveTags")) {
                    for (const tag of source.getTags()) {
                        source.removeTag(tag);
                    }
                }

                // 「変更なし」のときはイベントを発火しない
                if (mode !== "変更なし") {
                    source.triggerEvent(`ctool:${mode}mode`); // runCommandよりtriggerEventの方が安全・高速
                    server.world.sendMessage(`ダミーくんを${mode}モードにしました。`);
                } else {
                    server.world.sendMessage("ダミーくんのモードは変更されませんでした。");
                }
            } catch (e) {
                server.world.sendMessage(`§cエラーが発生しました: ${e}`);
                console.error(e);
            }
        });
    }
    break;
}
        }
    }
})



cmd("ctool:knockback", "ノックバックを与える")
    .permission("any")
    .cheatsRequired()
    .param("selector", "entity") // Entity | Entity[] が返る
    .param("power", "float")
    .optional("originVector", "location")
    .handle((origin, target, power, originVector) => {
    if (!origin.sourceEntity)
        return;
    // ✅ タイポ修正: orginVector → originVector
    const origin3d = originVector ?? origin.sourceEntity.location;
    const applyKnockback = (entity: server.Entity) => {
        entity.applyKnockback({
            x: power * (entity.location.x - origin3d.x),
            z: power * (entity.location.z - origin3d.z),
        }, power * (entity.location.y - origin3d.y));
    };
    // ✅ 配列かどうかで分岐（Array.isArray でも OK だが型ガードで統一）
    server.system.runTimeout(() => {
        if (Array.isArray(target)) {
            // ✅ タイポ修正: target.applyKnockback → entity.applyKnockback
            for (const entity of target) {
                applyKnockback(entity);
            }
        }
        else {
            applyKnockback(target);
        }
    }, 1);
})
    .register();

cmd("ctool:remove", "エンティティを削除する")
    .permission("any")
    .cheatsRequired()
    .param("selector", "entity")
    .handle((origin, target) => {
    if (!target)
        return;
    server.system.runTimeout(() => {
        if (Array.isArray(target)) {
            for (const entity of target) {
                if (entity.id === "minecraft:player")
                    continue;
                entity.remove();
            }
        }
        else {
            if (target.id === "minecraft:player")
                return;
            target.remove();
        }
    }, 1);
})
    .register();

server.world.beforeEvents.entityHurt.subscribe((ev) => {
    const entity = ev.hurtEntity;
    if(ev.damageSource.damagingEntity?.typeId === "minecraft:player"){
        const player = ev.damageSource.damagingEntity as server.Player
        
        switch(player.getComponent("minecraft:inventory")?.container.getItem(player.selectedSlotIndex)?.typeId){
            case "ctool:command_stick":{
                ev.cancel = true;
                if(player.isSneaking){
                    server.system.runTimeout(async() => {
                        const result = await new ModalFormBuilder()
                            .title("コマンドラインインターフェース")
                            .textField("command", "コマンドを入力してください", "例:remove", {})
                            .toggle("isSave", "インタラクションコマンドとして保存")
                            .show(player)
                            if(result.canceled)return;
                            entity.runCommand(`scriptevent ctool:${result.get("command") ?? ""}`);
                            if(result.get("isSave")){
                                player.setDynamicProperty("ctool_intraction_command", result.get("command") ?? "")
                        }
                    }, 1);
                }else{
                    server.system.runTimeout(() => {
                        server.world.sendMessage("インタラクションコマンドを実行しました。")
                        entity.runCommand(`scriptevent ctool:${player.getDynamicProperty("ctool_intraction_command") ?? "remove"}`)
                    }, 1);
                }
                break
            }
        }
    }
    const dumyDamageCancel = (entity:server.Entity) => {
        const damage = ev.damage ?? 0 
        server.system.runTimeout(() => {
            const source = ev.damageSource
            if(entity.hasTag("dpsMeasuring")){
                const Mesured = (entity.getDynamicProperty("measuredDamage") as number) ?? 0 
                entity.setDynamicProperty("measuredDamage",Mesured+damage)
            }
            if(entity.hasTag("noDisplay") || entity.hasTag("dpsMeasuring")) return
            if(source.damagingEntity){
                entity.runCommand(`say §l${source.damagingEntity.typeId}から${source.cause}タイプのダメージを${damage}受けました`)
            }else{
                entity.runCommand(`say §l${source.cause}タイプのダメージを${damage}受けました`)
            }
        })
    }
    switch(entity.typeId){
        case"ctool:dumy_default":{
            ev.cancel = true
            dumyDamageCancel(entity)
            break;
        }
        case"ctool:dumy_attack":{
            dumyDamageCancel(entity)
            ev.damage = 0
            break;
        }
    }
});

server.world.afterEvents.entitySpawn.subscribe(ev => {
    const entity = ev.entity
    switch(true){
        case entity.typeId.startsWith("ctool:dumy"):{
            entity.runCommand("tag @s add dumy")
        }
    }
})

server.world.afterEvents.itemUse.subscribe(ev => {
    if(ev.itemStack.typeId == "minecraft:stick"){
        ev.source.runCommand("say Hello World!")
    }
    if(ev.itemStack.typeId.startsWith("ctool")){
        const item = ev.itemStack
        const player = ev.source
        if(item.typeId == "ctool:ultimate_apple"){
            const effectLocation = {x:player.location.x, y:player.location.y + 0.5, z:player.location.z}
            if(player.isSneaking){
                if(player.hasTag("invisible")){
                    player.removeTag("invisible")
                    player.spawnParticle("ctool:stop_invisible",effectLocation)
                }
                else{
                    player.addTag("invisible")
                    player.spawnParticle("ctool:start_invisible",effectLocation)
            }
        }
            else{
                player.runCommand("effect @s instant_health 1 255 true")
                player.runCommand("effect @s saturation 1 255 true")
            }
        }
        if(item.typeId == "ctool:air_pen"){
            ev.source.runCommand("execute as @s at @s anchored eyes run setblock ^^^3 minecraft:glass keep")
        }
    }
})

server.world.afterEvents.playerInteractWithBlock.subscribe(ev => {
    if(ev.itemStack?.typeId.startsWith("ctool")){
        const item = ev.itemStack
        const player = ev.player
        const block = ev.block
        const location = block.location
        if(item.typeId == "ctool:air_pen" && block.typeId == "ctool:anchor_block"){
            player.runCommand(`setblock ${location.x} ${location.y} ${location.z} minecraft:dirt`)
        }
    }
})


