/**
 * command-builder.ts
 * Minecraft Bedrock Script API - カスタムコマンド簡易定義ライブラリ (TypeScript版)
 *
 * 使い方:
 *   import { cmd } from "./command-builder.js";
 *
 *   cmd("mypack:heal", "HPを全回復する")
 *     .permission("any")
 *     .noCheats()
 *     .handle((origin) => { ... })
 *     .register();
 *
 *   cmd("mypack:goto", "指定した場所にTP")
 *     .permission("any")
 *     .noCheats()
 *     .enum("mypack:place", ["spawn", "shop", "arena"] as const)
 *     .handle((origin, place) => {
 *       // place は "spawn" | "shop" | "arena" として推論される
 *     })
 *     .register();
 *
 * パラメータ型エイリアス一覧:
 *   公式名:      Boolean / EntitySelector / EntityType / Enum / Float /
 *                Integer / ItemType / BlockType / Location / PlayerSelector / String
 *   小文字:      boolean / entitySelector / entityType / float / integer /
 *                itemType / blockType / location / playerSelector / string
 *   短縮エイリアス: bool / int / entity / player
 */

import {
  CommandPermissionLevel,
  CustomCommandOrigin,
  CustomCommandParamType,
  CustomCommandStatus,
  system,
} from "@minecraft/server";

// ─── 基本型定義 ───────────────────────────────────────────────────────────────

/**
 * 権限レベルの文字列エイリアス（公式 CommandPermissionLevel に準拠）
 *
 * | エイリアス       | 値 | 実行できる対象                         |
 * |------------------|----|----------------------------------------|
 * | "any"            |  0 | 誰でも実行可能                         |
 * | "gameDirectors"  |  1 | OP全員（コマンドブロック含む）         |
 * | "admin"          |  2 | OP全員（コマンドブロック除く）         |
 * | "host"           |  3 | サーバーホストのみ                     |
 * | "owner"          |  4 | 専用サーバーのみ                       |
 */
export type PermissionLevel =
  | "any"
  | "gameDirectors"
  | "admin"
  | "host"
  | "owner";

/** パラメータ型の文字列エイリアス（公式 CustomCommandParamType に準拠） */
export type ParamTypeName =
  // --- 公式名（そのまま使える） ---
  | "Boolean"
  | "EntitySelector"
  | "EntityType"
  | "Enum"
  | "Float"
  | "Integer"
  | "ItemType"
  | "BlockType"
  | "Location"
  | "PlayerSelector"
  | "String"
  // --- 小文字エイリアス（利便性のため） ---
  | "boolean"
  | "entitySelector"
  | "entityType"
  | "float"
  | "integer"
  | "itemType"
  | "blockType"
  | "location"
  | "playerSelector"
  | "string"
  // --- よく使う短縮エイリアス ---
  | "bool"
  | "int"
  | "entity"
  | "player";

/** パラメータ型名 → 実際の値の型 のマッピング */
type ParamValueType<T extends ParamTypeName> =
  T extends "String"   | "string"                              ? string
  : T extends "Integer" | "integer" | "int"                   ? number
  : T extends "Float"   | "float"                             ? number
  : T extends "Boolean" | "boolean" | "bool"                  ? boolean
  : T extends "EntitySelector" | "entitySelector" | "entity"  ? import("@minecraft/server").Entity | import("@minecraft/server").Entity[]
  : T extends "PlayerSelector" | "playerSelector" | "player"  ? import("@minecraft/server").Player
  : T extends "EntityType"     | "entityType"                 ? import("@minecraft/server").EntityType
  : T extends "BlockType"      | "blockType"                  ? import("@minecraft/server").BlockType
  : T extends "ItemType"       | "itemType"                   ? import("@minecraft/server").ItemType
  : T extends "Location"       | "location"                   ? import("@minecraft/server").Vector3
  : never;

/** コマンドハンドラの戻り値型 */
export interface CommandResult {
  status: CustomCommandStatus;
  message?: string;
}

// ─── パラメータ定義の内部型 ──────────────────────────────────────────────────

interface ParamDef {
  name: string;
  type: CustomCommandParamType;
}

interface EnumDef {
  name: string;
  values: readonly string[];
}

// ─── 定数マップ ───────────────────────────────────────────────────────────────

const PERMISSION: Record<PermissionLevel, CommandPermissionLevel> = {
  any:           CommandPermissionLevel.Any,
  gameDirectors: CommandPermissionLevel.GameDirectors,
  admin:         CommandPermissionLevel.Admin,
  host:          CommandPermissionLevel.Host,
  owner:         CommandPermissionLevel.Owner,
};

const PARAM_TYPE: Record<ParamTypeName, CustomCommandParamType> = {
  // 公式名
  Boolean:        CustomCommandParamType.Boolean,
  EntitySelector: CustomCommandParamType.EntitySelector,
  EntityType:     CustomCommandParamType.EntityType,
  Enum:           CustomCommandParamType.Enum,
  Float:          CustomCommandParamType.Float,
  Integer:        CustomCommandParamType.Integer,
  ItemType:       CustomCommandParamType.ItemType,
  BlockType:      CustomCommandParamType.BlockType,
  Location:       CustomCommandParamType.Location,
  PlayerSelector: CustomCommandParamType.PlayerSelector,
  String:         CustomCommandParamType.String,
  // 小文字エイリアス
  boolean:        CustomCommandParamType.Boolean,
  entitySelector: CustomCommandParamType.EntitySelector,
  entityType:     CustomCommandParamType.EntityType,
  float:          CustomCommandParamType.Float,
  integer:        CustomCommandParamType.Integer,
  itemType:       CustomCommandParamType.ItemType,
  blockType:      CustomCommandParamType.BlockType,
  location:       CustomCommandParamType.Location,
  playerSelector: CustomCommandParamType.PlayerSelector,
  string:         CustomCommandParamType.String,
  // 短縮エイリアス
  bool:           CustomCommandParamType.Boolean,
  int:            CustomCommandParamType.Integer,
  entity:         CustomCommandParamType.EntitySelector,
  player:         CustomCommandParamType.PlayerSelector,
};

// ─── CommandBuilder ───────────────────────────────────────────────────────────
//
// ジェネリクス:
//   Mandatory … 必須パラメータの値の型タプル（順番通りに積み上がる）
//   Optional  … オプションパラメータの値の型タプル（省略時は undefined）
//
// 例: .param("x","int").param("name","string").optional("flag","bool")
//   → Mandatory = [number, string], Optional = [boolean]
//   → handle の引数: (origin, x: number, name: string, flag?: boolean)
//

export class CommandBuilder<
  Mandatory extends readonly unknown[] = [],
  Optional  extends readonly unknown[] = [],
> {
  readonly #name:           string;
  readonly #description:    string;
  #permission:              CommandPermissionLevel = CommandPermissionLevel.Any;
  #cheatsRequired:          boolean                = false;
  #mandatoryParams:         ParamDef[]             = [];
  #optionalParams:          ParamDef[]             = [];
  #enumDefs:                EnumDef[]              = [];
  #handler:                 (
    (origin: CustomCommandOrigin, ...args: [...Mandatory, ...Partial<Optional>]) => CommandResult | void
  ) | null = null;

  constructor(name: string, description: string) {
    this.#name        = name;
    this.#description = description;
  }

  // ── 権限 ──────────────────────────────────────────────────────────────────

  /** 実行に必要な権限レベルを設定します。 */
  permission(level: PermissionLevel): this {
    this.#permission = PERMISSION[level];
    return this;
  }

  /** チートなしで実行可能にします（デフォルト）。 */
  noCheats(): this {
    this.#cheatsRequired = false;
    return this;
  }

  /** チート（operator権限）が必要な設定にします。 */
  cheatsRequired(): this {
    this.#cheatsRequired = true;
    return this;
  }

  // ── 必須パラメータ ────────────────────────────────────────────────────────

  /**
   * 必須パラメータを追加します。
   * 型引数 T により handle() の対応引数の型が自動推論されます。
   */
  param<T extends ParamTypeName>(
    name: string,
    type: T,
  ): CommandBuilder<readonly [...Mandatory, ParamValueType<T>], Optional> {
    const next = this as unknown as CommandBuilder<
      readonly [...Mandatory, ParamValueType<T>],
      Optional
    >;
    next.#mandatoryParams = [...this.#mandatoryParams, { name, type: PARAM_TYPE[type] }];
    return next;
  }

  /**
   * Enum必須パラメータを追加します（enum定義も同時に登録）。
   * `values` に `as const` を付けると選択肢がリテラル型として推論されます。
   *
   * @example
   * .enum("mypk:mode", ["fast", "slow"] as const)
   * // → handle の引数は "fast" | "slow" として推論される
   */
  enum<const V extends readonly string[]>(
    enumName: string,
    values: V,
  ): CommandBuilder<readonly [...Mandatory, V[number]], Optional> {
    const next = this as unknown as CommandBuilder<
      readonly [...Mandatory, V[number]],
      Optional
    >;
    next.#enumDefs        = [...this.#enumDefs, { name: enumName, values }];
    next.#mandatoryParams = [
      ...this.#mandatoryParams,
      { name: enumName, type: CustomCommandParamType.Enum },
    ];
    return next;
  }

  // ── オプションパラメータ ──────────────────────────────────────────────────

  /**
   * オプションパラメータを追加します（省略時 undefined）。
   */
  optional<T extends ParamTypeName>(
    name: string,
    type: T,
  ): CommandBuilder<Mandatory, readonly [...Optional, ParamValueType<T>]> {
    const next = this as unknown as CommandBuilder<
      Mandatory,
      readonly [...Optional, ParamValueType<T>]
    >;
    next.#optionalParams = [...this.#optionalParams, { name, type: PARAM_TYPE[type] }];
    return next;
  }

  /**
   * オプションのEnumパラメータを追加します。
   */
  optionalEnum<const V extends readonly string[]>(
    enumName: string,
    values: V,
  ): CommandBuilder<Mandatory, readonly [...Optional, V[number]]> {
    const next = this as unknown as CommandBuilder<
      Mandatory,
      readonly [...Optional, V[number]]
    >;
    next.#enumDefs       = [...this.#enumDefs, { name: enumName, values }];
    next.#optionalParams = [
      ...this.#optionalParams,
      { name: enumName, type: CustomCommandParamType.Enum },
    ];
    return next;
  }

  // ── ハンドラ ──────────────────────────────────────────────────────────────

  /**
   * コマンド実行時のコールバックを設定します。
   *
   * - 引数の型は `.param()` / `.enum()` / `.optional()` の呼び出し順から自動推論されます。
   * - ワールドを変更する処理は必ず `system.run(() => { ... })` で包んでください。
   * - エラーを返す場合は `{ status: CustomCommandStatus.Failure, message: "..." }` を return します。
   */
  handle(
    fn: (
      origin: CustomCommandOrigin,
      ...args: [...Mandatory, ...{ [K in keyof Optional]: Optional[K] | undefined }]
    ) => CommandResult | void,
  ): this {
    // TypeScript上の型制約のため any でキャスト
    (this.#handler as unknown) = fn;
    return this;
  }

  // ── 登録 ─────────────────────────────────────────────────────────────────

  /**
   * コマンドを startup イベントに登録します。
   * `.handle()` を呼んでいない場合は例外を投げます。
   */
  register(): this {
    if (!this.#handler) {
      throw new Error(
        `[CommandBuilder] "${this.#name}": register() の前に handle() を呼んでください。`,
      );
    }

    const {
      name,
      description,
      permission,
      cheatsRequired,
      mandatoryParams,
      optionalParams,
      enumDefs,
      handler,
    } = {
      name:            this.#name,
      description:     this.#description,
      permission:      this.#permission,
      cheatsRequired:  this.#cheatsRequired,
      mandatoryParams: this.#mandatoryParams,
      optionalParams:  this.#optionalParams,
      enumDefs:        this.#enumDefs,
      handler:         this.#handler,
    };

    system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
      for (const { name: enumName, values } of enumDefs) {
        customCommandRegistry.registerEnum(enumName, [...values]);
      }

      customCommandRegistry.registerCommand(
        {
          name,
          description,
          permissionLevel:     permission,
          cheatsRequired,
          mandatoryParameters: mandatoryParams,
          optionalParameters:  optionalParams,
        },
        (origin, ...args) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = (handler as any)(origin, ...args);
          return result ?? { status: CustomCommandStatus.Success };
        },
      );
    });

    return this;
  }
}

// ─── ファクトリ関数 ───────────────────────────────────────────────────────────

/**
 * CommandBuilder を生成するファクトリ関数。
 *
 * @param name        コマンド名（例: "mypk:heal"）
 * @param description コマンドの説明文
 */
export function cmd(name: string, description: string): CommandBuilder {
  return new CommandBuilder(name, description);
}

export { PERMISSION, PARAM_TYPE };
