import * as server from "@minecraft/server";
import { config } from "./config";
import * as libraryAPI from "./lbraryAPI"
import { ModalFormBuilder, ActionFormBuilder,ActionButtonDef } from "./ModalFormBuilder";
import { itemList,getItemByKey } from "./itemList";
import {worldBorder} from "./WorldBorder"

// -----------------------------------------------------------------------------
// 定数定義
// -----------------------------------------------------------------------------
type SystemConfigKey = keyof typeof config.system_config;

export const propertyIds = {
    playerAmmo: "shot_surv:ammo",
    playerTeam: "shot_surv:team",
    playerStatisticsKillMob: "shot_surv:statistics_kill_mob",
    playerStatisticsKillPlayer: "shot_surv:statistics_kill_player",
    playerStatisticsDamaged: "shot_surv:statistics_damaged",
    playerStatisticsBreakBlock: "shot_surv:statistics_break_block",
    playerStatisticsSniperHit: "shot_surv:statistics_sniper_hit",
    playerBaseLocation: "shot_surv:base_location",
    playerDownCount:"shot_surv:player_down_count",
    playerRecoverdTime:"shot_surv:player_recoverd_time",
    playerLastKilledBy:"shot_surv:last_killed_by",
    gameDimension: "shot_surv:game_dimension",
    centerPosition: "shot_surv:center_position",
    areaDiameter: "shot_surv:area_diameter",
    gamePhase: "shot_surv:game_phase",
    activeTeamList: "shot_surv:active_team", // "/"区切りの配列
    itemType:"shot_surv:item_type",
    upperLimit:"shot_surv:upper_limit",
    lowerLimit:"shot_surv:lower_limit",
    downTag:"shot_surv:down",
    useIceBomb:"shot_surv:use_ice_bomb",
    protectionFallTag:"shot_surv:protection_fall"

} as const;

export const phaseId = {
    day: "preparationDay",
    night: "preparationNight",
    fight: "fight",
    sudden: "suddenDeath",
} as const;

export const phaseOrder = [
    "preparationDay",
    "preparationNight",
    "fight",
    "suddenDeath",
] as const;

export type PhaseId = typeof phaseOrder[number];

// -----------------------------------------------------------------------------
// ユーティリティ / 文字列・変換系
// -----------------------------------------------------------------------------
export type subList = string|`${string}/${string}`

export function normalizeVector3(value: unknown): server.Vector3 | undefined {
    if (typeof value === "string") {
        const locArray = value.split("/").map(Number);

        if (locArray.length !== 3 || locArray.some(Number.isNaN)) {
            return undefined;
        }

        return {
            x: locArray[0],
            y: locArray[1],
            z: locArray[2],
        } as server.Vector3;
    }

    if (value && typeof value === "object") {
        const loc = value as Partial<server.Vector3>;

        if (
            typeof loc.x === "number" &&
            typeof loc.y === "number" &&
            typeof loc.z === "number"
        ) {
            return {
                x: loc.x,
                y: loc.y,
                z: loc.z,
            };
        }
    }

    return undefined;
}

export function parseSetToSubList(list:Set<any>):subList{
    return Array.from(list).join("/")
}

export function parseSubListToSet(subList: subList): Set<string> {
    return new Set(subList.split("/").filter(Boolean));
}

export function addSubList(subList: string, element: string): string {
    const currentSet = parseSubListToSet(subList);
    currentSet.add(element);
    return Array.from(currentSet).join("/");
}

export function removeSubList(subList: string, element: string): string {
    const currentSet = parseSubListToSet(subList);
    currentSet.delete(element);
    return Array.from(currentSet).join("/");
}

// -----------------------------------------------------------------------------
// Config / DynamicProperty 系
// -----------------------------------------------------------------------------
export function getSystemConfigValue<K extends SystemConfigKey>(
    key: K
): typeof config.system_config[K] {
    const dynamicValue = server.world.getDynamicProperty(`shot_surv:${key}`);
    return (dynamicValue ?? config.system_config[key]) as typeof config.system_config[K];
}


export function getGamePhase(): PhaseId | undefined {
    const phase = server.world.getDynamicProperty(propertyIds.gamePhase);
    if(!(phase === "preparationDay" || phase === "preparationNight" || phase === "fight" || phase ==="suddenDeath")) return
    return phase
}

export function setGamePhase(phaseId: PhaseId): void {
    if (phaseOrder.includes(phaseId as PhaseId)) {
        server.world.setDynamicProperty(propertyIds.gamePhase, phaseId);
    }
}

// -----------------------------------------------------------------------------
// 中心座標・基地座標系
// -----------------------------------------------------------------------------
export interface heightLimit {
    upper:number,
    lower:number
}
export function getGameDimension(){
    return getSystemConfigValue("game_dimension")   
}

export function getHeightLimit(){
    return {
        upper:getSystemConfigValue("upper_limit"),
        lower:getSystemConfigValue("lower_limit")
    } as heightLimit
}

export function isInsideArea(dimension:server.Dimension,location:server.Vector3){
    const center = getCenter()
    const dim = dimension.id
    const Area = getAreaDiameter()/2
    const height = getHeightLimit()
    if(!center) return undefined
    if(!((center.x -Area < location.x) &&(location.x< center.x + Area)&&(center.z - Area < location.z) && (location.z < center.z + Area) && (center.y-height.lower<location.y) && (location.y<center.y+height.upper) && (dim === getGameDimension()))) return false
    return true
}

export function setHeightLimit(limit:heightLimit){
    server.world.setDynamicProperty(propertyIds.upperLimit,limit.upper)
    server.world.setDynamicProperty(propertyIds.lowerLimit,limit.lower)
}

export function defineCenterPosition(player: server.Player): void {
    server.world.setDynamicProperty(propertyIds.gameDimension, player.dimension.id);
    server.world.setDynamicProperty(propertyIds.centerPosition, player.location);
}

export function getCenter(): server.Vector3 | undefined {
    const worldCenter = server.world.getDynamicProperty(propertyIds.centerPosition);
    const configCenter = getSystemConfigValue("center_position");

    return normalizeVector3(worldCenter ?? configCenter) ?? undefined;
}

export function getAreaDiameter(){
    return getSystemConfigValue("area_diameter")
}

export function setAreaDeameter(diameter:number){
    server.world.setDynamicProperty(propertyIds.areaDiameter,diameter)
}

export function getBasePoint(player: server.Player): server.DimensionLocation | undefined {
    const centerPos = getCenter();
    const gameDim = server.world.getDynamicProperty(propertyIds.gameDimension);

    if (!centerPos || typeof gameDim !== "string") {
        server.world.sendMessage("§c[Some dynamicProperty is not available]ゲームが正常に進行していません。");
        return undefined;
    }

    const pos = (player.getDynamicProperty(propertyIds.playerBaseLocation) as server.Vector3) ?? centerPos;

    return {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        dimension: server.world.getDimension(gameDim),
    };
}

export function setBasePoint(player:server.Player){
    if(!isInsideArea(player.dimension,player.location)){
        player.sendMessage("§c拠点はゲーム範囲内に作成する必要があります。")
        return
    }
    const team = getTeam(player)
    if(!(team)) return
    for(const teamM of getTeamMenbers(team)){
        teamM.setDynamicProperty(propertyIds.playerBaseLocation,player.location)
        teamM.setSpawnPoint(getBasePoint(player))
        teamM.sendMessage(`§a${player.nameTag}が拠点を[${Math.floor(player.location.x)}/${Math.floor(player.location.y)}/${Math.floor(player.location.z)}]にセットしました。`)
    }
}
// -----------------------------------------------------------------------------
// プレイヤー / チーム系
// -----------------------------------------------------------------------------
export function getTeam(player: server.Player): string | undefined {
    const team = player.getDynamicProperty(propertyIds.playerTeam);

    if (typeof team === "string") {
        return team;
    }

    return undefined;
}

export function getTeamMenbers(teamName: string): server.Player[] {
    return server.world.getPlayers().filter(
        (player) => player.getDynamicProperty(propertyIds.playerTeam) === teamName
    );
}

export function getAllActivePlayer(): server.Player[] {
    return server.world
        .getAllPlayers()
        .filter((p) => p.getDynamicProperty(propertyIds.playerTeam) !== "spectator");
}



// -----------------------------------------------------------------------------
// アイテム / インベントリ系
// -----------------------------------------------------------------------------
export function hasItem(
    entity: server.Entity,
    filter: (item: server.ItemStack) => boolean,
    isReturnItemStack?: boolean
): boolean | server.ItemStack[] | undefined {
    const inventory = entity.getComponent("inventory")?.container;
    if (!inventory) return undefined;

    if (!isReturnItemStack) {
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item && filter(item)) return true;
        }
        return false;
    }

    const itemStacks: server.ItemStack[] = [];
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && filter(item)) itemStacks.push(item);
    }
    if(itemStacks.length >= 1) return itemStacks
    return undefined;
}


export function clearItem(
    entity: server.Entity,
    filter: (item: server.ItemStack) => boolean,
    amount?: number
): boolean | number {
    const container = entity.getComponent("inventory")?.container;
    if (!container) return false;

    // ① 該当アイテムの合計所持数を数える
    let total = 0;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && filter(item)) {
            total += item.amount;
        }
    }

    const isFullClear = amount === undefined;
    const required = isFullClear ? 1 : amount;

    // ② 必要数に満たなければ何もせず false
    if (total < required) return false;

    // ③ 減らす個数を決定(全消去なら合計数)
    let remaining = isFullClear ? total : amount;
    const removedTarget = remaining; // 全消去モードで最終的に返す個数として保持

    // ④ 実際に減らす
    for (let i = 0; i < container.size && remaining > 0; i++) {
        const item = container.getItem(i);
        if (!item || !filter(item)) continue;

        if (item.amount <= remaining) {
            remaining -= item.amount;
            container.setItem(i); // スロットを空に
        } else {
            item.amount -= remaining;
            container.setItem(i, item);
            remaining = 0;
        }
    }

    return isFullClear ? removedTarget : true;
}

export function giveMenuItem(player:server.Player){
    const menu = new server.ItemStack("minecraft:compass")
    menu.setDynamicProperty(propertyIds.itemType,config.item_type.menu)
    player.addItem(menu)
}

export function giveSniper(player:server.Player){
    const sniper = new server.ItemStack("minecraft:spyglass")
    sniper.setDynamicProperty(propertyIds.itemType,config.item_type.sniper)
    player.addItem(sniper)
}

// -----------------------------------------------------------------------------
// フェーズ管理系
// -----------------------------------------------------------------------------
export function getNextPhase(current: PhaseId): PhaseId | undefined {
    const idx = phaseOrder.indexOf(current);
    return phaseOrder[idx + 1]; // 最後なら undefined
}

export function testMovePhase(phase:string){
    let prior = getGamePhase()
    if(!prior) return
    stopPhaseTimer(prior)
    server.system.runTimeout(() => {
        switch(phase){
        case phaseId.day:{
            triggerPreparationDayPhase()
            break
        }
        case phaseId.night:{
            triggerPreparationNightPhase()
            break
        }
        case phaseId.fight:{
            triggerFightPhase()
            break
        }
    }
    },21)
    
}


export function phaseTimer(name: string, F: () => void, limit: number): void {
    server.world.setDynamicProperty(`phase_timer:${name}`, limit + 1);

    const timerId = server.system.runInterval(() => {
        const now = server.world.getDynamicProperty(`phase_timer:${name}`);

        if (typeof now !== "number") {
            server.system.clearRun(timerId);
            server.world.setDynamicProperty(`phase_timer:${name}`, undefined);
            server.world.sendMessage(`フェーズタイマー[${name}]が停止しました。`);
            return;
        }

        if (!(now > 1)) {
            server.world.setDynamicProperty(`phase_timer:${name}`, undefined);
            server.system.clearRun(timerId);
            F();
            return;
        }

        server.world.setDynamicProperty(`phase_timer:${name}`, now - 1);
    }, 20);
}

export function stopPhaseTimer(name: string): void {
    // フェーズタイマーの残り時間に数字以外が入ると強制停止する仕様
    server.world.setDynamicProperty(`phase_timer:${name}`, "stop");
}

// -----------------------------------------------------------------------------
// フェーズ開始処理
// -----------------------------------------------------------------------------
export function alwaysFuncion(){
    const always = server.system.runInterval(() => {
        if(!getGamePhase()){
            server.system.clearRun(always)
            return
        }
        const spectators = server.world.getAllPlayers().filter(p => p.getDynamicProperty(propertyIds.playerTeam) === "spectator")
        if(!(spectators.length === 0)){
            for(const spc of spectators){
                spc.addEffect("night_vision",30,{showParticles:false})
                spc.setGameMode(server.GameMode.Spectator)
            }
        }
        for(const active of getAllActivePlayer()){
            if(active.hasTag(propertyIds.protectionFallTag) && active.isOnGround){
                active.removeTag(propertyIds.protectionFallTag)
            }
        }
        const playersOnDown = server.world.getAllPlayers().filter(p => p.hasTag(propertyIds.downTag))
        if(!(playersOnDown.length === 0)){
            for(const downed of playersOnDown){
                let remain = (downed.getDynamicProperty(propertyIds.playerRecoverdTime) ?? 0) as number
                let healer = downed.dimension.getPlayers({location:downed.location,maxDistance:4}).filter(p => (!p.hasTag(propertyIds.downTag) && (p.isSneaking)))
                if(healer.length === 0){
                    downed.setDynamicProperty(propertyIds.playerRecoverdTime,0)
                    downed.dimension.spawnParticle("minecraft:raid_omen_emitter",downed.location)
                    let downcount = (downed.getDynamicProperty(propertyIds.playerDownCount) ?? 0) as number
                    downed.addEffect("wither",3,{amplifier:downcount-1})
                    downed.addEffect("slowness",3,{amplifier:20})
                }else{
                    if(remain+5>=80){
                        playerRecoverFromDown(downed)
                    }

                    downed.removeEffect("wither")
                    downed.setDynamicProperty(propertyIds.playerRecoverdTime,remain+5)
                    downed.dimension.spawnParticle("minecraft:totem_manual",downed.location)
                    
                }
                
            }
        }
    })
}





export function triggerPreparationDayPhase(): void {
    setGamePhase(phaseId.day)
    server.world.gameRules.pvp = true;
    server.world.gameRules.doDayLightCycle = false;
    server.world.gameRules.doMobSpawning = true;
    server.world.gameRules.fallDamage = false;
    server.world.gameRules.fireDamage = false;
    server.world.gameRules.showTags = true;
    server.world.gameRules.tntExplodes = false;
    server.world.setDifficulty(server.Difficulty.Easy);
    server.world.setTimeOfDay(server.TimeOfDay.Day);
    for(const player of server.world.getAllPlayers()){
        libraryAPI.activateInfoBoard(player)
        libraryAPI.addDisplayInfo(player,`phase_timer:${getGamePhase()}`)
    }
    alwaysPreparationFunction();

    phaseTimer( 
        phaseId.day,
        triggerPreparationNightPhase,
        getSystemConfigValue("preparation_phase_day_time")
    );
    let players = getAllActivePlayer()
    for(const player of players){
        giveSniper(player)
        player.locatorBar.removeAllWaypoints()
        let team = new Set(players.filter(p => getTeam(p) == getTeam(player)))
        team.delete(player)
        let waytex = {lowerBound:0.5,texture:server.WaypointTexture.Square} as server.WaypointTextureBounds
        let array = {textureBoundsList:[waytex]} as server.WaypointTextureSelector
        for(const teamM of team){
            let teamMLocatorBar = new server.EntityWaypoint(teamM,array,{})
            player.locatorBar.addWaypoint(teamMLocatorBar)
        }
    }
}

export function alwaysPreparationFunction(): void {
    const intervalId = server.system.runInterval(() => {
        const currentPhase = getGamePhase();
        if(!(typeof currentPhase == "string")) return
        if (!((currentPhase === phaseId.day)||(currentPhase === phaseId.night))) {
            server.system.clearRun(intervalId);
            return;
        }
        for (const player of getAllActivePlayer()) {
            player.addEffect("night_vision", 30, { showParticles: false });
            player.addEffect("conduit_power", 2, { showParticles: false });
        }
    }, 10);
}

export function triggerPreparationNightPhase(): void {
    setGamePhase(phaseId.night)
    server.world.gameRules.pvp = true;
    server.world.gameRules.doDayLightCycle = false;
    server.world.gameRules.doMobSpawning = true;
    server.world.gameRules.fallDamage = false;
    server.world.gameRules.fireDamage = false;
    server.world.gameRules.showTags = true;
    server.world.gameRules.tntExplodes = false;
    server.world.setDifficulty(server.Difficulty.Hard);
    server.world.setTimeOfDay(server.TimeOfDay.Night);
    let players = getAllActivePlayer()
    for(const player of players){
        libraryAPI.activateInfoBoard(player)
        libraryAPI.addDisplayInfo(player,`phase_timer:${getGamePhase()}`)
        
    }
    phaseTimer( 
        phaseId.night,
        triggerFightPhase,
        getSystemConfigValue("preparation_phase_night_time")
    );
}

export function triggerFightPhase(): void {
    setGamePhase(phaseId.fight)
    server.world.gameRules.pvp = true;
    server.world.gameRules.doDayLightCycle = false;
    server.world.gameRules.doMobSpawning = false;
    server.world.gameRules.fallDamage = false;
    server.world.gameRules.fireDamage = true;
    server.world.gameRules.showTags = false;
    server.world.gameRules.tntExplodes = true;
    server.world.setDifficulty(server.Difficulty.Peaceful);
    server.system.runTimeout(() =>{
        server.world.setDifficulty(server.Difficulty.Normal);
    },5)
    server.world.setTimeOfDay(server.TimeOfDay.Day);
    let players = getAllActivePlayer()
    for(const player of players){
        libraryAPI.activateInfoBoard(player)
        libraryAPI.addDisplayInfo(player,`phase_timer:${getGamePhase()}`)
        let base = getBasePoint(player) ?? getCenter() ?? {x:0,y:0,z:0} as server.Vector3
        player.teleport(base)
    }
    const center = getCenter()
    const diameter = getAreaDiameter()
    if(!(center&&diameter)) return
    worldBorder.setCenter({x:center.x,z:center.z})
    worldBorder.setSize(diameter)
    worldBorder.setActive(true)
    alwaysFightFunction()
    phaseTimer(
        phaseId.fight,
        triggerSuddenDeathPhase,
        getSystemConfigValue("fight_phase_time")

    )
}

export function alwaysFightFunction(){
    const center = getCenter()
    if(!(center)) return
    const loop = server.system.runInterval(() =>{
        const phase = getGamePhase()
        if(!((phase == "fight")||(phase == "suddenDeath"))){
            server.system.clearRun(loop)
            return
        }
        let players = getAllActivePlayer()
        for(const player of players){
            player.addEffect("night_vision",30)
            if(!isInsideArea(player.dimension,player.location)){
                if(server.system.currentTick  % 20 == 0){
                    player.applyDamage(2,{cause:server.EntityDamageCause.selfDestruct})
                    if(phase === "suddenDeath") player.applyDamage(2,{cause:server.EntityDamageCause.selfDestruct})
                }
            }
        }
    })

}

export function returnBasePoint(player:server.Player){
    player.getComponent("minecraft:health")?.resetToMaxValue
    for(const effect of player.getEffects()){
        player.removeEffect(effect.typeId)
    }
    player.extinguishFire()
    let locd = getBasePoint(player)
    if(!(locd)) return
    player.teleport({x:locd.x,y:locd.y,z:locd.z})
}

export function triggerSuddenDeathPhase(){}

// -----------------------------------------------------------------------------
// フォーム系
// -----------------------------------------------------------------------------
export async function showInvitationForm(player: server.Player) {
    const form = await new ActionFormBuilder()
        .title("参加フォーム")
        .button("赤チーム", "textures/items/dye_powder_red")
        .button("青チーム", "textures/items/dye_powder_blue")
        .button("黄チーム", "textures/items/dye_powder_yellow")
        .button("緑チーム", "textures/items/dye_powder_green")
        .button("白チーム", "textures/items/dye_powder_white")
        .button("黒チーム", "textures/items/dye_powder_black")
        .button("観戦", "textures/items/ender_eye")
        .show(player);

    if (form.canceled) return;

    if (form.selectedKey === "観戦") {
        player.setDynamicProperty(propertyIds.playerTeam, "spectator");
        return;
    }

    switch (form.selectedKey) {
        case "赤チーム":
            player.setDynamicProperty(propertyIds.playerTeam, "red");
            break;
        case "青チーム":
            player.setDynamicProperty(propertyIds.playerTeam, "blue");
            break;
        case "黄チーム":
            player.setDynamicProperty(propertyIds.playerTeam, "yellow");
            break;
        case "緑チーム":
            player.setDynamicProperty(propertyIds.playerTeam, "green");
            break;
        case "白チーム":
            player.setDynamicProperty(propertyIds.playerTeam, "white");
            break;
        case "黒チーム":
            player.setDynamicProperty(propertyIds.playerTeam, "black");
            break;
    }
}

export async function showMenuHome(player:server.Player){
    const result = await new ActionFormBuilder()
        .title("§lメニュー")
        .button("buy","§l§a特殊アイテム購入","textures/items/emerald")
        .button("exchange","§l§6弾丸の変換","textures/items/iron_nugget")
        .button("tp","§l§4味方にテレポート§r(準備中限定)","textures/items/ender_pearl")
        .button("home","§l§5拠点を現在地に設定","textures/items/oak_door")
        .button("hand","弾薬の譲渡","textures/items/minecart_chest")
        .show(player)

    if(result.canceled) return
    switch(result.selectedKey){
        case "buy":{
            showMenuItemBuyAlternative(player)
            break
        }
        case "exchange":{
            showMenuExchangeAlternative(player)
            break
        }
        case "tp":{
           showMenuTeleport(player)
            break
        }
        case "home":{
            setBasePoint(player)
            break
        }
        case "hand":{
            showMenuHandAlternative(player)
            break
        }
    }
}

export async function showMenuHandAlternative(player:server.Player){
    const team = getTeam(player)
    if(!team) return

    const members = getTeamMenbers(team).filter((member) => member !== player)
    if(members.length === 0){
        player.sendMessage("§c渡せる味方がいません。")
        return
    }

    const buttons: ActionButtonDef[] = members.map((member) => ({
        key: member.nameTag,
        text: `${member.nameTag} (${getAmmo(member) ?? 0}発)`,
        iconPath: "textures/items/arrow"
    }))

    const result = await new ActionFormBuilder()
        .title("§l弾薬を渡す相手を選択")
        .buttons(buttons)
        .show(player)

    if(result.canceled || result.selectedKey === undefined) return

    const taker = members.find((member) => member.nameTag === result.selectedKey)
    if(!taker){
        player.sendMessage("§c相手が見つかりませんでした。")
        return
    }

    showMenuHand(player, taker)
}

export async function showMenuHand(player:server.Player,taker:server.Player){
    const result = await new ModalFormBuilder()
        .title(`${taker.nameTag}へ弾薬を渡す`)
        .textField("amount", "渡す弾薬数")
        .toggle("all", "持っている弾薬をすべて渡す")
        .show(player)

    if(result.canceled) return

    const all = result.get("all")
    if(all){
        const ammo = getAmmo(player) ?? 0
        if(ammo <= 0){
            player.sendMessage("§c渡せる弾薬がありません。")
            return
        }
        handAmmo(player, taker, ammo)
        return
    }

    const rawAmount = Number(result.get("amount"))
    if(!(Number.isFinite(rawAmount) && rawAmount > 0)){
        player.sendMessage("§c0より大きい数字を入力してください。")
        return
    }

    const amount = Math.floor(rawAmount)
    if((getAmmo(player) ?? 0) < amount){
        player.sendMessage("§c弾薬が足りません。")
        return
    }

    handAmmo(player, taker, amount)
}


export async function showMenuItemBuy(player:server.Player,key:string){
    const item = getItemByKey(key);
    if(!item){
        player.sendMessage("§c指定されたアイテムは存在しません。")
        return;
    }

    const recipeText = item.recipe.length === 0
        ? "レシピ: なし"
        : item.recipe
            .map(({ itemId, amount }) => {
                const name = itemId.replace(/^minecraft:/, "");
                return `- ${name} x${amount}`;
            })
            .join("\n");

    const result = await new ActionFormBuilder()
        .title(`§l${item.name}を購入`)
        .body(`§f${item.description}\n\n§7レシピ\n${recipeText}`)
        .button("purchase", "§l§a購入する")
        .button("cancel", "§l§c戻る")
        .show(player)

    if(result.canceled || result.selectedKey === undefined) return;
    if(result.selectedKey !== "purchase"){
        showMenuItemBuyAlternative(player)
        return
    }

    const hasEnoughRecipe = item.recipe.every(({ itemId, amount }) => {
        let total = 0;
        const inventory = player.getComponent("inventory")?.container;
        if (!inventory) return false;

        for (let i = 0; i < inventory.size; i++) {
            const slotItem = inventory.getItem(i);
            if (slotItem && slotItem.typeId === itemId) {
                total += slotItem.amount;
            }
        }

        return total >= amount;
    });

    if (!hasEnoughRecipe) {
        player.sendMessage(`§c${item.name}の材料が足りません。レシピを確認してください。`)
        return;
    }

    for (const { itemId, amount } of item.recipe) {
        const removed = clearItem(player, (slotItem) => slotItem.typeId === itemId, amount);
        if (removed === false) {
            player.sendMessage(`§c${item.name}の購入に失敗しました。`)
            return;
        }
    }

    itemPurchase(key,player)
    player.sendMessage(`§a${item.name}を購入しました。`)
}

export async function showMenuItemBuyAlternative(player:server.Player){
    const buttons: ActionButtonDef[] = Object.entries(itemList).map(([key, data]) => ({
        key,
        text: `${data.name}`,
        iconPath: data.texturePass.replace(/^texture\//, "textures/")
    }));

    const result = await new ActionFormBuilder()
        .title("§l購入したいアイテムを選択")
        .buttons(buttons)
        .show(player)

    if(result.canceled || result.selectedKey === undefined) return;
    showMenuItemBuy(player, result.selectedKey);
}

export async function showMenuTeleport(player:server.Player){
    let buttons =[]
    let name = null
    let team = getTeam(player)
    if(!team) return 
    let menbers = getTeamMenbers(team)
    for(const teamM of menbers){
        name = {
            key:teamM.nameTag,
            text:teamM.nameTag
        } as ActionButtonDef
        buttons.push(name)
    }
    const result = await new ActionFormBuilder()
        .title("テレポート画面")
        .buttons(buttons)
        .show(player)
    if(result.canceled) return
    if(result.selectedKey === undefined) return
    if((getGamePhase() === "fight")||(getGamePhase() === "suddenDeath")) return
    player.teleport( menbers.filter(m => m.nameTag === result.selectedKey)[0].location)
    player.sendMessage(`§a${result.selectedKey}にテレポートしました。`)
    

} 

export async function showMenuExchangeAlternative(player:server.Player){
    let buttons = []
    let data = null
    for(const exchangeData of config.bullet_exchange_config){
        const itemName = exchangeData.itemId.replace(/^minecraft:/, "");
        data = {
            key:`${exchangeData.ID}`,
            text:`${exchangeData.name}(必要数:${exchangeData.require},弾薬:${exchangeData.reward})`,
            iconPath:`textures/items/${itemName}`
        } as ActionButtonDef
        buttons.push(data)
    }
    const result  =  await new ActionFormBuilder()
        .title("交換アイテム選択画面")
        .buttons(buttons)
        .show(player)
    if(result.canceled) return
    if(result.selectedKey === undefined) return
    showMenuExchange(player,result.selectedKey)
}


export async function showMenuExchange(player:server.Player,ID:string){
    const result = await new ModalFormBuilder()
        .title("交換")
        .textField("amount","個数")
        .toggle("all",`持っている${getBulletData(ID).name}をすべて置換`)
        .show(player)
    if(result.canceled) return
    if(result.get("all")){
        exchangeBullet(player,ID)
        return
    }
    let amount = Number(result.get("amount"))
    if(!(amount&&amount>0)){
        player.sendMessage("§cテキストフィードには0より大きい数字を入れてください")
        return
    }
    exchangeBullet(player,ID,amount)
}


export function showInvitationFormAll() {
    const players = server.world.getPlayers();
    for (const player of players) {
        showInvitationForm(player);
    }
}

// -----------------------------------------------------------------------------
// 弾丸変換・交換   
// -----------------------------------------------------------------------------
export const bulletExchangeEnum = config.bullet_exchange_config.map(data => data.ID)
export function getBulletData(ID:string){
    return config.bullet_exchange_config.filter(data => data.ID === ID)[0]
}

export function exchangeBullet(player:server.Player,ID:string,amount?:number){
    let data = config.bullet_exchange_config.filter(d => d.ID === ID)[0]
    let count = 0
    let container = player.getComponent("minecraft:inventory")?.container
    if(!(container)) return
        if(amount === undefined){
        let total = 0;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item && item.typeId === data.itemId) {
                total += item.amount;
            }
        }
        count = Math.floor(total/data.require)
    }else{
        count = amount
    }
    if(!(clearItem(player,(item) => item.typeId === data.itemId,count*data.require))){
        player.sendMessage("§cアイテムが足りません。")
        return
    }
    addBullet(player,count*data.reward)
}

export function addBullet(player:server.Player,amount:number){
    setAmmo(player,(getAmmo(player) ?? 0)+amount)
}

export function getAmmo(player:server.Player){
    const ammo = player.getDynamicProperty(propertyIds.playerAmmo)
    if(!(typeof ammo == "number")) return
    return ammo
}

export function setAmmo(player:server.Player,amount:number){
    player.setDynamicProperty(propertyIds.playerAmmo,amount)
}

export function removeAmmo(player:server.Player,amount:number){
    let now = (getAmmo(player) ?? 0)
    if(now < amount) return false
    setAmmo(player,(now - amount))
    return true

}

export function handAmmo(giver:server.Player,taker:server.Player,amount:number){
    if(!(removeAmmo(giver,amount))){
        giver.sendMessage(`§c指定した弾数を持っていません。`)
    }
    giver.sendMessage(`${taker.nameTag}に${amount}発の弾薬を渡しました`)
    addBullet(taker,amount)
    taker.sendMessage(`${giver.nameTag}から弾薬を${amount}発受け取りました。`)
}

// -----------------------------------------------------------------------------
// スナイパー
// -----------------------------------------------------------------------------


/**
 * 2点間に指定間隔でパーティクルを表示する
 */
export function spawnParticleLine(
    dimension: server.Dimension,
    start: server.Vector3,
    end: server.Vector3,
    particleId: string,
    spacing: number = 2
): void {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dz = end.z - start.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
 
    if (distance === 0) return
 
    const steps = Math.floor(distance / spacing)
 
    for (let i = 0; i <= steps; i++) {
        const t = (i * spacing) / distance
        const point: server.Vector3 = {
            x: start.x + dx * t,
            y: start.y + dy * t,
            z: start.z + dz * t
        }
        dimension.spawnParticle(particleId, point)
    }
}
 
/**
 * 視線方向にlengthブロック分進んだワールド座標を返す
 */
export function getPointAlongView(
    origin: server.Vector3,
    viewDirection: server.Vector3,
    length: number
): server.Vector3 {
    return {
        x: origin.x + viewDirection.x * length,
        y: origin.y + viewDirection.y * length,
        z: origin.z + viewDirection.z * length
    }
}
 
export function onSpyglassUse(player:server.Player,){
 
    const dimension = player.dimension
    const eyeLocation = player.getHeadLocation()
    const viewDirection = player.getViewDirection()
    const maxDistance = config.sniper_config.range
    const baseDamage = config.sniper_config.base_damage
    const headDamage = config.sniper_config.headshot_damage
    const suddenDeathMultiplier = config.sniper_config.sudden_death_multiplier
    //追加仕様:しゃがみでキャンセル
    if(player.isSneaking === true) return
    if(!(removeAmmo(player,1))) return
 
    const targetHit: server.EntityRaycastHit | undefined = player.getEntitiesFromViewDirection({
        maxDistance,
        ignoreBlockCollision: false
    })[0]
 
    if (targetHit?.entity) {
        const aimPoint = getPointAlongView(eyeLocation, viewDirection, targetHit.distance)
        const target = targetHit.entity
        let damage = baseDamage as number
        if(Math.abs(target.location.y - aimPoint.y) > 1.5){
            damage = headDamage
        }
        if(getGamePhase() === "suddenDeath"){
            damage = damage * suddenDeathMultiplier
        }
        if(target.getComponent("minecraft:equippable")?.getEquipment(server.EquipmentSlot.Head)?.getDynamicProperty(propertyIds.itemType) === config.item_type.helmet){
            damage = damage - config.item_config.iron_helmet_damage_reduction
        }
        target.applyDamage(damage,{cause:server.EntityDamageCause.selfDestruct})
        target.dimension.spawnParticle("minecraft:large_explosion", {
            x: target.location.x,
            y: target.location.y + 1,
            z: target.location.z
        })
 
        // エンティティの中心座標ではなく、実際にエイムした距離(targetHit.distance)を使って
        // 「何にも当たらなかった時」と同じ計算方法で軌跡の終点を出す
        
        spawnParticleLine(dimension, eyeLocation, aimPoint, "minecraft:endrod", 2)
    } else {
        // 透過ブロック(草・松明など)はすり抜け、液体ブロックには当たるようにする
        const blockHit: server.BlockRaycastHit | undefined = player.getBlockFromViewDirection({
            maxDistance,
            includeLiquidBlocks: !config.sniper_config.ignore_liquids,
            includePassableBlocks: !config.sniper_config.ignore_passable_block
        })
 
        if (blockHit) {
            // faceLocationはAPI 2.0.0以降ブロックの北西下角からの相対座標(0〜1)なので
            // block.locationに加算してワールド座標に変換する
            const blockOrigin = blockHit.block.location
            const pos: server.Vector3 = {
                x: blockOrigin.x + blockHit.faceLocation.x,
                y: blockOrigin.y + blockHit.faceLocation.y,
                z: blockOrigin.z + blockHit.faceLocation.z
            }
            spawnParticleLine(dimension, eyeLocation, pos, "minecraft:endrod", 2)
        } else {
            // 何にも当たらなかった場合、視線先40ブロックの位置とplayerの間に軌跡を表示
            const farPoint = getPointAlongView(eyeLocation, viewDirection, maxDistance)
            spawnParticleLine(dimension, eyeLocation, farPoint, "minecraft:endrod", 2)
        }
    }
}

export function itemPurchase(itemID:string,player:server.Player){
    const data = getItemByKey(itemID)
    if(!data) return
    switch(itemID){
        
        case "simple_tnt":{
            const tnt = new server.ItemStack("shot_surv:tnt")
            setCustomItemData(player,tnt,itemID)
            break
        }
        case "reinforced_iron_helmet":{
            const helmet = new server.ItemStack("minecraft:iron_helmet")
            setCustomItemData(player,helmet,itemID)
            break
        }
        case"rocket_booster":{
            const rocket = new server.ItemStack("minecraft:firework")
            setCustomItemData(player,rocket,itemID)
            break
        }
        case"totem_of_regeneration":{
            const item = new server.ItemStack("minecraft:totem_of_undying")
            setCustomItemData(player,item,itemID)
            break
        }
        case"sweet_apple":{
            const item = new server.ItemStack("minecraft:apple")
            setCustomItemData(player,item,itemID)
            break
        }
        case"ice_bomb":{
            const item = new server.ItemStack("minecraft:snowball")
            setCustomItemData(player,item,itemID)
            break
        }
        case"dirt_wall_hammer":{
            const item = new server.ItemStack("minecraft:wooden_axe")
            item.amount = 4
            setCustomItemData(player,item,itemID)
            break
        }
        
    }
}

export function setCustomItemData(player:server.Player,origin:server.ItemStack,itemID:string){
    const data = getItemByKey(itemID)
    if(!data) return
    origin.setDynamicProperty(propertyIds.itemType,itemID)
    origin.nameTag = data.name
    origin.setLore([data.description])
    player.addItem(origin)
}

export function rocketBooster(player:server.Player){
    const vector = {
        x:player.getViewDirection().x * config.item_config.rocket_booster_power,
        z:player.getViewDirection().z * config.item_config.rocket_booster_power
    } as server.VectorXZ
    player.applyKnockback(vector,config.item_config.rocket_booster_power)
}


// -----------------------------------------------------------------------------
// ダウン
// -----------------------------------------------------------------------------

export function playerDown(player:server.Player){
    player.addTag(propertyIds.downTag)
    let team = getTeam(player)
    if(team === undefined) return
    let livingPlayer = getTeamMenbers(team).filter(p => (!p.hasTag(propertyIds.downTag)))
    if(livingPlayer.length === 0){
        for(const menberM of getTeamMenbers(team)){
            playerRetire(menberM)
        }
        return
    }
    player.inputPermissions.setPermissionCategory(server.InputPermissionCategory.Movement,false)
    player.inputPermissions.setPermissionCategory(server.InputPermissionCategory.Jump,false)
    player.getComponent("minecraft:health")?.resetToMaxValue()
    let downcount = (player.getDynamicProperty(propertyIds.playerDownCount) ?? 0) as number +1
    player.setDynamicProperty(propertyIds.playerDownCount,(downcount))
    player.sendMessage("§cダウンしました")
    let menbers = new Set(getTeamMenbers(team))
    menbers.delete(player)
    for(const m of menbers){
        m.sendMessage(`§c${player.nameTag}がダウンしました`)
    }
}

export function playerRecoverFromDown(player:server.Player){
    player.removeTag(propertyIds.downTag)
    player.getComponent("minecraft:health")?.setCurrentValue(config.system_config.hp_after_recoverd)
    for(const effect of player.getEffects()){
        player.removeEffect(effect.typeId)
    }
    player.extinguishFire()
}
export function playerRetire(player:server.Player){
    const team = getTeam(player)
    if(!team) return
    player.setDynamicProperty(propertyIds.playerTeam,"spectator")
    player.setGameMode(server.GameMode.Spectator)
    player.inputPermissions.setPermissionCategory(server.InputPermissionCategory.Movement,true)
    player.inputPermissions.setPermissionCategory(server.InputPermissionCategory.Jump,true)
    let menbers = getTeamMenbers(team)
    if(menbers.length === 0){
        let set = parseSubListToSet((server.world.getDynamicProperty(propertyIds.activeTeamList) ?? "") as subList)
        set.delete(team)
        if(set.size <= 1){
            //ゲーム終了処理
            return
        }
        server.world.setDynamicProperty(propertyIds.activeTeamList,parseSetToSubList(set))
    }
    for(const teamM of getTeamMenbers(team)){
        teamM.sendMessage(`§c${player.nameTag}がリタイアしました。`)
    }
    player.kill()
}