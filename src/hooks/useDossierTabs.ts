import { useId, type KeyboardEvent } from 'react';

export function useDossierTabs(activeTab: string) {
  const id = useId();
  const tabId = (name: string) => `${id}-tab-${name}`;
  const panelId = (name: string) => `${id}-panel-${name}`;

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="tab"]:not(:disabled)'));
    const current = tabs.findIndex((tab) => tab === event.target);
    if (current < 0) return;

    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = (current + tabs.length - 1) % tabs.length; break;
      case 'ArrowRight': next = (current + 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  }

  return {
    handleTabKeyDown,
    tabProps: (name: string) => ({
      id: tabId(name),
      role: 'tab',
      tabIndex: activeTab === name ? 0 : -1,
      'aria-selected': activeTab === name,
      'aria-controls': panelId(name),
    }),
    panelProps: (name: string) => ({
      id: panelId(name),
      role: 'tabpanel',
      tabIndex: 0,
      hidden: activeTab !== name,
      'aria-labelledby': tabId(name),
    }),
  };
}
