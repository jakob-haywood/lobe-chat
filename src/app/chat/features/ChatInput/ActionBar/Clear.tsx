import { ActionIcon } from '@lobehub/ui';
import { Popconfirm } from 'antd';
import { Eraser } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';

import HotKeys from '@/components/HotKeys';
import { CLEAN_MESSAGE_KEY, PREFIX_KEY } from '@/const/hotkeys';
import { useChatStore } from '@/store/chat';
import { useFileStore } from '@/store/files';

const Clear = memo(() => {
  const { t } = useTranslation('setting');
  const [clearMessage] = useChatStore((s) => [s.clearMessage]);
  const [clearImageList] = useFileStore((s) => [s.clearImageList]);
  const hotkeys = [PREFIX_KEY, CLEAN_MESSAGE_KEY].join('+');

  const resetConversation = useCallback(() => {
    clearMessage();
    clearImageList();
  }, []);

  useHotkeys(hotkeys, resetConversation, {
    preventDefault: true,
  });

  return (
    <Popconfirm
      cancelText={t('cancel', { ns: 'common' })}
      okButtonProps={{ danger: true }}
      okText={t('ok', { ns: 'common' })}
      onConfirm={() => {
        resetConversation();
      }}
      placement={'topRight'}
      title={t('confirmClearCurrentMessages', { ns: 'chat' })}
    >
      <ActionIcon
        icon={Eraser}
        placement={'bottom'}
        title={(<HotKeys desc={t('clearCurrentMessages', { ns: 'chat' })} keys={hotkeys} />) as any}
      />
    </Popconfirm>
  );
});

export default Clear;
