import useSWR, { SWRResponse, mutate } from 'swr';
import { DeepPartial } from 'utility-types';
import { StateCreator } from 'zustand/vanilla';

import { INBOX_SESSION_ID } from '@/const/session';
import { SESSION_CHAT_URL } from '@/const/url';
import { sessionService } from '@/services/session';
import { settingsSelectors, useGlobalStore } from '@/store/global';
import { SessionStore } from '@/store/session';
import {
  LobeAgentSession,
  LobeAgentSettings,
  LobeSessionType,
  LobeSessions,
} from '@/types/session';
import { merge } from '@/utils/merge';
import { setNamespace } from '@/utils/storeDebug';

import { initLobeSession } from './initialState';

const t = setNamespace('session');

const FETCH_SESSIONS_KEY = 'fetchSessions';

export interface SessionAction {
  /**
   * active the session
   * @param sessionId
   */
  activeSession: (sessionId: string) => void;
  /**
   * reset sessions to default
   */
  clearSessions: () => Promise<void>;
  /**
   * create a new session
   * @param agent
   * @returns sessionId
   */
  createSession: (agent?: DeepPartial<LobeAgentSettings>) => Promise<string>;

  /**
   * Pins or unpins a session.
   *
   * @param {string} id - The ID of the session to pin or unpin.
   * @param {boolean} [pinned] - Optional. If set to true, it pins the session. If set to false or omitted, it unpins the session.
   * @returns {Promise<void>} A promise that resolves when the session is successfully pinned or unpinned.
   */
  pinSession: (id: string, pinned?: boolean) => Promise<void>;

  /**
   * re-fetch the data
   */
  refreshSessions: () => Promise<void>;

  /**
   * remove session
   * @param id - sessionId
   */
  removeSession: (id: string) => void;

  switchBackToChat: () => void;

  /**
   * switch session url
   */
  switchSession: (sessionId?: string) => void;
  /**
   * A custom hook that uses SWR to fetch sessions data.
   */
  useFetchSessions: () => SWRResponse<any>;

  useSearchSessions: (keyword?: string) => SWRResponse<any>;
}

export const createSessionSlice: StateCreator<
  SessionStore,
  [['zustand/devtools', never]],
  [],
  SessionAction
> = (set, get) => ({
  activeSession: (sessionId) => {
    set({ activeId: sessionId }, false, t('activeSession'));
  },

  clearSessions: async () => {
    await sessionService.removeAllSessions();

    get().refreshSessions();
  },

  createSession: async (agent) => {
    const { switchSession, refreshSessions } = get();

    // 合并 settings 里的 defaultAgent
    const defaultAgent = merge(
      initLobeSession,
      settingsSelectors.defaultAgent(useGlobalStore.getState()),
    );

    const newSession: LobeAgentSession = merge(defaultAgent, agent);

    const id = await sessionService.createNewSession(LobeSessionType.Agent, newSession);
    await refreshSessions();

    switchSession(id);

    return id;
  },

  pinSession: async (sessionId, pinned) => {
    await sessionService.updateSessionGroup(sessionId, pinned ? 'pinned' : 'default');

    await get().refreshSessions();
  },

  refreshSessions: async () => {
    await mutate(FETCH_SESSIONS_KEY);
  },

  removeSession: async (sessionId) => {
    await sessionService.removeSession(sessionId);
    await get().refreshSessions();

    if (sessionId === get().activeId) {
      get().switchSession();
    }
  },

  switchBackToChat: () => {
    const { activeId, router } = get();

    const id = activeId || INBOX_SESSION_ID;

    get().activeSession(id);

    router?.push(SESSION_CHAT_URL(id, get().isMobile));
  },
  switchSession: (sessionId = INBOX_SESSION_ID) => {
    const { isMobile, router } = get();

    get().activeSession(sessionId);

    router?.push(SESSION_CHAT_URL(sessionId, isMobile));
  },

  useFetchSessions: () =>
    useSWR<LobeSessions>(FETCH_SESSIONS_KEY, sessionService.getSessions, {
      onSuccess: (data) => {
        set(
          {
            fetchSessionsLoading: false,
            sessions: data,
          },
          false,
          t('useFetchSessions/onSuccess', data),
        );
      },
    }),

  useSearchSessions: (keyword) =>
    useSWR<LobeSessions>(keyword, sessionService.searchSessions, {
      onSuccess: (data) => {
        set({ searchSessions: data }, false, t('useSearchSessions(success)', data));
      },
      revalidateOnFocus: false,
    }),
});
