import * as server from "@minecraft/server"
import { Config } from "./Paramaters"
import * as Function from "./runFunctions"

const param = Config.events

interface eventData {
    name:string,
    function:() =>void
    weight:number,
    description:string
}

export const eventList:Record<string,eventData> = {}

function registerEvent(id:string,data:eventData){
    eventList[id] = {
        name:data.name,
        function:data.function,
        weight:data.weight,
        description:data.description
    }
}

/*
データ定義
*/

registerEvent(`rush_to_doomsday`,{
    name:`RUSH TO DOOMSDAY`,
    function:() => {
        let decline_time = Config.events.rush_to_doomsday.decline_time
        for(const player of Function.getPlayer()){
            if((player.getDynamicProperty(Function.DynamicPropertyIds.limitTime) as number) >= decline_time){
                Function.addtime(player,-decline_time)
            }
        }
    },
    weight:1,
    description:`残り時間が30秒以上のプレイヤーの持ち時間を30秒減らす。全員とも30秒に満たなかった場合、イベント失敗になる。`
})

registerEvent(`full_replace`,{
    name:`FULL REPLACE`,
    function:() => {},
    weight:1,
    description:`プレイヤーをランダムに散開させる`
})

registerEvent(`pure_thunder`,{
    name:`PURE THUNDER`,
    function:() => {},
    weight:1,
    description:`全プレイヤーの位置に雷が落ちる。雷は５ダメージを与え、プレイヤーが持っている特殊効果をすべて消す`
})

registerEvent(`tidal_force`,{
    name:`TIDAL FORCE`,
    function:() => {},
    weight:1,
    description:`全プレイヤーに重力効果を付与する。重力効果はプレイヤーの落下速度を大幅に増加させ、ジャンプを不可能に、さらに移動速度を低下させる。`
})

registerEvent(`legendary_treasure`,{
    name:`LEGENDARY TREASURE`,
    function:() => {},
    weight:1,
    description:`マップ上に黄金の宝箱が生成される。`
})

registerEvent(`fly_away`,{
    name:`FLY AWAY`,
    function:() => {},
    weight:1,
    description:`全員を上空に打ち上げる`
})

registerEvent(`gold_rush`,{
    name:`GOLD RUSH`,
    function:() => {},
    weight:1,
    description:`ポイント獲得量が1.5倍になり、マップに倒すと1000Pゲットできる黄金のゾンビが出現する`
})

registerEvent(`center_gather`,{
    name:`CENTER GATHER`,
    function:() => {},
    weight:1,
    description:`全プレイヤーを中央に集める。`
})