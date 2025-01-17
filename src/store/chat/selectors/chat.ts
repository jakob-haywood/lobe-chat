import { LobePluginType } from '@lobehub/chat-plugin-sdk';
import { t } from 'i18next';

import { DEFAULT_INBOX_AVATAR, DEFAULT_USER_AVATAR } from '@/const/meta';
import { INBOX_SESSION_ID } from '@/const/session';
import { chatHelpers } from '@/store/chat/helpers';
import { useGlobalStore } from '@/store/global';
import { useSessionStore } from '@/store/session';
import { agentSelectors } from '@/store/session/selectors';
import { ChatMessage } from '@/types/chatMessage';
import { merge } from '@/utils/merge';

import type { ChatStore } from '../store';

const getMeta = (message: ChatMessage) => {
  switch (message.role) {
    case 'user': {
      return {
        avatar: useGlobalStore.getState().settings.avatar || DEFAULT_USER_AVATAR,
      };
    }

    case 'system': {
      return message.meta;
    }

    case 'assistant': {
      return agentSelectors.currentAgentMeta(useSessionStore.getState());
    }

    case 'function': {
      // TODO: 后续改成将 plugin metadata 写入 message metadata 的方案
      return {
        avatar: '🧩',
        title: 'plugin-unknown',
      };
    }
  }
};

// 当前激活的消息列表
const currentChats = (s: ChatStore): ChatMessage[] => {
  if (!s.activeId) return [];

  return s.messages.map((i) => ({ ...i, meta: getMeta(i) }));
};

const initTime = Date.now();
// 针对新助手添加初始化时的自定义消息
const currentChatsWithGuideMessage = (s: ChatStore): ChatMessage[] => {
  const data = currentChats(s);

  const isBrandNewChat = data.length === 0;

  if (!isBrandNewChat) return data;

  const [activeId, isInbox] = [s.activeId, s.activeId === INBOX_SESSION_ID];
  const meta = agentSelectors.currentAgentMeta(useSessionStore.getState());

  const inboxMsg = t('inbox.defaultMessage', { ns: 'chat' });
  const agentSystemRoleMsg = t('agentDefaultMessageWithSystemRole', {
    name: meta.title || t('defaultAgent'),
    ns: 'chat',
    systemRole: meta.description,
  });
  const agentMsg = t('agentDefaultMessage', {
    id: activeId,
    name: meta.title || t('defaultAgent'),
    ns: 'chat',
  });

  const emptyInboxGuideMessage = {
    content: isInbox ? inboxMsg : !!meta.description ? agentSystemRoleMsg : agentMsg,
    createdAt: initTime,
    extra: {},
    id: 'default',
    meta: merge({ avatar: DEFAULT_INBOX_AVATAR }, meta),
    role: 'assistant',
    updatedAt: initTime,
  } as ChatMessage;

  return [emptyInboxGuideMessage];
};

const currentChatsWithHistoryConfig = (s: ChatStore): ChatMessage[] => {
  const chats = currentChats(s);
  const config = agentSelectors.currentAgentConfig(useSessionStore.getState());

  return chatHelpers.getSlicedMessagesWithConfig(chats, config);
};

const chatsMessageString = (s: ChatStore): string => {
  const chats = currentChatsWithHistoryConfig(s);
  return chats.map((m) => m.content).join('');
};

const getFunctionMessageProps =
  ({ plugin, content, id }: Pick<ChatMessage, 'plugin' | 'content' | 'id'>) =>
  (s: ChatStore) => ({
    arguments: plugin?.arguments,
    command: plugin,
    content,
    id: plugin?.identifier,
    loading: id === s.chatLoadingId,
    type: plugin?.type as LobePluginType,
  });

const getMessageById = (id: string) => (s: ChatStore) => {
  return s.messages.find((m) => m.id === id);
};

export const chatSelectors = {
  chatsMessageString,
  currentChats,
  currentChatsWithGuideMessage,
  currentChatsWithHistoryConfig,
  getFunctionMessageProps,
  getMessageById,
};
