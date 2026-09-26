/**
 * ModalFormBuilder
 * @minecraft/server-ui v2.x 向け ModalFormData / ActionFormData ラッパーライブラリ (TypeScript版)
 *
 * 使い方:
 *   import { ModalFormBuilder, ActionFormBuilder } from "./ModalFormBuilder.js";
 */

import { Player } from "@minecraft/server";
import {
  ActionFormData,
  ActionFormResponse,
  FormCancelationReason,
  ModalFormData,
  ModalFormResponse,
} from "@minecraft/server-ui";

// ─── Options 型（公式APIに合わせた定義） ─────────────────────────────────────

export interface TextFieldOptions {
  defaultValue?: string;
  tooltip?: string;
}

export interface ToggleOptions {
  defaultValue?: boolean;
  tooltip?: string;
}

export interface SliderOptions {
  valueStep?: number;
  defaultValue?: number;
  tooltip?: string;
}

export interface DropdownOptions {
  defaultValueIndex?: number;
  tooltip?: string;
}

// ─── フィールド定義型（fields() に渡す配列の要素） ───────────────────────────

export type FieldDef =
  | { type: "textField"; key: string; label: string; placeholder?: string; options?: TextFieldOptions }
  | { type: "toggle";    key: string; label: string; options?: ToggleOptions }
  | { type: "slider";    key: string; label: string; min: number; max: number; options?: SliderOptions }
  | { type: "dropdown";  key: string; label: string; items: string[]; options?: DropdownOptions }
  | { type: "divider" };

// ─── 内部フィールド管理型 ─────────────────────────────────────────────────────

type InternalField =
  | { type: "textField"; key: string; def: { label: string; placeholder: string; options: TextFieldOptions } }
  | { type: "toggle";    key: string; def: { label: string; options: ToggleOptions } }
  | { type: "slider";    key: string; def: { label: string; min: number; max: number; options: SliderOptions } }
  | { type: "dropdown";  key: string; def: { label: string; items: string[]; options: DropdownOptions } }
  | { type: "divider" };

/**
 * response.formValues に対応する（＝プレイヤーの入力値を持つ）フィールドかどうか。
 * divider（今後 header / label を足す場合も同様）は表示専用の要素で、
 * ModalFormResponse.formValues には値が入らないため、ここで除外する。
 */
function hasValue(field: InternalField): field is Exclude<InternalField, { type: "divider" }> {
  return field.type !== "divider";
}

// ─── 型安全な get() のための型マジック ───────────────────────────────────────
//
// ModalFormBuilder に登録されたフィールドのキーと型を
// TypeScript が自動的に追跡するための仕組み。
//
// 例: .toggle("pvp", ...) を呼ぶと
//       TSchema = { pvp: boolean } が型として記録され、
//       result.get("pvp") の戻り値が boolean になる。

/** 各フィールドタイプが result.get() で返す値の型 */
type FieldValueType = {
  textField: string;
  toggle:    boolean;
  slider:    number;
  dropdown:  string;   // 選択肢の文字列に変換済み
};

/**
 * スキーマ型。ビルダーにフィールドを追加するたびに蓄積される。
 * { キー名: 値の型 } の形をとる。
 */
type Schema = Record<string, string | number | boolean>;

/**
 * dropdown の "_index" キーを追加するユーティリティ型
 * dropdown("team", ...) を登録すると "team" と "team_index" の両方が使えるようになる
 */
type WithDropdownIndex<K extends string, S extends Schema> =
  S & { [P in K]: string } & { [P in `${K}_index`]: number };

// ─── ModalFormBuilder ────────────────────────────────────────────────────────

/**
 * TSchema はビルダーにフィールドが追加されるたびに型が拡張されていく。
 * 最初は {} で、フィールドを追加するたびに { キー: 値の型 } が追記される。
 */
export class ModalFormBuilder<TSchema extends Schema = Record<never, never>> {
  #title = "";
  #fields: InternalField[] = [];

  // ── タイトル ──────────────────────────────────────────────────────────────

  title(title: string): this {
    this.#title = title;
    return this;
  }

  // ── フィールド追加 ────────────────────────────────────────────────────────

  /**
   * テキスト入力フィールドを追加する
   * result.get(key) の戻り値は string になる
   */
  textField<K extends string>(
    key: K,
    label: string,
    placeholder = "",
    options: TextFieldOptions = {}
  ): ModalFormBuilder<TSchema & Record<K, string>> {
    this.#fields.push({ type: "textField", key, def: { label, placeholder, options } });
    return this as unknown as ModalFormBuilder<TSchema & Record<K, string>>;
  }

  /**
   * トグルを追加する
   * result.get(key) の戻り値は boolean になる
   */
  toggle<K extends string>(
    key: K,
    label: string,
    options: ToggleOptions = {}
  ): ModalFormBuilder<TSchema & Record<K, boolean>> {
    this.#fields.push({ type: "toggle", key, def: { label, options } });
    return this as unknown as ModalFormBuilder<TSchema & Record<K, boolean>>;
  }

  /**
   * スライダーを追加する
   * result.get(key) の戻り値は number になる
   */
  slider<K extends string>(
    key: K,
    label: string,
    min: number,
    max: number,
    options: SliderOptions = {}
  ): ModalFormBuilder<TSchema & Record<K, number>> {
    this.#fields.push({ type: "slider", key, def: { label, min, max, options } });
    return this as unknown as ModalFormBuilder<TSchema & Record<K, number>>;
  }

  /**
   * ドロップダウンを追加する
   * result.get(key)         → string（選択肢の文字列）
   * result.get(key_index)   → number（選択されたインデックス）
   */
  dropdown<K extends string>(
    key: K,
    label: string,
    items: string[],
    options: DropdownOptions = {}
  ): ModalFormBuilder<WithDropdownIndex<K, TSchema>> {
    this.#fields.push({ type: "dropdown", key, def: { label, items, options } });
    return this as unknown as ModalFormBuilder<WithDropdownIndex<K, TSchema>>;
  }

  /**
   * セクション区切り線（divider）を追加する。
   * 表示専用の要素なので、値を持たず TSchema にも影響しない。
   * （@minecraft/server-ui v2.0.0-beta 以降で利用可能）
   */
  divider(): this {
    this.#fields.push({ type: "divider" });
    return this;
  }

  // ── まとめてフィールドを追加 ──────────────────────────────────────────────

  /**
   * FieldDef 配列を一括登録する。
   * ※ この方法ではTSchemaへの自動追記はされないため、
   *   result.get() の型は string | number | boolean になる。
   *   型安全が必要な場合はメソッドチェーンを使うこと。
   */
  fields(fieldDefs: FieldDef[]): this {
    for (const f of fieldDefs) {
      switch (f.type) {
        case "textField":
          this.#fields.push({
            type: "textField",
            key: f.key,
            def: { label: f.label, placeholder: f.placeholder ?? "", options: f.options ?? {} },
          });
          break;
        case "toggle":
          this.#fields.push({
            type: "toggle",
            key: f.key,
            def: { label: f.label, options: f.options ?? {} },
          });
          break;
        case "slider":
          this.#fields.push({
            type: "slider",
            key: f.key,
            def: { label: f.label, min: f.min, max: f.max, options: f.options ?? {} },
          });
          break;
        case "dropdown":
          this.#fields.push({
            type: "dropdown",
            key: f.key,
            def: { label: f.label, items: f.items, options: f.options ?? {} },
          });
          break;
        case "divider":
          this.#fields.push({ type: "divider" });
          break;
        default:
          // TypeScript の網羅チェック（never型）
          // もし FieldDef に新しい type が追加された場合コンパイルエラーになる
          const _exhaustive: never = f;
          throw new Error(`[ModalFormBuilder] 未知のフィールドタイプ: ${(_exhaustive as FieldDef).type}`);
      }
    }
    return this;
  }

  // ── ビルド & 表示 ─────────────────────────────────────────────────────────

  /** ModalFormData を組み立てて返す（表示はしない） */
  build(): ModalFormData {
    const form = new ModalFormData();
    form.title(this.#title);

    for (const field of this.#fields) {
      // ※ switch の外で field.def を取り出すと型の絞り込みが効かなくなるため、
      //   各 case の中でそれぞれ参照する
      switch (field.type) {
        case "textField": {
          const d    = field.def;
          const opts = Object.keys(d.options).length > 0 ? d.options : undefined;
          form.textField(d.label, d.placeholder, opts);
          break;
        }
        case "toggle": {
          const d    = field.def;
          const opts = Object.keys(d.options).length > 0 ? d.options : undefined;
          form.toggle(d.label, opts);
          break;
        }
        case "slider": {
          const d    = field.def;
          const opts = Object.keys(d.options).length > 0 ? d.options : undefined;
          form.slider(d.label, d.min, d.max, opts);
          break;
        }
        case "dropdown": {
          const d    = field.def;
          const opts = Object.keys(d.options).length > 0 ? d.options : undefined;
          form.dropdown(d.label, d.items, opts);
          break;
        }
        case "divider": {
          form.divider();
          break;
        }
      }
    }
    return form;
  }

  /**
   * フォームをプレイヤーに表示し、型安全な結果オブジェクトを返す
   *
   * @example
   * const result = await new ModalFormBuilder()
   *   .toggle("pvp", "PvP有効")
   *   .slider("volume", "音量", 0, 100)
   *   .show(player);
   *
   * if (result.canceled) return;
   * const pvp    = result.get("pvp");    // 型: boolean ← 自動で決まる！
   * const volume = result.get("volume"); // 型: number  ← 自動で決まる！
   */
  async show(player: Player): Promise<ModalFormResult<TSchema>> {
    const response = await this.build().show(player);
    return new ModalFormResult<TSchema>(response, this.#fields);
  }
}

// ─── ModalFormResult ─────────────────────────────────────────────────────────

export class ModalFormResult<TSchema extends Schema> {
  readonly canceled: boolean;
  readonly cancelationReason: FormCancelationReason | undefined;

  #map = new Map<string, string | number | boolean>();

  constructor(response: ModalFormResponse, fields: InternalField[]) {
    this.canceled          = response.canceled;
    this.cancelationReason = response.cancelationReason;

    if (!response.canceled && response.formValues) {
  response.formValues.forEach((raw, i) => {
    const field = fields[i]  // filterしない、元のfields配列をそのまま使う
    if (!field || field.type === "divider") return  // dividerはスキップ
    if (field.type === "dropdown") {
      this.#map.set(field.key, field.def.items[raw as number]);
      this.#map.set(field.key + "_index", raw as number);
    } else {
      this.#map.set(field.key, raw as string | number | boolean);
    }
  });
}
  }

  /**
   * キー名で値を取得する
   * TSchema によって戻り値の型が自動的に決まる
   *
   * @example
   * result.get("pvp")    // boolean
   * result.get("volume") // number
   * result.get("name")   // string
   */
  get<K extends keyof TSchema>(key: K): TSchema[K] | undefined {
    return this.#map.get(key as string) as TSchema[K] | undefined;
  }

  /**
   * 全フィールドをプレーンオブジェクトとして取得する
   */
  toObject(): Partial<TSchema> {
    return Object.fromEntries(this.#map) as Partial<TSchema>;
  }
}

// ─── ActionFormBuilder 用の型定義 ─────────────────────────────────────────────
//
// ActionFormData（ボタン形式のフォーム）は ModalFormData と違い、
// プレイヤーが押した「ボタンの index」しか結果に返ってこない
// （公式APIの ActionFormResponse.selection は number）。
//
// このラッパーでは、ボタンごとに任意の "key" を付けられるようにし、
// index ではなく key で結果を判定できるようにしている
// （ボタンの並び替えや文言変更に強くするため）。

/**
 * ActionFormBuilder.buttons() に渡す、ボタンの一括登録用の定義
 */
export type ActionButtonDef<K extends string = string> = {
  key: K;
  text: string;
  iconPath?: string;
};

/** ActionForm 内の要素（ボタン / 区切り線 / ヘッダー / ラベル） */
type InternalActionElement =
  | { type: "button"; key: string; text: string; iconPath?: string }
  | { type: "divider" }
  | { type: "header"; text: string }
  | { type: "label"; text: string };

/**
 * ActionFormResponse.selection（ボタンのindex）に対応する要素かどうか。
 * divider / header / label は表示専用でボタンとしてカウントされないため、
 * ここで除外してからでないと selection とのインデックス対応がずれる。
 */
function isActionButton(el: InternalActionElement): el is Extract<InternalActionElement, { type: "button" }> {
  return el.type === "button";
}

// ─── ActionFormBuilder ────────────────────────────────────────────────────────

/**
 * TKeys はビルダーに button() を追加するたびに広がっていくユニオン型。
 * result.selectedKey / result.isSelected() の引数を型安全にするために使う。
 *
 * @example
 * const result = await new ActionFormBuilder()
 *   .title("メニュー")
 *   .body("操作を選んでください")
 *   .button("teleport", "テレポート")
 *   .button("heal", "回復")
 *   .divider()
 *   .button("cancel", "キャンセル")
 *   .show(player);
 *
 * if (result.canceled) return;
 * if (result.isSelected("teleport")) {
 *   // ...
 * }
 * console.log(result.selectedKey); // "teleport" | "heal" | "cancel" | undefined ← 自動で決まる！
 */
export class ActionFormBuilder<TKeys extends string = never> {
  #title = "";
  #body: string | undefined;
  #elements: InternalActionElement[] = [];

  // ── タイトル / 本文 ───────────────────────────────────────────────────────

  title(title: string): this {
    this.#title = title;
    return this;
  }

  body(body: string): this {
    this.#body = body;
    return this;
  }

  // ── ボタン追加 ────────────────────────────────────────────────────────────

  /**
   * ボタンを追加する。
   *
   * @param key      結果判定用の識別子（表示テキストとは独立。result.selectedKey で使う）
   * @param text     ボタンに表示するテキスト
   * @param iconPath リソースパック内のアイコン画像パス（省略可）
   */
  button<K extends string>(key: K, text: string, iconPath?: string): ActionFormBuilder<TKeys | K> {
    this.#elements.push({ type: "button", key, text, iconPath });
    return this as unknown as ActionFormBuilder<TKeys | K>;
  }

  /**
   * セクション区切り線（divider）を追加する。
   * （@minecraft/server-ui v2.0.0-beta 以降で利用可能）
   */
  divider(): this {
    this.#elements.push({ type: "divider" });
    return this;
  }

  /**
   * 見出し（header）を追加する。label より強調された見た目で表示される。
   * （@minecraft/server-ui v2.0.0-beta 以降で利用可能）
   */
  header(text: string): this {
    this.#elements.push({ type: "header", text });
    return this;
  }

  /**
   * 表示専用のラベルテキストを追加する。
   * （@minecraft/server-ui v2.0.0-beta 以降で利用可能）
   */
  label(text: string): this {
    this.#elements.push({ type: "label", text });
    return this;
  }

  // ── まとめてボタンを追加 ──────────────────────────────────────────────────

  /**
   * ActionButtonDef 配列を一括登録する。
   * ※ この方法では TKeys への自動追記はされないため、
   *   result.selectedKey / isSelected() の型は string になる。
   *   型安全が必要な場合はメソッドチェーンを使うこと。
   */
  buttons(defs: ActionButtonDef[]): this {
    for (const d of defs) {
      this.#elements.push({ type: "button", key: d.key, text: d.text, iconPath: d.iconPath });
    }
    return this;
  }

  // ── ビルド & 表示 ─────────────────────────────────────────────────────────

  /** ActionFormData を組み立てて返す（表示はしない） */
  build(): ActionFormData {
    const form = new ActionFormData();
    form.title(this.#title);
    if (this.#body !== undefined) {
      form.body(this.#body);
    }

    for (const el of this.#elements) {
      switch (el.type) {
        case "button":
          form.button(el.text, el.iconPath);
          break;
        case "divider":
          form.divider();
          break;
        case "header":
          form.header(el.text);
          break;
        case "label":
          form.label(el.text);
          break;
      }
    }
    return form;
  }

  /**
   * フォームをプレイヤーに表示し、型安全な結果オブジェクトを返す
   */
  async show(player: Player): Promise<ActionFormResult<TKeys>> {
    const response = await this.build().show(player);
    return new ActionFormResult<TKeys>(response, this.#elements);
  }
}

// ─── ActionFormResult ────────────────────────────────────────────────────────

export class ActionFormResult<TKeys extends string = never> {
  readonly canceled: boolean;
  readonly cancelationReason: FormCancelationReason | undefined;
  /** プレイヤーが押したボタンのindex（公式APIそのまま。キャンセル時は undefined） */
  readonly selection: number | undefined;
  /** プレイヤーが押したボタンの key（キャンセル時は undefined） */
  readonly selectedKey: TKeys | undefined;

  constructor(response: ActionFormResponse, elements: InternalActionElement[]) {
    this.canceled          = response.canceled;
    this.cancelationReason = response.cancelationReason;
    this.selection          = response.canceled ? undefined : response.selection;

    if (!response.canceled && response.selection !== undefined) {
      // header / label / divider はボタンとしてカウントされないため、
      // ボタンだけを抽出してから selection とインデックスを揃える。
      const buttons = elements.filter(isActionButton);
      this.selectedKey = buttons[response.selection]?.key as TKeys | undefined;
    } else {
      this.selectedKey = undefined;
    }
  }

  /** 指定した key のボタンが選択されたかどうかを判定する（型安全） */
  isSelected(key: TKeys): boolean {
    return !this.canceled && this.selectedKey === key;
  }
}
