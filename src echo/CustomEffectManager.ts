/**
 * CustomEffectManager
 * ダイナミックプロパティを使ったカスタムエフェクトシステム
 * @minecraft/server v2.x
 *
 * 使い方:
 *   import { CustomEffectManager } from "./CustomEffectManager.js";
 *   CustomEffectManager.init(); // main.ts で最初に一度だけ呼ぶ
 */

import { Entity, system, world } from "@minecraft/server";

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/** エフェクト適用時の引数 */
export interface CustomEffectOptions {
  /** エフェクトの対象エンティティ */
  target: Entity;
  /** エフェクト名（スタック時は同じ名前を複数付与できる） */
  effectName: string;
  /** 持続時間（tick単位） */
  durationTick: number;
  /** 効果量（任意。用途は自由） */
  amplifier?: number;
  /** 継続中に呼ばれるコールバックのインターバル（tick単位、デフォルト: 20） */
  intervalTick?: number;
  /** 継続中コールバック */
  onTick?: (context: CustomEffectContext) => void;
  /** 終了時コールバック */
  onExpire?: (context: CustomEffectContext) => void;
}

/** コールバックに渡されるコンテキスト */
export interface CustomEffectContext {
  /** エフェクトの対象エンティティ */
  target: Entity;
  /** エフェクト名 */
  effectName: string;
  /** 効果量 */
  amplifier: number;
  /** 残り時間（tick） */
  remainingTick: number;
  /** このエフェクトのユニークID */
  instanceId: string;
}

/** ダイナミックプロパティに保存するエフェクトの状態 */
interface EffectState {
  instanceId: string;
  effectName: string;
  amplifier: number;
  remainingTick: number;
  intervalTick: number;
  /** 次に onTick を呼ぶまでの残りtick */
  nextIntervalTick: number;
}

// ─── 定数 ────────────────────────────────────────────────────────────────────

const DYNAMIC_PROP_KEY = "customEffects";

// ─── コールバック保持（ランタイムのみ。リロード時は再登録が必要） ─────────────

/** instanceId → コールバック */
const callbackRegistry = new Map<string, {
  onTick?:    (ctx: CustomEffectContext) => void;
  onExpire?:  (ctx: CustomEffectContext) => void;
}>();

// ─── ユーティリティ ───────────────────────────────────────────────────────────

/** シンプルなUUID生成（crypto非依存） */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** エンティティのダイナミックプロパティからエフェクト一覧を読む */
function readStates(entity: Entity): EffectState[] {
  try {
    const raw = entity.getDynamicProperty(DYNAMIC_PROP_KEY);
    if (typeof raw !== "string" || raw === "") return [];
    return JSON.parse(raw) as EffectState[];
  } catch {
    return [];
  }
}

/** エンティティのダイナミックプロパティにエフェクト一覧を書く */
function writeStates(entity: Entity, states: EffectState[]): void {
  if (states.length === 0) {
    entity.setDynamicProperty(DYNAMIC_PROP_KEY, "");
  } else {
    entity.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify(states));
  }
}

// ─── CustomEffectManager ─────────────────────────────────────────────────────

export class CustomEffectManager {

  // ── 初期化（main.ts で一度だけ呼ぶ） ────────────────────────────────────

  /**
   * tick監視を開始する。アドオン起動時に一度だけ呼ぶこと。
   *
   * @example
   * // main.ts
   * import { CustomEffectManager } from "./CustomEffectManager.js";
   * CustomEffectManager.init();
   */
  static init(): void {
    system.runInterval(() => {
      // 全エンティティを走査
      for(const entity of world.getAllPlayers()){
        entity.dimension.getEntities({maxDistance:30,location:entity.location}).forEach(e => CustomEffectManager._tick(e));
      }
    });
  }

  // ── エフェクト付与 ────────────────────────────────────────────────────────

  /**
   * エンティティにカスタムエフェクトを付与する
   *
   * @example
   * CustomEffectManager.apply({
   *   target: player,
   *   effectName: "burning",
   *   durationTick: 100,
   *   amplifier: 2,
   *   intervalTick: 20,
   *   onTick: ({ target, remainingTick }) => {
   *     target.applyDamage(1);
   *   },
   *   onExpire: ({ target }) => {
   *     target.sendMessage("§c燃焼が終了した");
   *   },
   * });
   */
  static apply(options: CustomEffectOptions): string {
    const {
      target,
      effectName,
      durationTick,
      amplifier       = 1,
      intervalTick    = 20,
      onTick,
      onExpire,
    } = options;

    const instanceId = generateId();

    // コールバックをランタイムに保持
    callbackRegistry.set(instanceId, { onTick, onExpire });

    // ダイナミックプロパティに状態を追記
    const states = readStates(target);
    states.push({
      instanceId,
      effectName,
      amplifier,
      remainingTick:    durationTick,
      intervalTick,
      nextIntervalTick: intervalTick,
    });
    writeStates(target, states);

    return instanceId; // 後から remove() する場合に使用
  }

  // ── エフェクト削除 ────────────────────────────────────────────────────────

  /**
   * instanceId を指定してエフェクトを即時削除する（onExpire は呼ばれない）
   */
  static remove(entity: Entity, instanceId: string): boolean {
    const states  = readStates(entity);
    const before  = states.length;
    const updated = states.filter(s => s.instanceId !== instanceId);
    if (updated.length === before) return false;
    writeStates(entity, updated);
    callbackRegistry.delete(instanceId);
    return true;
  }

  /**
   * 指定した effectName のエフェクトをすべて削除する（onExpire は呼ばれない）
   */
  static removeByName(entity: Entity, effectName: string): number {
    const states  = readStates(entity);
    const removed = states.filter(s => s.effectName === effectName);
    const updated = states.filter(s => s.effectName !== effectName);
    writeStates(entity, updated);
    for (const s of removed) callbackRegistry.delete(s.instanceId);
    return removed.length;
  }

  /**
   * エンティティの全カスタムエフェクトを削除する（onExpire は呼ばれない）
   */
  static removeAll(entity: Entity): void {
    const states = readStates(entity);
    for (const s of states) callbackRegistry.delete(s.instanceId);
    writeStates(entity, []);
  }

  // ── 参照 ─────────────────────────────────────────────────────────────────

  /**
   * エンティティが持つ全エフェクト状態を返す
   */
  static getEffects(entity: Entity): Readonly<EffectState>[] {
    return readStates(entity);
  }

  /**
   * 指定した effectName のエフェクトが付いているか
   */
  static hasEffect(entity: Entity, effectName: string): boolean {
    return readStates(entity).some(s => s.effectName === effectName);
  }

  // ── 内部tick処理 ─────────────────────────────────────────────────────────

  /** @internal */
  static _tick(entity: Entity): void {
    // エフェクトを持っていないエンティティはスキップ
    let states = readStates(entity);
    if (states.length === 0) return;

    let dirty   = false; // 変更があった場合のみ write する
    const expired: EffectState[] = [];

    states = states.map(state => {
      // 残り時間を減らす
      const updated: EffectState = {
        ...state,
        remainingTick:    state.remainingTick    - 1,
        nextIntervalTick: state.nextIntervalTick - 1,
      };
      dirty = true;

      // インターバルコールバック
      if (updated.nextIntervalTick <= 0) {
        updated.nextIntervalTick = state.intervalTick;
        const cb = callbackRegistry.get(state.instanceId);
        if (cb?.onTick) {
          try {
            cb.onTick({
              target:        entity,
              effectName:    state.effectName,
              amplifier:     state.amplifier,
              remainingTick: updated.remainingTick,
              instanceId:    state.instanceId,
            });
          } catch (e) {
            console.error(`[CustomEffect] onTick error (${state.effectName}):`, e);
          }
        }
      }

      return updated;
    });

    // 期限切れを分離
    const alive = states.filter(s => {
      if (s.remainingTick <= 0) {
        expired.push(s);
        return false;
      }
      return true;
    });

    // 期限切れのコールバックを呼ぶ
    for (const state of expired) {
      const cb = callbackRegistry.get(state.instanceId);
      if (cb?.onExpire) {
        try {
          cb.onExpire({
            target:        entity,
            effectName:    state.effectName,
            amplifier:     state.amplifier,
            remainingTick: 0,
            instanceId:    state.instanceId,
          });
        } catch (e) {
          console.error(`[CustomEffect] onExpire error (${state.effectName}):`, e);
        }
      }
      callbackRegistry.delete(state.instanceId);
    }

    if (dirty) writeStates(entity, alive);
  }
}
