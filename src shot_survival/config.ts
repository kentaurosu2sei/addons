import * as server from "@minecraft/server";

export interface bulletExchange{
    ID:string,
    name:string,
    itemId:string,
    require:number,
    reward:number
}

export const config ={
    system_config:{
        game_dimension:"overworld",
        center_position: { x: 0, y: 100, z: 0 } as server.Vector3,
        area_diameter:200,
        preparation_phase_day_time:300,
        preparation_phase_night_time:300,
        fight_phase_time:300,
        suddendeath_time:500,
        upper_limit:80,
        lower_limit:10,
        hp_after_recoverd:4
    },
    sniper_config:{
        range:40,
        base_damage:8,
        headshot_damage:15,
        sudden_death_multiplier:1.5,
        ignore_liquids:false,
        ignore_passable_block:true
    },
    item_config:{
        iron_helmet_damage_reduction:4,
        rocket_booster_power:3,
        sweet_apple_recovery_amount:4,
        ice_shard_binding_duration:3,
        totem_of_regeneration_recovery_amount:8
    },
    bullet_exchange_config:[
        {
            ID:"redstone",
            name:"レッドストーン",
            itemId:"minecraft:redstone",
            require:1,
            reward:1
        },
        {
            ID:"gunpowder",
            name:"火薬",
            itemId:"minecraft:gunpowder",
            require:2,
            reward:3
        },
        {
            ID:"iron_ingot",
            name:"鉄インゴット",
            itemId:"minecraft:iron_ingot",
            require:1,
            reward:1
        },
        {
            ID:"blaze_powder",
            name:"ブレイズパウダー",
            itemId:"minecraft:blaze_powder",
            require:1,
            reward:4
        },
        {
            ID:"ender_pearl",
            name:"エンダーパール",
            itemId:"minecraft:ender_pearl",
            require:1,
            reward:2
        }
    ] as bulletExchange[],
    item_type:{
        menu:"menu",
        rocket:"rocket_booster",
        sniper:"sniper",
        helmet:"reinforced_iron_helmet",
        tnt:"simple_tnt",
        totem:"totem_of_regeneration",
        apple:"sweet_apple",
        ice:"ice_bomb",
        hammer:"dirt_wall_hammer"
    }
} as const