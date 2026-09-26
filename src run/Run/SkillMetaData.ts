import {Config} from "./Paramaters"
const chaserParam = Config.chaserSkills
const runnerParam = Config.runnerSkills
/*
スキル定義ファイル
*/

export interface chaserSkillData {
    name:string,
    discription:string,
    type:"intaract"|"passive",
    coolDawn:number | false
}

export interface runnerSkillData {
    name:string,
    discription:string,
    type:"intaract"|"passive",
    defaultAmount:number | false
}

export const chaserSkills:Record<string,chaserSkillData> = {}

export const runnerSkills:Record<string,runnerSkillData> = {}

export function getChaserSkills(id:string){
    return chaserSkills[id]
}
export function isChaserPassive(id:string){
    if(chaserSkills[id].type == "passive"){
        return true
    }else{
        return false
    }
}
export function getRunnerSkills(id:string){
    return runnerSkills[id]
}
export function isRunnerPassive(id:string){
    if(runnerSkills[id].type == "passive"){
        return true
    }else{
        return false
    }
}

export const allSkills = {chaserSkills,runnerSkills}

function registerChaserData(id:string,data:chaserSkillData){
    chaserSkills[id] = {
        name:data.name,
        type:data.type,
        discription:data.discription,
        coolDawn:data.coolDawn
    }
}
function registerRunnerData(id:string,data:runnerSkillData){
    runnerSkills[id] = {
        name:data.name,
        type:data.type,
        discription:data.discription,
        defaultAmount:data.defaultAmount
    }
}

/*---------------------------------------------
チェイサースキル一覧
-----------------------------------------------*/
registerChaserData("anger",
    {
        "name":"ANGER",
        "type":"intaract",
        "discription":`${chaserParam.anger.duration}秒間攻撃力を上昇させる。`,
        "coolDawn":17
    }
)

registerChaserData("snipe",
    {
        "name":"SNIPE",
        "type":"intaract",
        "discription":`メッセージ「SNIPEが使用されました！ランナーは狙撃に警戒をしてください！」を表示し、自身に以下の強化効果を与える。弓による攻撃が命中したとき、${chaserParam.snipe.probability * 100}%の確率で対象を死なせる。この殺害はkillコマンドで行われ、あらゆる耐性を貫通する。`,
        "coolDawn":20
    }
)

registerChaserData("step",
    {
        "name":"STEP",
        "type":"intaract",
        "discription":"見ている方向に大きく加速度を与える。",
        "coolDawn":6
    }
)

registerChaserData("disappear",
    {
        "name":"DISAPPEAR",
        "type":"intaract",
        "discription":`一時的にアイテムを捨て、透明化、移動速度上昇、ジャンプ力上昇、攻撃力大幅低下を${chaserParam.disapper.duration}秒間付与する。バフ終了２秒前から使用者の位置に黒いパーティクルが表示され、バフ終了時に捨てたアイテムを再取得する。`,
        "coolDawn":30
    }
)

registerChaserData("echo",
    {
        "name":"ECHO",
        "type":"passive",
        "discription":`${chaserParam.echo.radius}メート内でランナープレイヤーがスニークを行わずに移動したときその位置にパーティクルを発生させる。この効果は敵に透明化、低速落下効果が付与されている場合無効化される`,
//10tickに１回したい処理を1tickのrunintervalスコープ内で行う場合、タイムスタンプを10で割ってあまりが0か確認すればいい
        "coolDawn":false
    }
)


registerChaserData("butcher",
    {
        "name":"BUTCHER",
        "type":"passive",
        "discription":`攻撃が命中した敵に${chaserParam.butcher.duration}秒間流血効果を付与する。効果中、対象者からは血のパーティクルが落ちるようになる`,
        "coolDawn":false
    }
)

/*---------------------------------------------
ランナースキル一覧
-----------------------------------------------*/

registerRunnerData("flash",
    {
        "name":"FLASH",
        "type":"intaract",
        "discription":`大きいパーティクルを伴った閃光を放ち、自分を除く${runnerParam.flash.radius}ｍ以内のプレイヤーを${runnerParam.flash.duration}秒間スタンさせる。${runnerParam.flash.radius}ｍ以内に他プレイヤーがいなければ自身が５秒間スタンする。`,
        "defaultAmount":2
    }
)


registerRunnerData("cross",
    {
        "name":"CROSS",
        "type":"intaract",
        "discription":`最も近いプレイヤーと自身の位置を交代する。${runnerParam.cross.reactivationTime}秒後に再度交代する。`,
        "defaultAmount":2
    }
)

registerRunnerData("soar",
    {
        "name":"SOAR",
        "type":"intaract",
        "discription":`${runnerParam.soar.duration}秒間続く上昇気流を発生させ、上へと飛び上がる。`,
        "defaultAmount":2
    }
)

registerRunnerData("deal",
    {
        "name":"DEAL",
        "type":"intaract",
        "discription":`${runnerParam.deal.duration}秒間自身の移動速度を大幅に上げる代わりに、自身にハート${runnerParam.deal.damage/2}個分のダメージを与える。`,
        "defaultAmount":1
    }
)

registerRunnerData("smash",
    {
        "name":"SMASH",
        "type":"passive",
        "discription":`落下中、または高速移動中に攻撃を与えたとき、対象に${runnerParam.smash.stanDuration}秒間のスタンを与える`,
        "defaultAmount":false
    }
)

registerRunnerData("escape",
    {
        "name":"ESCAPE",
        "type":"passive",
        "discription":"弓で撃たれたとき、移動速度が上昇する",
        "defaultAmount":false
    }
)

registerRunnerData("sprint",
    {
        "name":"SPRINT",
        "type":"passive",
        "discription":`ダッシュ中移動速度が上昇するが、ダメージを受けた後${runnerParam.sprint.coolDown}秒間は走れなくなる`,
        "defaultAmount":false
    }
)