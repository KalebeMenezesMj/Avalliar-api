import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, Locale, LOCALES, LOCALE_LABELS } from '../context/LanguageContext';
import { AuthResponse } from '../services/authService';
import { exportarLog, limparLog } from '../services/logService';

interface SettingsScreenProps {
  onBack: () => void;
  currentUser?: AuthResponse | null;
  onLogout?: () => void;
  onEditProfile?: () => void; // Added for profile editing navigation
}

type InfoModal = 'idioma' | 'sobre' | 'privacidade' | 'ajuda';

interface InfoBlock {
  title: string;
  body: string;
}

interface SettingsStrings {
  title: string;
  preferences: string;
  supportInfo: string;
  notifications: string;
  darkMode: string;
  language: string;
  about: string;
  privacy: string;
  help: string;
  logout: string;
  version: string;
  selectLanguage: string;
  selectLanguageHint: string;
  aboutTitle: string;
  aboutBody: string;
  versionRow: string;
  stackRow: string;
  copyright: string;
  privacyTitle: string;
  privacyIntro: string;
  privacyBlocks: InfoBlock[];
  helpTitle: string;
  helpIntro: string;
  helpBlocks: InfoBlock[];
}

const STRINGS: Record<Locale, SettingsStrings> = {
  'pt-BR': {
    title: 'Ajustes',
    preferences: 'PREFERÊNCIAS',
    supportInfo: 'SUPORTE E INFO',
    notifications: 'Notificações',
    darkMode: 'Modo Escuro',
    language: 'Idioma',
    about: 'Sobre',
    privacy: 'Privacidade',
    help: 'Ajuda',
    logout: 'Encerrar Sessão',
    version: 'Versão 1.2.4 (Build 102)',
    selectLanguage: 'Selecionar idioma',
    selectLanguageHint: 'Escolha o idioma da interface.',
    aboutTitle: 'Sobre o Avalliar',
    aboutBody: 'O Avalliar é a plataforma de gestão de laudos e demandas de vistoria. Ele organiza a equipe técnica, controla prazos e acompanha cada imóvel em campo — com apoio de inteligência artificial nas análises e estimativas.',
    versionRow: 'Versão 1.2.4 (Build 102)',
    stackRow: 'Spring Boot · FastAPI ML · Azure',
    copyright: '© 2026 Avalliar. Todos os direitos reservados.',
    privacyTitle: 'Privacidade',
    privacyIntro: 'Como tratamos os seus dados na plataforma Avalliar.',
    privacyBlocks: [
      { title: 'Dados da sua conta', body: 'Nome, e-mail e senha são usados apenas para login e para personalizar o seu painel. A senha fica armazenada com criptografia no servidor.' },
      { title: 'Laudos e imóveis', body: 'Documentos, fotos e respostas das vistorias ficam restritos à sua empresa e alimentam os modelos de IA que geram sugestões de preenchimento.' },
      { title: 'Armazenamento local', body: 'Preferências como tema e idioma ficam salvas apenas no seu dispositivo.' },
      { title: 'Compartilhamento', body: 'Não vendemos dados a terceiros. O acesso é limitado aos provedores essenciais de operação, como a hospedagem em nuvem (Azure).' },
      { title: 'Seus direitos', body: 'Você pode pedir acesso, correção ou exclusão dos seus dados escrevendo para privacidade@avalliar.com.br.' },
    ],
    helpTitle: 'Ajuda',
    helpIntro: 'Dúvidas rápidas sobre o uso da plataforma.',
    helpBlocks: [
      { title: 'Como criar uma demanda?', body: 'Na tela inicial toque em “Nova Demanda”, informe o imóvel e os itens de vistoria e envie. Ela aparece no Painel com o status EM CAMPO.' },
      { title: 'Como preencher a planilha?', body: 'Abra a demanda e use o preenchimento assistido: a IA sugere respostas a partir dos laudos anteriores e você confere campo a campo.' },
      { title: 'O que o Painel mostra?', body: 'Indicadores por período — demandas abertas, concluídas, tempo médio e desempenho por vistoriador — com filtros por tipo de gráfico.' },
      { title: 'Algo não está funcionando?', body: 'Verifique sua conexão e tente novamente. Se o problema persistir, escreva para suporte@avalliar.com.br.' },
    ],
  },
  'en-US': {
    title: 'Settings',
    preferences: 'PREFERENCES',
    supportInfo: 'SUPPORT & INFO',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    language: 'Language',
    about: 'About',
    privacy: 'Privacy',
    help: 'Help',
    logout: 'Log Out',
    version: 'Version 1.2.4 (Build 102)',
    selectLanguage: 'Select language',
    selectLanguageHint: 'Choose the interface language.',
    aboutTitle: 'About Avalliar',
    aboutBody: 'Avalliar is the inspection report and demand management platform. It organizes the technical team, tracks deadlines, and follows every property in the field — with AI support across analyses and estimates.',
    versionRow: 'Version 1.2.4 (Build 102)',
    stackRow: 'Spring Boot · FastAPI ML · Azure',
    copyright: '© 2026 Avalliar. All rights reserved.',
    privacyTitle: 'Privacy',
    privacyIntro: 'How we handle your data on the Avalliar platform.',
    privacyBlocks: [
      { title: 'Your account data', body: 'Name, email and password are used only for login and to personalize your dashboard. Your password is stored encrypted on the server.' },
      { title: 'Reports & properties', body: 'Documents, photos and inspection answers stay restricted to your company and feed the AI models that suggest form completions.' },
      { title: 'Local storage', body: 'Preferences like theme and language are stored only on your device.' },
      { title: 'Sharing', body: 'We do not sell your data to third parties. Access is limited to essential operating providers, such as cloud hosting (Azure).' },
      { title: 'Your rights', body: 'You can request access, correction or deletion of your data by emailing privacidade@avalliar.com.br.' },
    ],
    helpTitle: 'Help',
    helpIntro: 'Quick answers on how to use the platform.',
    helpBlocks: [
      { title: 'How do I create a demand?', body: 'On the home screen tap “New Demand”, fill in the property and the inspection items, then send it. It shows up on the Dashboard with an IN THE FIELD status.' },
      { title: 'How do I fill out the spreadsheet?', body: 'Open the demand and use assisted completion: the AI suggests answers based on previous reports and you review field by field.' },
      { title: 'What does the Dashboard show?', body: 'Metrics by period — open demands, completed ones, average time and performance per inspector — with chart type filters.' },
      { title: 'Something is not working?', body: 'Check your connection and try again. If it persists, email suporte@avalliar.com.br.' },
    ],
  },
  'es-ES': {
    title: 'Ajustes',
    preferences: 'PREFERENCIAS',
    supportInfo: 'SOPORTE E INFORMACIÓN',
    notifications: 'Notificaciones',
    darkMode: 'Modo Oscuro',
    language: 'Idioma',
    about: 'Acerca de',
    privacy: 'Privacidad',
    help: 'Ayuda',
    logout: 'Cerrar Sesión',
    version: 'Versión 1.2.4 (Build 102)',
    selectLanguage: 'Seleccionar idioma',
    selectLanguageHint: 'Elige el idioma de la interfaz.',
    aboutTitle: 'Sobre Avalliar',
    aboutBody: 'Avalliar es la plataforma de gestión de informes e inspecciones de inmuebles. Organiza al equipo técnico, controla plazos y sigue cada propiedad en campo — con apoyo de inteligencia artificial en los análisis y estimaciones.',
    versionRow: 'Versión 1.2.4 (Build 102)',
    stackRow: 'Spring Boot · FastAPI ML · Azure',
    copyright: '© 2026 Avalliar. Todos los derechos reservados.',
    privacyTitle: 'Privacidad',
    privacyIntro: 'Cómo tratamos tus datos en la plataforma Avalliar.',
    privacyBlocks: [
      { title: 'Datos de tu cuenta', body: 'Nombre, correo y contraseña se usan solo para iniciar sesión y personalizar tu panel. La contraseña queda almacenada con cifrado en el servidor.' },
      { title: 'Informes y propiedades', body: 'Documentos, fotos y respuestas de las inspecciones quedan restringidos a tu empresa y alimentan los modelos de IA que generan sugerencias de llenado.' },
      { title: 'Almacenamiento local', body: 'Preferencias como tema e idioma se guardan solo en tu dispositivo.' },
      { title: 'Compartición', body: 'No vendemos datos a terceros. El acceso está limitado a proveedores esenciales de operación, como el hospedaje en la nube (Azure).' },
      { title: 'Tus derechos', body: 'Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a privacidade@avalliar.com.br.' },
    ],
    helpTitle: 'Ayuda',
    helpIntro: 'Dudas rápidas sobre el uso de la plataforma.',
    helpBlocks: [
      { title: '¿Cómo crear una demanda?', body: 'En la pantalla inicial toca “Nueva Demanda”, informa la propiedad y los ítems de inspección y envía. Aparece en el Panel con el estado EN CAMPO.' },
      { title: '¿Cómo completar la planilla?', body: 'Abre la demanda y usa el llenado asistido: la IA sugiere respuestas a partir de informes anteriores y tú revisas campo por campo.' },
      { title: '¿Qué muestra el Panel?', body: 'Indicadores por período — demandas abiertas, concluidas, tiempo promedio y desempeño por inspector — con filtros por tipo de gráfico.' },
      { title: '¿Algo no funciona?', body: 'Verifica tu conexión e inténtalo de nuevo. Si el problema persiste, escribe a soporte@avalliar.com.br.' },
    ],
  },
  'fr-FR': {
    title: 'Paramètres',
    preferences: 'PRÉFÉRENCES',
    supportInfo: 'ASSISTANCE ET INFOS',
    notifications: 'Notifications',
    darkMode: 'Mode Sombre',
    language: 'Langue',
    about: 'À propos',
    privacy: 'Confidentialité',
    help: 'Aide',
    logout: 'Se Déconnecter',
    version: 'Version 1.2.4 (Build 102)',
    selectLanguage: 'Choisir la langue',
    selectLanguageHint: 'Choisissez la langue de l’interface.',
    aboutTitle: 'À propos d’Avalliar',
    aboutBody: 'Avalliar est la plateforme de gestion des rapports et demandes d’inspection. Elle organise l’équipe technique, contrôle les délais et suit chaque bien sur le terrain — avec l’aide de l’intelligence artificielle pour les analyses et estimations.',
    versionRow: 'Version 1.2.4 (Build 102)',
    stackRow: 'Spring Boot · FastAPI ML · Azure',
    copyright: '© 2026 Avalliar. Tous droits réservés.',
    privacyTitle: 'Confidentialité',
    privacyIntro: 'Comment nous traitons vos données sur la plateforme Avalliar.',
    privacyBlocks: [
      { title: 'Vos données de compte', body: 'Nom, e-mail et mot de passe servent uniquement à la connexion et à personnaliser votre tableau de bord. Le mot de passe est stocké chiffré sur le serveur.' },
      { title: 'Rapports et biens', body: 'Documents, photos et réponses des inspections restent réservés à votre entreprise et alimentent les modèles d’IA qui suggèrent les remplissages.' },
      { title: 'Stockage local', body: 'Les préférences comme le thème et la langue sont enregistrées uniquement sur votre appareil.' },
      { title: 'Partage', body: 'Nous ne vendons pas vos données à des tiers. L’accès est limité aux prestataires essentiels, comme l’hébergement cloud (Azure).' },
      { title: 'Vos droits', body: 'Vous pouvez demander l’accès, la correction ou la suppression de vos données en écrivant à privacidade@avalliar.com.br.' },
    ],
    helpTitle: 'Aide',
    helpIntro: 'Réponses rapides sur l’utilisation de la plateforme.',
    helpBlocks: [
      { title: 'Comment créer une demande ?', body: 'Sur l’écran d’accueil, touchez « Nouvelle Demande », indiquez le bien et les points d’inspection, puis envoyez. Elle apparaît dans le Tableau de bord avec le statut SUR LE TERRAIN.' },
      { title: 'Comment remplir le tableur ?', body: 'Ouvrez la demande et utilisez la saisie assistée : l’IA propose des réponses à partir des rapports précédents et vous vérifiez champ par champ.' },
      { title: 'Que montre le Tableau de bord ?', body: 'Indicateurs par période — demandes ouvertes, terminées, délai moyen et performance par inspecteur — avec filtres par type de graphique.' },
      { title: 'Un problème persiste ?', body: 'Vérifiez votre connexion et réessayez. Si le problème persiste, écrivez à suporte@avalliar.com.br.' },
    ],
  },
  'de-DE': {
    title: 'Einstellungen',
    preferences: 'EINSTELLUNGEN',
    supportInfo: 'SUPPORT UND INFO',
    notifications: 'Benachrichtigungen',
    darkMode: 'Dunkelmodus',
    language: 'Sprache',
    about: 'Über die App',
    privacy: 'Datenschutz',
    help: 'Hilfe',
    logout: 'Abmelden',
    version: 'Version 1.2.4 (Build 102)',
    selectLanguage: 'Sprache auswählen',
    selectLanguageHint: 'Wählen Sie die Sprache der Oberfläche.',
    aboutTitle: 'Über Avalliar',
    aboutBody: 'Avalliar ist die Plattform für die Verwaltung von Inspektionsberichten und Aufträgen. Sie organisiert das technische Team, überwacht Fristen und verfolgt jede Immobilie vor Ort — mit KI-Unterstützung bei Analysen und Wertschätzungen.',
    versionRow: 'Version 1.2.4 (Build 102)',
    stackRow: 'Spring Boot · FastAPI ML · Azure',
    copyright: '© 2026 Avalliar. Alle Rechte vorbehalten.',
    privacyTitle: 'Datenschutz',
    privacyIntro: 'So behandeln wir Ihre Daten auf der Avalliar-Plattform.',
    privacyBlocks: [
      { title: 'Ihre Kontodaten', body: 'Name, E-Mail und Passwort werden nur für die Anmeldung und zur Personalisierung Ihres Dashboards verwendet. Das Passwort wird verschlüsselt auf dem Server gespeichert.' },
      { title: 'Berichte & Immobilien', body: 'Dokumente, Fotos und Inspektionsantworten bleiben Ihrem Unternehmen vorbehalten und verbessern die KI-Modelle, die Formularvorschläge erstellen.' },
      { title: 'Lokaler Speicher', body: 'Einstellungen wie Design und Sprache werden nur auf Ihrem Gerät gespeichert.' },
      { title: 'Datenweitergabe', body: 'Wir verkaufen Ihre Daten nicht an Dritte. Der Zugriff ist auf wesentliche Dienstleister beschränkt, wie z. B. den Cloud-Hosting-Anbieter (Azure).' },
      { title: 'Ihre Rechte', body: 'Sie können Zugang, Berichtigung oder Löschung Ihrer Daten anfordern: privacidade@avalliar.com.br.' },
    ],
    helpTitle: 'Hilfe',
    helpIntro: 'Schnelle Antworten zur Nutzung der Plattform.',
    helpBlocks: [
      { title: 'Wie erstelle ich einen Auftrag?', body: 'Tippen Sie auf dem Startbildschirm auf „Neuer Auftrag“, geben Sie Immobilie und Prüfpunkte ein und senden Sie ab. Er erscheint im Dashboard mit dem Status VOR ORT.' },
      { title: 'Wie fülle ich das Formular aus?', body: 'Öffnen Sie den Auftrag und nutzen Sie die assistierte Erfassung: Die KI schlägt Antworten aus früheren Berichten vor und Sie prüfen jedes Feld.' },
      { title: 'Was zeigt das Dashboard?', body: 'Kennzahlen nach Zeitraum — offene und abgeschlossene Aufträge, Durchschnittszeit und Leistung pro Gutachter — mit Filtern nach Diagrammtyp.' },
      { title: 'Irgendetwas funktioniert nicht?', body: 'Prüfen Sie Ihre Verbindung und versuchen Sie es erneut. Bei weiterem Problem schreiben Sie an suporte@avalliar.com.br.' },
    ],
  },
};

const SettingsScreen = ({ onBack, currentUser, onLogout, onEditProfile }: SettingsScreenProps) => {
  const { isDarkMode, toggleDarkMode, colors: themeColors } = useTheme();
  const { locale, setLocale } = useLanguage();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);
  const [activeModal, setActiveModal] = React.useState<InfoModal | null>(null);
  const [mensagemLog, setMensagemLog] = React.useState<string | null>(null);

  const s = STRINGS[locale];

  const handleGoBack = () => {
    onBack();
  };

  const handleEditProfile = () => {
    if (onEditProfile) {
      onEditProfile();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const selectLanguage = (next: Locale) => {
    setLocale(next);
    setActiveModal(null);
  };

  const userName = currentUser?.nome || 'Usuário Avalliar';
  const userEmail = currentUser?.email || 'usuario@avalliar.com.br';

  const NEUTRAL_ICON_COLOR = themeColors.iconColor || '#64748B';
  const languageLabel = LOCALE_LABELS[locale];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBackground }]}>
        <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { backgroundColor: themeColors.backButtonBackground }]}>
          <Ionicons name="chevron-back" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{s.title}</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Perfil Card */}
        <TouchableOpacity 
          style={[
            styles.profileSection, 
            { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder }
          ]} 
          onPress={handleEditProfile} 
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
             <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={[styles.profileName, { color: themeColors.text }]}>{userName}</Text>
            <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>{userEmail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {/* Preferências */}
        <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{s.preferences}</Text>
        <View style={[styles.cardSection, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.settingItem, styles.firstSettingItem, { borderBottomColor: themeColors.cardBorder }]}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="notifications-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{s.notifications}</Text>
            </View>
            <Switch
              trackColor={{ false: isDarkMode ? '#475569' : '#E2E8F0', true: themeColors.primary }}
              thumbColor="#FFFFFF"
              onValueChange={() => setIsNotificationsEnabled((prev) => !prev)}
              value={isNotificationsEnabled}
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: themeColors.cardBorder }]}>
            <View style={styles.settingItemLeft}>
              <Ionicons name={isDarkMode ? "moon" : "moon-outline"} size={22} color={isDarkMode ? themeColors.primary : NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{s.darkMode}</Text>
            </View>
            <Switch
              trackColor={{ false: isDarkMode ? '#475569' : '#E2E8F0', true: themeColors.primary }}
              thumbColor="#FFFFFF"
              onValueChange={toggleDarkMode}
              value={isDarkMode}
            />
          </View>

          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={() => setActiveModal('idioma')}
            activeOpacity={0.5}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="globe-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{s.language}</Text>
            </View>
            <Text style={[styles.settingValue, { color: themeColors.textMuted }]}>{languageLabel}</Text>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Suporte */}
        <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{s.supportInfo}</Text>
        <View style={[styles.cardSection, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.settingItem, styles.firstSettingItem, { borderBottomColor: themeColors.cardBorder }]}
            onPress={() => setActiveModal('sobre')}
            activeOpacity={0.5}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{s.about}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: themeColors.cardBorder }]}
            onPress={() => setActiveModal('privacidade')}
            activeOpacity={0.5}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{s.privacy}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={() => setActiveModal('ajuda')}
            activeOpacity={0.5}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="help-buoy-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{s.help}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Diagnóstico: exporta o log do aparelho (tempos de geração de planilha, estado do app) */}
        <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>Diagnóstico</Text>
        <View style={[styles.cardSection, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.settingItem, styles.firstSettingItem, { borderBottomColor: themeColors.cardBorder }]}
            onPress={async () => setMensagemLog(await exportarLog().catch((e) => `Falha ao exportar: ${e?.message ?? e}`))}
            activeOpacity={0.5}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>Exportar log de diagnóstico</Text>
            </View>
            <Ionicons name="share-outline" size={18} color={themeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.lastSettingItem]}
            onPress={async () => {
              await limparLog();
              setMensagemLog('Log apagado.');
            }}
            activeOpacity={0.5}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="trash-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>Limpar log</Text>
            </View>
          </TouchableOpacity>
        </View>
        {mensagemLog && (
          <Text style={[styles.versionText, { color: themeColors.textMuted }]}>{mensagemLog}</Text>
        )}

        {onLogout && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>{s.logout}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.versionText, { color: themeColors.textMuted }]}>{s.version}</Text>
      </ScrollView>

      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalCard,
              { backgroundColor: themeColors.modalBackground, borderColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={[styles.modalCloseBtn, { backgroundColor: themeColors.chipBackground }]}
              >
                <Ionicons name="close" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {activeModal === 'idioma' && s.selectLanguage}
                {activeModal === 'sobre' && s.aboutTitle}
                {activeModal === 'privacidade' && s.privacyTitle}
                {activeModal === 'ajuda' && s.helpTitle}
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            {activeModal === 'idioma' && (
              <View>
                <Text style={[styles.modalHint, { color: themeColors.textMuted }]}>
                  {s.selectLanguageHint}
                </Text>
                {LOCALES.map((option) => {
                  const selected = locale === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => selectLanguage(option)}
                      style={[
                        styles.langOption,
                        {
                          backgroundColor: themeColors.chipBackground,
                          borderColor: selected ? themeColors.brandRed : themeColors.cardBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="globe-outline"
                        size={18}
                        color={selected ? themeColors.brandRed : NEUTRAL_ICON_COLOR}
                      />
                      <Text style={[styles.langOptionText, { color: themeColors.text }]}>
                        {LOCALE_LABELS[option]}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={20} color={themeColors.brandRed} />
                      ) : (
                        <View style={styles.checkSpacer} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {activeModal === 'sobre' && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.aboutLogo}>
                  <Text style={styles.aboutLogoText}>A</Text>
                </View>
                <Text style={[styles.aboutName, { color: themeColors.text }]}>Avalliar</Text>
                <Text style={[styles.aboutVersionRow, { color: themeColors.textMuted }]}>
                  {s.versionRow}
                </Text>
                <Text style={[styles.modalBodyText, { color: themeColors.chipText }]}>
                  {s.aboutBody}
                </Text>
                <View style={[styles.infoDivider, { backgroundColor: themeColors.cardBorder }]} />
                <Text style={[styles.modalBodyText, { color: themeColors.textMuted, marginTop: 0 }]}>
                  {s.stackRow}
                </Text>
                <Text style={[styles.modalBodyText, { color: themeColors.textMuted }]}>
                  {s.copyright}
                </Text>
              </ScrollView>
            )}

            {(activeModal === 'privacidade' || activeModal === 'ajuda') && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.modalHint, { color: themeColors.textMuted }]}>
                  {activeModal === 'privacidade' ? s.privacyIntro : s.helpIntro}
                </Text>
                {(activeModal === 'privacidade' ? s.privacyBlocks : s.helpBlocks).map((block, i) => (
                  <View key={`${activeModal}-${i}`} style={styles.infoBlock}>
                    <Text style={[styles.infoBlockTitle, { color: themeColors.text }]}>
                      {block.title}
                    </Text>
                    <Text style={[styles.modalBodyText, { color: themeColors.chipText }]}>
                      {block.body}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const EXTRA_ROUND = 22;

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: EXTRA_ROUND,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E84141',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  cardSection: {
    borderRadius: EXTRA_ROUND,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  firstSettingItem: {
    borderTopLeftRadius: EXTRA_ROUND,
    borderTopRightRadius: EXTRA_ROUND,
  },
  lastSettingItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: EXTRA_ROUND,
    borderBottomRightRadius: EXTRA_ROUND,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E84141',
    borderRadius: 30,
    marginHorizontal: spacing.md,
    marginTop: spacing.xxl,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#E84141',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  versionText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: spacing.xl,
  },
  settingValue: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 28,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  modalHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 10,
  },
  langOptionText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  checkSpacer: {
    width: 20,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalScrollContent: {
    paddingBottom: 6,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C61010',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 4,
  },
  aboutLogoText: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: '#FFFFFF',
  },
  aboutName: {
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  aboutVersionRow: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  modalBodyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  infoDivider: {
    height: 1,
    marginVertical: 12,
  },
  infoBlock: {
    marginBottom: 18,
  },
  infoBlockTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginBottom: 4,
  },
});

export default SettingsScreen;
