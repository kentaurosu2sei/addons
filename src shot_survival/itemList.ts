import * as server from "@minecraft/server";
 
// -----------------------------------------------------------------------------
// 型定義
// -----------------------------------------------------------------------------
interface itemRecipe {
    itemId: string; // minecraft:xxx 形式のバニラID
    amount: number;
}
 
interface itemData {
    name: string;
    description: string;
    recipe: itemRecipe[];
    texturePass: string; // ※本来は texturePath ですが既存の型に合わせています
}
 
export const itemList: Record<string, itemData> = {};
 
export function getItemByKey(key: string): itemData | undefined {
    return itemList[key];
}

function registerItem(id: string, data: itemData): void {
    if (itemList[id]) {
        // 同一idの重複登録は事故りやすいので早期に検知する
        throw new Error(`item id "${id}" is already registered.`);
    }
    itemList[id] = {
        name: data.name,
        description: data.description,
        recipe: data.recipe,
        texturePass: data.texturePass,
    };
}

// -----------------------------------------------------------------------------
// 日本語材料名 → バニラアイテムID 対応表
// 弾丸候補・特殊アイテムのCSVで使われている材料名をここで一元管理する
// -----------------------------------------------------------------------------
export const materialItemIds = {
    火薬: "minecraft:gunpowder",
    鉄塊: "minecraft:iron_ingot",
    レッドストーン: "minecraft:redstone",
    矢: "minecraft:arrow",
    鉄のヘルメット: "minecraft:iron_helmet",
    石レンガ: "minecraft:stone_bricks",
    羽: "minecraft:feather",
    TNT: "minecraft:tnt",
    ダイアモンド: "minecraft:diamond",
    エメラルドブロック: "minecraft:emerald_block",
    金のインゴット: "minecraft:gold_ingot",
    りんご: "minecraft:apple",
    砂糖: "minecraft:sugar",
    青い氷: "minecraft:blue_ice",
    雪玉: "minecraft:snowball",
    木の斧: "minecraft:wooden_axe",
    土: "minecraft:dirt",
} as const;
 
// -----------------------------------------------------------------------------
// アイテム登録
// 材料構成は「特殊アイテム」CSVの各サブページ（簡易TNT・強化鉄ヘルメット等）を参照
// -----------------------------------------------------------------------------
registerItem("simple_tnt", {
    name: "簡易TNT",
    description: "指定箇所に起動済みのTNTを呼び出す。",
    texturePass: "texture/blocks/tnt_side",
    recipe: [
        { itemId: materialItemIds.火薬, amount: 3 },
        { itemId: materialItemIds.鉄塊, amount: 6 },
    ],
});
 
registerItem("reinforced_iron_helmet", {
    name: "強化鉄ヘルメット",
    description: "ヘッドショットを4ダメージ軽減する。",
    texturePass: "texture/items/iron_helmet",
    recipe: [
        { itemId: materialItemIds.鉄のヘルメット, amount: 1 },
        { itemId: materialItemIds.石レンガ, amount: 2 },
    ],
});
 
registerItem("rocket_booster", {
    name: "ロケットブースター",
    description:
        "視点のXZ方向に向けて大きく飛び上がり、次に受ける落下ダメージを1度だけ無効化する",
    texturePass: "texture/items/fireworks",
    recipe: [
        { itemId: materialItemIds.羽, amount: 2 },
        { itemId: materialItemIds.TNT, amount: 1 },
        { itemId: materialItemIds.ダイアモンド, amount: 1 },
    ],
});
 
registerItem("totem_of_regeneration", {
    name: "再生のトーテム",
    description:
        "非ダウン状態で体力が0になった時、ダウン状態になる代わりに回復効果を与える。試合毎に1回だけ発動できる。",
    texturePass: "texture/items/totem",
    recipe: [
        { itemId: materialItemIds.エメラルドブロック, amount: 1 },
        { itemId: materialItemIds.金のインゴット, amount: 4 },
    ],
});
 
registerItem("sweet_apple", {
    name: "甘いリンゴ",
    description: "体力を4回復する。クールタイム10秒",
    texturePass: "texture/items/apple",
    recipe: [
        { itemId: materialItemIds.りんご, amount: 1 },
        { itemId: materialItemIds.砂糖, amount: 8 },
    ],
});
 
registerItem("ice_bomb", {
    name: "こおりのつぶて",
    description:
        "雪玉を投げ、当たった場所から5m以内のプレイヤーを3秒間鈍足にする。直撃した場合は鈍足の代わりに3秒間行動不能になる。",
    texturePass: "texture/items/snowball",
    recipe: [
        { itemId: materialItemIds.青い氷, amount: 1 },
        { itemId: materialItemIds.雪玉, amount: 8 },
    ],
});
 
registerItem("dirt_wall_hammer", {
    name: "土壁ハンマー",
    description: "視点方向に3x3の土ブロックを設置する。4回まで使用可能。",
    texturePass: "texture/items/wood_axe",
    recipe: [
        { itemId: materialItemIds.木の斧, amount: 1 },
        { itemId: materialItemIds.土, amount: 10 },
    ],
});
