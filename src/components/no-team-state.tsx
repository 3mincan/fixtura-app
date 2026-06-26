import { StatePanel } from '@/components/state-panel';
import { useTranslation } from '@/hooks/use-translation';

export function NoTeamState() {
  const { t } = useTranslation();

  return (
    <StatePanel
      variant="empty"
      title={t('noTeamSelectedTitle')}
      message={t('noTeamSelectedMessage')}
    />
  );
}
