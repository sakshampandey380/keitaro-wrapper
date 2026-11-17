import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ru';

const translations = {
  en: {
    appTitle: 'Keitaro Wrapper',
    appSubtitle: 'Executive Campaign & Stream Traffic Orchestrator',
    liveSandbox: 'Keitaro Live API Connected',
    tabSplit: 'Split Workspace',
    tabCreator: '1. Campaign Creator',
    tabEditor: '2. Campaign Editor',

    // Part 1: Campaign Creator
    creatorBadge: 'PART 1 • AUTOMATED PROVISIONING',
    creatorTitle: 'Campaign Creator',
    creatorDesc: 'Create a 2-stream campaign in Keitaro with automatic Geo-to-Google filtering and 100% Offer routing.',
    campaignNameLabel: 'Campaign Name',
    campaignNamePlaceholder: 'e.g. promo_latam_01',
    autoPrefixHint: 'Auto-prefixed with',
    finalNamePreview: 'Final Keitaro Name:',
    geoLabel: 'Target Geo (ISO Country Codes)',
    geoPlaceholder: 'Type ISO code (e.g. AU, MX, US) and press Enter...',
    geoQuickSelect: 'Quick Select Geo:',
    geoSelectedCount: 'selected',
    clearGeo: 'Clear',
    initialOfferLabel: 'Initial Offer (100% Weight in Flow 2)',
    offerSearchPlaceholder: 'Search offer by ID (e.g. 25327) or name (e.g. Flexacil)...',
    offerSearching: 'Searching Keitaro offers...',
    offerNoResults: 'No matching offers found in Keitaro',
    offerSelectedBadge: 'Selected Offer',
    changeOffer: 'Change',
    defaultsBoxTitle: 'Keitaro Provisioning Blueprint',
    defaultDomain: 'Domain:',
    defaultGroup: 'Group:',
    defaultSource: 'Traffic Source:',
    flow1PreviewTitle: 'Flow 1: Geo Filter Redirect',
    flow1PreviewDesc: 'Filters traffic from selected Geo and redirects via HTTP to https://google.com',
    flow2PreviewTitle: 'Flow 2: Main Offer Landings',
    flow2PreviewDesc: 'Routes remaining traffic to selected offer at 100% share weight',
    createCampaignBtn: 'Create Campaign in Keitaro',
    creatingCampaignBtn: 'Provisioning Campaign & 2 Flows...',
    validationNameRequired: 'Please enter a campaign name.',
    validationGeoRequired: 'Please select or enter at least one Geo country code.',
    validationOfferRequired: 'Please select an initial offer from the dropdown.',
    toastCampaignCreatedTitle: 'Campaign Created Successfully!',
    toastCampaignCreatedDesc: 'Provisioned in Keitaro with 2 streams and synced to PostgreSQL.',
    toastOpenInEditorBtn: 'Open in Campaign Editor →',

    // Part 2: Campaign Editor
    editorBadge: 'PART 2 • STREAM & WEIGHT MANAGER',
    editorTitle: 'Existing Campaign Editor',
    editorDesc: 'Sync streams from Keitaro, manage offer weights with Pin locks, soft-delete/restore offers, and push changes.',
    selectCampaignLabel: 'Select Campaign',
    campaignSearchPlaceholder: 'Filter campaigns by name, ID, or alias...',
    fetchStreamsBtn: 'Fetch Streams',
    fetchingStreamsBtn: 'Syncing with Keitaro...',
    localDbBadge: 'Synced in DB',
    remoteKeitaroBadge: 'Keitaro Live',
    unpublishedStreamsCount: 'unsaved',
    noCampaignSelectedTitle: 'Select a Campaign to Manage Streams',
    noCampaignSelectedDesc: 'Choose any campaign from the selector above and click "Fetch Streams", or create a new campaign on the left.',
    streamsFound: 'Streams in Campaign',
    campaignIdLabel: 'Keitaro ID:',
    aliasLabel: 'Alias:',
    geoTagLabel: 'Geo:',

    // Stream Cards
    redirectIgnoredBadge: 'Redirect / No Offers (Ignored)',
    redirectIgnoredSub: 'Non-offer flow — redirect URLs and filters are intentionally hidden.',
    syncedBadge: 'Synced with Keitaro',
    unpublishedBadge: 'Unpublished Changes',
    pushToKeitaroBtn: 'Push to Keitaro',
    pushingBtn: 'Pushing...',
    cancelChangesBtn: 'Cancel',
    cancellingBtn: 'Reverting...',
    trafficDistributionLabel: 'Live Traffic Split Distribution',
    totalWeightLabel: 'Total Active Share:',
    activeOffersCount: 'Active Offers',
    removedOffersCount: 'Removed / Archived',
    addOfferSectionLabel: 'Add Offer to Stream',
    addOfferBtn: 'Add Offer',
    addingOfferBtn: 'Adding...',

    // Offer Row
    pinnedLabel: 'Pinned',
    pinWeightTooltip: 'Lock this offer weight percentage',
    unpinWeightTooltip: 'Unlock offer weight (auto-distribute)',
    customWeightLabel: 'Locked %:',
    removeOfferBtn: 'Remove',
    bringBackBtn: 'Bring Back',
    archivedBadge: 'Archived / Removed',
    newUnpublishedBadge: 'New (Unpublished)',
    wasShareLabel: 'Published:',
    noOffersInStream: 'No offers in this stream yet. Use the search bar below to add one.',

    // Mobile Sticky Bar
    mobileUnsavedBannerTitle: 'stream(s) have unpublished changes',
    mobilePushAllBtn: 'Push Stream Changes',
    mobileCancelAllBtn: 'Cancel Changes',

    // Toasts
    toastStreamsFetchedTitle: 'Streams Synced from Keitaro',
    toastStreamsFetchedDesc: 'Local database updated with live stream state and deletion rules.',
    toastOfferAddedTitle: 'Offer Added (Unpublished)',
    toastOfferAddedDesc: 'Traffic weights recalculated. Click "Push to Keitaro" to publish.',
    toastOfferRemovedTitle: 'Offer Marked as Removed',
    toastOfferRemovedDesc: 'Weight set to 0%. You can bring it back anytime or push to Keitaro.',
    toastOfferRestoredTitle: 'Offer Restored to Active',
    toastOfferRestoredDesc: 'Traffic weights automatically balanced across active offers.',
    toastStreamPushedTitle: 'Published to Keitaro!',
    toastStreamPushedDesc: 'Active offers and shares updated in Keitaro. Removed offers archived locally.',
    toastStreamCancelledTitle: 'Changes Reverted',
    toastStreamCancelledDesc: 'Stream restored to last published Keitaro snapshot.',
    toastErrorTitle: 'Operation Failed',
  },
  ru: {
    appTitle: 'Keitaro Wrapper',
    appSubtitle: 'Панель управления кампаниями и потоками Keitaro',
    liveSandbox: 'Keitaro API Подключен',
    tabSplit: 'Две панели',
    tabCreator: '1. Создаватор кампаний',
    tabEditor: '2. Редактор кампаний',

    // Part 1: Campaign Creator
    creatorBadge: 'ЧАСТЬ 1 • АВТОМАТИЧЕСКОЕ СОЗДАНИЕ',
    creatorTitle: 'Создаватор кампаний',
    creatorDesc: 'Создание кампании в Keitaro с 2 потоками: гео-редирект на Google и поток с выбранным оффером (100% вес).',
    campaignNameLabel: 'Название кампании',
    campaignNamePlaceholder: 'например: promo_latam_01',
    autoPrefixHint: 'Авто-префикс:',
    finalNamePreview: 'Итоговое имя в Keitaro:',
    geoLabel: 'Гео (ISO-коды стран)',
    geoPlaceholder: 'Введите ISO-код (AU, MX, US) и нажмите Enter...',
    geoQuickSelect: 'Быстрый выбор гео:',
    geoSelectedCount: 'выбрано',
    clearGeo: 'Очистить',
    initialOfferLabel: 'Оффер (100% трафика во 2-м потоке)',
    offerSearchPlaceholder: 'Поиск по ID (напр. 25327) или названию (напр. Flexacil)...',
    offerSearching: 'Поиск офферов в Keitaro...',
    offerNoResults: 'Офферы по запросу не найдены',
    offerSelectedBadge: 'Выбранный оффер',
    changeOffer: 'Изменить',
    defaultsBoxTitle: 'Параметры создания в Keitaro',
    defaultDomain: 'Домен:',
    defaultGroup: 'Группа:',
    defaultSource: 'Источник:',
    flow1PreviewTitle: 'Поток 1: Гео-фильтр → Google',
    flow1PreviewDesc: 'Перехватывает выбранное Гео и перенаправляет (HTTP Redirect) на https://google.com',
    flow2PreviewTitle: 'Поток 2: Основной поток оффера',
    flow2PreviewDesc: 'Направляет весь остальной трафик на выбранный оффер с весом 100%',
    createCampaignBtn: 'Создать кампанию в Keitaro',
    creatingCampaignBtn: 'Создание кампании и 2 потоков...',
    validationNameRequired: 'Пожалуйста, введите название кампании.',
    validationGeoRequired: 'Выберите или введите хотя бы один ISO-код страны (Гео).',
    validationOfferRequired: 'Пожалуйста, выберите оффер из выпадающего списка.',
    toastCampaignCreatedTitle: 'Кампания успешно создана!',
    toastCampaignCreatedDesc: 'Создана в Keitaro с 2 потоками и сохранена в PostgreSQL.',
    toastOpenInEditorBtn: 'Открыть в редакторе →',

    // Part 2: Campaign Editor
    editorBadge: 'ЧАСТЬ 2 • УПРАВЛЕНИЕ ПОТОКАМИ И ВЕСАМИ',
    editorTitle: 'Редактор существующей кампании',
    editorDesc: 'Загрузка потоков из Keitaro, управление весами (Pin), мягкое удаление и возврат офферов, публикация в Keitaro.',
    selectCampaignLabel: 'Выберите кампанию',
    campaignSearchPlaceholder: 'Поиск кампании по имени, ID или алиасу...',
    fetchStreamsBtn: 'Загрузить потоки',
    fetchingStreamsBtn: 'Синхронизация с Keitaro...',
    localDbBadge: 'В локальной БД',
    remoteKeitaroBadge: 'Keitaro Live',
    unpublishedStreamsCount: 'не сохр.',
    noCampaignSelectedTitle: 'Выберите кампанию для редактирования потоков',
    noCampaignSelectedDesc: 'Выберите существующую кампанию сверху и нажмите «Загрузить потоки» или создайте новую слева.',
    streamsFound: 'Потоки кампании',
    campaignIdLabel: 'Keitaro ID:',
    aliasLabel: 'Алиас:',
    geoTagLabel: 'Гео:',

    // Stream Cards
    redirectIgnoredBadge: 'Редирект / Без офферов (Игнорируется)',
    redirectIgnoredSub: 'Поток без офферов — URL редиректа и фильтры скрыты согласно ТЗ.',
    syncedBadge: 'Синхронизировано',
    unpublishedBadge: 'Неопубликованные изменения',
    pushToKeitaroBtn: 'Push в Keitaro',
    pushingBtn: 'Отправка...',
    cancelChangesBtn: 'Отмена',
    cancellingBtn: 'Сброс...',
    trafficDistributionLabel: 'Распределение долей трафика',
    totalWeightLabel: 'Сумма активных долей:',
    activeOffersCount: 'Активных офферов',
    removedOffersCount: 'Удаленных (в архиве)',
    addOfferSectionLabel: 'Добавить оффер в поток',
    addOfferBtn: 'Добавить',
    addingOfferBtn: 'Добавление...',

    // Offer Row
    pinnedLabel: 'Закреплен',
    pinWeightTooltip: 'Закрепить процент трафика за этим оффером',
    unpinWeightTooltip: 'Открепить вес (авто-распределение)',
    customWeightLabel: 'Фикс %:',
    removeOfferBtn: 'Удалить',
    bringBackBtn: 'Вернуть',
    archivedBadge: 'Удален (0%)',
    newUnpublishedBadge: 'Новый (Не опубл.)',
    wasShareLabel: 'В Keitaro:',
    noOffersInStream: 'В этом потоке нет офферов. Добавьте оффер через поиск ниже.',

    // Mobile Sticky Bar
    mobileUnsavedBannerTitle: 'поток(а) имеют неопубликованные изменения',
    mobilePushAllBtn: 'Push в Keitaro',
    mobileCancelAllBtn: 'Отмена',

    // Toasts
    toastStreamsFetchedTitle: 'Потоки загружены из Keitaro',
    toastStreamsFetchedDesc: 'Локальная БД синхронизирована с учетом правил сохранения удаленных офферов.',
    toastOfferAddedTitle: 'Оффер добавлен (Черновик)',
    toastOfferAddedDesc: 'Веса пересчитаны. Нажмите «Push в Keitaro» для сохранения.',
    toastOfferRemovedTitle: 'Оффер помечен как удаленный',
    toastOfferRemovedDesc: 'Вес равен 0%. Вы можете вернуть его кнопкой «Вернуть» в любой момент.',
    toastOfferRestoredTitle: 'Оффер восстановлен',
    toastOfferRestoredDesc: 'Доли трафика автоматически пересчитаны между активными офферами.',
    toastStreamPushedTitle: 'Опубликовано в Keitaro!',
    toastStreamPushedDesc: 'Активные офферы отправлены в Keitaro. Удаленные офферы сохранены локально.',
    toastStreamCancelledTitle: 'Изменения отменены',
    toastStreamCancelledDesc: 'Состояние потока возвращено к последней опубликованной версии.',
    toastErrorTitle: 'Ошибка операции',
  },
};

export type TranslationKeys = typeof translations.en;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ru',
  setLang: () => {},
  t: translations.ru,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('keitaro_wrapper_lang');
    return saved === 'en' || saved === 'ru' ? saved : 'ru';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('keitaro_wrapper_lang', newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
