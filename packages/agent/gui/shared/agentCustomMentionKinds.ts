import type { ReactNode } from "react";

// 自定义 mention kind 注册表:让宿主(如 tsh)从外部注册 mention://<kind>/... 链接的
// 解析与 composer 内 chip 渲染,包内不内置任何具体业务 kind。
//
// 管线接点:
// - 解析:agentFileMentionExtension.parseMentionItemFromHref 命中注册 kind 时产出
//   AgentMentionCustomItem(展示字段由 present() 提取;href 是完整信息源,round-trip 无损)
// - 渲染:AgentMentionNodeView 对 kind==="custom" 调 renderChip(),缺省用包内通用双行卡
// - 点击:clickable 的 kind 经 resolveWorkspaceMentionLinkAction 上抛
//   open-custom-mention 链接动作(携带原始 href,宿主自行二次解析)
//
// 注册时机:宿主渲染进程 bootstrap(早于首个 composer 挂载);模块级单例,重复注册以
// 后者为准(HMR 友好)。

export interface AgentCustomMentionIdentity {
  entityId: string;
  label: string;
  scope?: Readonly<Record<string, string>>;
}

export interface AgentCustomMentionPresentation {
  /** chip 第一行(缺省用链接 label)。 */
  name: string;
  /** chip 第二行(可选,通用双行卡的次要文案)。 */
  summary?: string;
  /** 所属 workspace(可选;custom kind 的 scope 键由注册方约定)。 */
  workspaceId?: string;
}

export interface AgentCustomMentionChipContext {
  href: string;
  name: string;
  summary?: string;
  isEditable: boolean;
  /** 可编辑态的移除按钮,由 NodeView 注入;自定义渲染需自行摆放。 */
  removeAction?: ReactNode;
}

export interface AgentCustomMentionKindDefinition {
  /** mention://<kind>/... 的 providerId(URL hostname,小写)。 */
  kind: string;
  /**
   * 从 canonical mention 链接提取展示字段;返回 null 表示链接无效,
   * 退化为普通链接/字面文本。
   */
  present(
    mention: AgentCustomMentionIdentity,
    href: string
  ): AgentCustomMentionPresentation | null;
  /** 自定义 chip 渲染;缺省用包内通用双行卡(name + summary)。 */
  renderChip?(context: AgentCustomMentionChipContext): ReactNode;
  /** 点击是否上抛 open-custom-mention 链接动作;缺省 false(chip 只展示)。 */
  clickable?: boolean;
}

const registry = new Map<string, AgentCustomMentionKindDefinition>();

export function registerAgentCustomMentionKind(
  definition: AgentCustomMentionKindDefinition
): void {
  const kind = definition.kind.trim().toLowerCase();
  if (!kind) {
    return;
  }
  registry.set(kind, definition);
}

export function getAgentCustomMentionKind(
  kind: string
): AgentCustomMentionKindDefinition | undefined {
  return registry.get(kind.trim().toLowerCase());
}

export function resetAgentCustomMentionKindsForTests(): void {
  registry.clear();
}
