import { Dimension, Player, RGB, VectorXZ, system, world } from "@minecraft/server";

/** 2D 軸平面上の矩形領域を表す */
class Volume2D {
    private cachedMax: VectorXZ | null = null;
    private cachedMin: VectorXZ | null = null;
    /** 始点（x,z） */
    readonly from: VectorXZ;
    /** 終点（x,z） */
    readonly to: VectorXZ;

    /**
     * @param from 矩形の片方の端
     * @param to   もう片方の端
     */
    constructor(from: VectorXZ, to: VectorXZ) {
        this.from = from;
        this.to = to;
    }

    /** 最大の座標を返す */
    getMax(): VectorXZ {
        if (!this.cachedMax) {
            const maxX = Math.max(this.from.x, this.to.x);
            const maxZ = Math.max(this.from.z, this.to.z);
            this.cachedMax = { x: maxX, z: maxZ };
        }
        return this.cachedMax;
    }

    /** 最小の座標を返す */
    getMin(): VectorXZ {
        if (!this.cachedMin) {
            const minX = Math.min(this.from.x, this.to.x);
            const minZ = Math.min(this.from.z, this.to.z);
            this.cachedMin = { x: minX, z: minZ };
        }
        return this.cachedMin;
    }

    /** 指定座標が領域内にあるかを判定する */
    isInside(location: VectorXZ) {
        const max = this.getMax();
        const min = this.getMin();
        return (
            location.x >= min.x && location.x <= max.x && location.z >= min.z && location.z <= max.z
        );
    }
}

export interface PlayerJoinBorderEvent {
    player: Player;
}

export interface PlayerLeaveBorderEvent {
    player: Player;
}

export interface TickOutsideEvent {
    player: Player;
    outsideTicks: number;
}

export interface BorderActivationChangedEvent {
    settingValue: boolean;
}

/** 任意のイベントシグナルの抽象基底クラス */
abstract class EventSignalBase<T> {
    /** 登録されたコールバック */
    protected callbacks = new Set<(arg0: T) => void>();

    /**
     * イベント購読
     * @throws 登録済みコールバックの重複登録時
     */
    subscribe(callback: (arg0: T) => void): void {
        if (this.callbacks.has(callback))
            throw new Error(`Callback already registered: ${callback.name || "<anonymous>"}`);
        this.callbacks.add(callback);
    }

    /**
     * 購読解除
     * @throws 未登録コールバック解除時
     */
    unsubscribe(callback: (arg0: T) => void): void {
        if (!this.callbacks.has(callback))
            throw new Error(`Callback not registered: ${callback.name || "<anonymous>"}`);
        this.callbacks.delete(callback);
    }
}

/** ボーダーのアクティブ状態が変化した時発火するイベントシグナル */
class BorderActivationChangedEventSignal extends EventSignalBase<BorderActivationChangedEvent> {
    constructor() {
        super();
        system.afterEvents.scriptEventReceive.subscribe((ev) => {
            if (ev.id !== "wb:borderActivationChanged") return;

            const { settingValue } = JSON.parse(ev.message);
            if (typeof settingValue !== "boolean") return;

            for (const callback of this.callbacks) callback({ settingValue });
        });
    }
}

/** プレイヤーが安地に入った時に発火するイベントシグナル */
class PlayerJoinBorderEventSignal extends EventSignalBase<PlayerJoinBorderEvent> {
    constructor() {
        super();
        system.afterEvents.scriptEventReceive.subscribe((ev) => {
            if (ev.id !== "wb:playerJoinBorder") return;

            const { playerId } = JSON.parse(ev.message);
            if (typeof playerId !== "string") return;

            const player = world.getEntity(playerId);
            if (!(player instanceof Player)) return;

            for (const callback of this.callbacks) callback({ player });
        });
    }
}

/** プレイヤーが安地外に出た時に発火するイベントシグナル */
class PlayerLeaveBorderEventSignal extends EventSignalBase<PlayerLeaveBorderEvent> {
    constructor() {
        super();
        system.afterEvents.scriptEventReceive.subscribe((ev) => {
            if (ev.id !== "wb:playerLeaveBorder") return;

            const { playerId } = JSON.parse(ev.message);
            if (typeof playerId !== "string") return;

            const player = world.getEntity(playerId);
            if (!(player instanceof Player)) return;

            for (const callback of this.callbacks) callback({ player });
        });
    }
}

/** プレイヤーが安地外にいる間毎Tick発火するイベントシグナル */
class TickOutsideEventSignal extends EventSignalBase<TickOutsideEvent> {
    constructor() {
        super();
        system.afterEvents.scriptEventReceive.subscribe((ev) => {
            if (ev.id !== "wb:playerOutside") return;

            const { playerId, outsideTicks } = JSON.parse(ev.message);
            if (typeof playerId !== "string" || typeof outsideTicks !== "number") return;

            const player = world.getEntity(playerId);
            if (!(player instanceof Player)) return;

            const arg = { player, outsideTicks };
            for (const callback of this.callbacks) callback(arg);
        });
    }
}

export type BorderState = "GROWING" | "SHRINKING" | "STATIONARY";
export interface BorderDamageSettings {
    /** ボーダーの基礎ダメージ */
    baseDamage: number;
    /** ボーダーのダメージ間隔 */
    damageInterval: number;
    /** ボーダーのダメージ増加量 */
    damageIncrease: number;
    /** ボーダーのダメージ増加間隔 */
    damageIncreaseInterval: number;
}

class WorldBorder {
    /** 安地内に入った時に発火するイベント */
    public readonly playerJoinBorderEvent = new PlayerJoinBorderEventSignal();
    /** 安地外にいる場合毎tick発火するイベント */
    public readonly tickOutsideEvent = new TickOutsideEventSignal();
    /** 安地外に出た時に発火するイベント */
    public readonly playerLeaveBorderEvent = new PlayerLeaveBorderEventSignal();
    /** ボーダーのアクティブ状態が変化した時に発火するイベント */
    public readonly borderActivationChangedEvent = new BorderActivationChangedEventSignal();

    private requestIdCounter = 0;
    private _dimension: Dimension | null = null;
    private get dimension(): Dimension {
        if (!this._dimension) this._dimension = world.getDimension("overworld");
        return this._dimension;
    }

    /** ボーダーがアクティブかどうかを取得する */
    async getIsActive(): Promise<boolean> {
        const raw = await this.sendRequest("get-IsActive");
        return raw === "true";
    }

    /** ボーダーサイズを取得する */
    async getSize(): Promise<number> {
        const rawSize = await this.sendRequest("get-Size");
        return Number(rawSize);
    }

    /** ボーダー中心座標を取得する */
    async getCenter(): Promise<VectorXZ> {
        const rawCenter = await this.sendRequest("get-Center");
        return JSON.parse(rawCenter);
    }

    /** 現在のボーダー色を取得する */
    async getColor(): Promise<RGB> {
        const rawColor = await this.sendRequest("get-Color");
        return JSON.parse(rawColor);
    }

    /** ボーダー状態別のカラー設定を取得する */
    async getStateColors(): Promise<Record<BorderState, RGB>> {
        const rawStateColors = await this.sendRequest("get-StateColors");
        return JSON.parse(rawStateColors);
    }

    /** ボーダーのダメージ設定を取得する */
    async getDamageSettings(): Promise<BorderDamageSettings> {
        const rawDamageSettings = await this.sendRequest("get-DamageSettings");
        return JSON.parse(rawDamageSettings);
    }

    /** ボーダーの基礎ダメージを取得する */
    async getBaseDamage(): Promise<number> {
        const damageSettings = await this.getDamageSettings();
        return damageSettings.baseDamage;
    }

    /** ボーダーのダメージ間隔を取得する */
    async getDamageInterval(): Promise<number> {
        const damageSettings = await this.getDamageSettings();
        return damageSettings.damageInterval;
    }

    /** ボーダーのダメージ増加量を取得する */
    async getDamageIncrease(): Promise<number> {
        const damageSettings = await this.getDamageSettings();
        return damageSettings.damageIncrease;
    }

    /** ボーダーのダメージ増加間隔を取得する */
    async getDamageIncreaseInterval(): Promise<number> {
        const damageSettings = await this.getDamageSettings();
        return damageSettings.damageIncreaseInterval;
    }

    /** ボーダーのvolumeを返す */
    async getVolume(): Promise<Volume2D> {
        const [size, center] = await Promise.all([this.getSize(), this.getCenter()]);
        const from = {
            x: center.x - size / 2,
            z: center.z - size / 2
        };
        const to = {
            x: center.x + size / 2,
            z: center.z + size / 2
        };
        return new Volume2D(from, to);
    }

    /** ボーダーのアクティブ状態を変更する */
    setActive(settingValue: boolean) {
        this.dimension.runCommand(`wb:set_active ${settingValue}`);
    }

    /** ボーダーサイズを変更する */
    setSize(size: number, time = 0) {
        this.dimension.runCommand(`wb:set_size ${size} ${time}`);
    }

    /** ボーダー中心座標を変更する */
    setCenter(location: VectorXZ, time = 0) {
        this.dimension.runCommand(`wb:set_center ${location.x} ${location.z} ${time}`);
    }

    /** 状態カラーを設定する */
    setStateColor(state: BorderState, color: RGB) {
        this.dimension.runCommand(
            `wb:set_color ${state} ${color.red} ${color.green} ${color.blue}`
        );
    }

    /** 状態カラーをデフォルトに戻す */
    resetStateColor(state: BorderState) {
        this.dimension.runCommand(`wb:reset_color ${state}`);
    }

    /**
     * 内部情報を取得するリクエストを送信します。
     * @param type リクエストタイプ
     * @returns 対応する情報
     */
    private sendRequest(type: string): Promise<string> {
        const requestId = `req-${this.requestIdCounter++}`;

        return new Promise((resolve) => {
            const handler = system.afterEvents.scriptEventReceive.subscribe((ev) => {
                if (ev.id !== "wb:response") return;
                if (ev.sourceType !== "Server") return;

                const [resId, payload] = ev.message.split("&", 2);
                if (resId === requestId) {
                    system.afterEvents.scriptEventReceive.unsubscribe(handler);
                    resolve(payload);
                }
            });
            system.sendScriptEvent(`wb:${type}`, requestId);
        });
    }
}

/** WorldBorder のシングルトン */
export const worldBorder = new WorldBorder();
